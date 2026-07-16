import { describe, expect, it } from "vitest";
import type { ParsedSale } from "../packages/shared/types";
import { normalizeSaleItemFields } from "../packages/shared/utils/date-range";
import { enforceTranscriptEvidence } from "../packages/shared/utils/sale-parser";

function parseExample(rawText: string, productName: string) {
  const llmResult: ParsedSale = {
    items: [
      {
        product_name: productName,
        quantity: 999,
        unit: "шт",
        price: 999,
        total: 1,
        confidence: 0.95
      }
    ],
    raw_text: "LLM must not override the STT source",
    cleaned_text: rawText,
    needs_review: false
  };

  const parsed = enforceTranscriptEvidence(llmResult, rawText, rawText);
  return normalizeSaleItemFields(parsed.items[0]!);
}

describe("sale parser evidence rules", () => {
  function parseGluedTranscript(rawText: string) {
    return enforceTranscriptEvidence(
      {
        items: [{
          product_name: rawText,
          quantity: 1,
          unit: "шт",
          price: null,
          total: null,
          confidence: 0.95
        }],
        raw_text: "",
        cleaned_text: "",
        needs_review: true
      },
      rawText,
      rawText
    );
  }

  it("splits Snickers and bread from one glued parser item", () => {
    const parsed = parseGluedTranscript(
      "Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей."
    );
    const normalized = parsed.items.map((item) => normalizeSaleItemFields(item));

    expect(parsed.items).toHaveLength(2);
    expect(normalized).toMatchObject([
      {
        product_name: "Сникерс",
        quantity: 3,
        unit: "шт",
        price: 200,
        total: 600,
        status: "processed"
      },
      {
        product_name: "Буханка хлеба",
        quantity: 5,
        unit: "шт",
        price: 50,
        total: 250,
        status: "processed"
      }
    ]);
    expect(normalized.reduce((sum, item) => sum + (item.total ?? 0), 0)).toBe(850);
    expect(parsed.needs_review).toBe(false);
  });

  it("smoke B: splits the exact two-item transcript instead of saving it as one product", () => {
    const parsed = parseGluedTranscript(
      "Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей."
    );
    const normalized = parsed.items.map((item) => normalizeSaleItemFields(item));

    expect(normalized).toMatchObject([
      {
        product_name: "Буханка хлеба",
        quantity: 5,
        price: 100,
        total: 500,
        status: "processed"
      },
      {
        product_name: "Сникерс",
        quantity: 3,
        price: 200,
        total: 600,
        status: "processed"
      }
    ]);
    expect(normalized).toHaveLength(2);
    expect(normalized.reduce((sum, item) => sum + (item.total ?? 0), 0)).toBe(1100);
    expect(parsed.needs_review).toBe(false);
  });

  it("keeps valid and incomplete products as separate items", () => {
    const parsed = parseGluedTranscript("Сникерс 3 штуки по 200 рублей. Корзина продуктов.");
    const normalized = parsed.items.map((item) => normalizeSaleItemFields(item));

    expect(parsed.items).toHaveLength(2);
    expect(normalized).toMatchObject([
      {
        product_name: "Сникерс",
        quantity: 3,
        price: 200,
        total: 600,
        status: "processed"
      },
      {
        product_name: "Корзина продуктов",
        price: null,
        total: null,
        status: "needs_review"
      }
    ]);
    expect(normalized.filter((item) => item.status === "processed")).toHaveLength(1);
  });

  it("keeps a text-only basket incomplete with zero valid items", () => {
    const parsed = parseGluedTranscript("Корзина продуктов.");
    const normalized = parsed.items.map((item) => normalizeSaleItemFields(item));

    expect(parsed.items).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      product_name: "Корзина продуктов",
      price: null,
      total: null,
      status: "needs_review"
    });
    expect(normalized.filter((item) => item.status === "processed")).toHaveLength(0);
  });

  it("smoke D: marks a position for review only when its price is actually missing", () => {
    const parsed = parseGluedTranscript("Буханка хлеба пять штук.");
    const normalized = parsed.items.map((item) => normalizeSaleItemFields(item));

    expect(normalized).toEqual([
      expect.objectContaining({
        product_name: "Буханка хлеба",
        quantity: 5,
        price: null,
        total: null,
        status: "needs_review"
      })
    ]);
    expect(parsed.needs_review).toBe(true);
  });

  it("parses a bare quantity before 'по' as pieces", () => {
    expect(parseExample("Сникерс 5 по 100", "Сникерс 5 по 100")).toMatchObject({
      product_name: "Сникерс",
      quantity: 5,
      unit: "шт",
      price: 100,
      total: 500,
      status: "processed"
    });
  });

  it("normalizes bottles as piece units", () => {
    expect(parseExample("Кола 2 бутылки по 150 рублей", "Кола")).toMatchObject({
      product_name: "Кола",
      quantity: 2,
      unit: "шт",
      price: 150,
      total: 300,
      status: "processed"
    });
  });

  it("parses cream quantity written as a word and an explicit unit price", () => {
    expect(parseExample("Сливки 33%, пять штук по 100 рублей", "Сливки 33%")).toMatchObject({
      product_name: "Сливки 33%",
      quantity: 5,
      unit: "шт",
      price: 100,
      total: 500,
      status: "processed"
    });
  });

  it("does not invent a price when only quantity is present", () => {
    expect(parseExample("Шоколад Шаковик 5 штук", "Шоколад Шаковик")).toMatchObject({
      product_name: "Шоколад Шаковик",
      quantity: 5,
      unit: "шт",
      price: null,
      total: null,
      status: "needs_review"
    });
  });

  it("parses chocolate quantity and explicit unit price", () => {
    expect(parseExample("Шоколад Шаковик 5 штук по 250 рублей", "Шоколад Шаковик")).toMatchObject({
      product_name: "Шоколад Шаковик",
      quantity: 5,
      unit: "шт",
      price: 250,
      total: 1250,
      status: "processed"
    });
  });

  it("parses Pringles quantity and price into a processed sale item", () => {
    expect(parseExample("Чипсы Принглс 20 штук по 300 рублей", "Чипсы Принглс")).toMatchObject({
      product_name: "Чипсы Принглс",
      quantity: 20,
      price: 300,
      total: 6000,
      status: "processed"
    });
  });

  it("normalizes kilograms and recalculates total", () => {
    expect(parseExample("Шоколад 2 килограмма по 2000 рублей", "Шоколад")).toMatchObject({
      product_name: "Шоколад",
      quantity: 2,
      unit: "кг",
      price: 2000,
      total: 4000,
      status: "processed"
    });
  });

  it("normalizes grams and calculates total from kilogram unit price", () => {
    expect(parseExample("Сыр 300 грамм по 200 рублей", "Сыр")).toMatchObject({
      product_name: "Сыр",
      quantity: 300,
      unit: "г",
      price: 200,
      total: 60,
      status: "processed"
    });
  });

  it("parses bread with an explicit quantity and price", () => {
    expect(parseExample("Хлеб 4 штуки по 40 рублей", "Хлеб")).toMatchObject({
      product_name: "Хлеб",
      quantity: 4,
      unit: "шт",
      price: 40,
      total: 160,
      status: "processed"
    });
  });

  it("parses Niki quantity and price written as words", () => {
    expect(parseExample("Ники четыре штуки по сто рублей", "Ники")).toMatchObject({
      product_name: "Ники",
      quantity: 4,
      unit: "шт",
      price: 100,
      total: 400,
      status: "processed"
    });
  });

  it("parses Snickers quantity and price written as digits", () => {
    expect(parseExample("Сникерс 5 штук по 100 рублей", "Сникерс")).toMatchObject({
      product_name: "Сникерс",
      quantity: 5,
      unit: "шт",
      price: 100,
      total: 500,
      status: "processed"
    });
  });

  it("uses matching cleaned Russian evidence when STT returns non-Cyrillic transliteration", () => {
    const parsed = enforceTranscriptEvidence(
      {
        items: [{
          product_name: "Ники",
          quantity: 4,
          unit: "шт",
          price: 100,
          total: 400,
          confidence: 0.95
        }],
        raw_text: "",
        cleaned_text: "",
        needs_review: false
      },
      "Nikies četiri štuki po sto rubliai.",
      "Ники, четыре штуки по сто рублей."
    );

    expect(normalizeSaleItemFields(parsed.items[0]!)).toMatchObject({
      product_name: "Ники",
      quantity: 4,
      price: 100,
      total: 400,
      status: "processed"
    });
    expect(parsed.needs_review).toBe(false);
  });

  it("does not keep a complete confident item in review only because of the parser-level flag", () => {
    const parsed = enforceTranscriptEvidence(
      {
        items: [{
          product_name: "Сникерс",
          quantity: 5,
          unit: "шт",
          price: 100,
          total: 500,
          confidence: 1
        }],
        raw_text: "",
        cleaned_text: "",
        needs_review: true
      },
      "Сникерс 5 штук по 100 рублей",
      "Сникерс, 5 штук по 100 рублей."
    );

    expect(parsed.needs_review).toBe(false);
  });

  it("accepts a price after 'по' without a ruble suffix", () => {
    expect(parseExample("Хлеб 4 штуки по 40", "Хлеб")).toMatchObject({
      quantity: 4,
      price: 40,
      total: 160,
      status: "processed"
    });
  });

  it("rejects unmarked numbers instead of trusting LLM guesses", () => {
    expect(parseExample("Сливки 33% пять", "Сливки 33%")).toMatchObject({
      quantity: 1,
      quantityWasMissing: true,
      price: null,
      total: null,
      status: "needs_review"
    });
  });

  it("keeps every LLM item and binds numbers to its source segment", () => {
    const parsed = enforceTranscriptEvidence(
      {
        items: [
          { product_name: "Хлеб", quantity: 2, unit: "шт", price: 10, total: 20, confidence: 0.95 },
          { product_name: "Молоко", quantity: 1, unit: "шт", price: 20, total: 20, confidence: 0.95 }
        ],
        raw_text: "",
        cleaned_text: "",
        needs_review: false
      },
      "Хлеб 4 штуки по 40 рублей, молоко 2 штуки по 90 рублей",
      "Хлеб 4 штуки по 40 рублей, молоко 2 штуки по 90 рублей"
    );

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items).toMatchObject([
      { product_name: "Хлеб", quantity: 4, price: 40, total: 160 },
      { product_name: "Молоко", quantity: 2, price: 90, total: 180 }
    ]);
  });

  it("splits a single glued LLM item into separate products by transcript evidence", () => {
    const parsed = enforceTranscriptEvidence(
      {
        items: [{
          product_name: "Буханка хлеба 5 штук по 100 рублей. 3 штуки Сникерса по 200 рублей",
          quantity: 5,
          unit: "шт",
          price: 100,
          total: 500,
          confidence: 0.95
        }],
        raw_text: "",
        cleaned_text: "",
        needs_review: false
      },
      "Буханка хлеба 5 штук по 100 рублей. 3 штуки Сникерса по 200 рублей.",
      "Буханка хлеба 5 штук по 100 рублей. 3 штуки Сникерса по 200 рублей."
    );

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items).toMatchObject([
      { product_name: "Буханка хлеба", quantity: 5, price: 100, total: 500 },
      { product_name: "Сникерса", quantity: 3, price: 200, total: 600 }
    ]);
    expect(parsed.needs_review).toBe(false);
  });

  it("splits comma-separated sales from one glued LLM item", () => {
    const parsed = enforceTranscriptEvidence(
      {
        items: [{
          product_name: "Шоколад 5 штук по 100 рублей, хлеб 4 штуки по 50 рублей",
          quantity: 5,
          unit: "шт",
          price: 100,
          total: 500,
          confidence: 0.95
        }],
        raw_text: "",
        cleaned_text: "",
        needs_review: false
      },
      "Шоколад 5 штук по 100 рублей, хлеб 4 штуки по 50 рублей",
      "Шоколад 5 штук по 100 рублей, хлеб 4 штуки по 50 рублей"
    );

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items).toMatchObject([
      { product_name: "Шоколад", quantity: 5, price: 100, total: 500 },
      { product_name: "хлеб", quantity: 4, price: 50, total: 200 }
    ]);
    expect(parsed.needs_review).toBe(false);
  });

  it("marks missing quantity and low confidence for review", () => {
    const parsed = enforceTranscriptEvidence(
      {
        items: [
          { product_name: "Хлеб", quantity: 8, unit: "шт", price: 40, total: 320, confidence: 0.7 }
        ],
        raw_text: "",
        cleaned_text: "",
        needs_review: false
      },
      "Хлеб по 40 рублей",
      "Хлеб по 40 рублей"
    );

    expect(parsed.needs_review).toBe(true);
    expect(normalizeSaleItemFields(parsed.items[0]!)).toMatchObject({
      quantity: 1,
      quantityWasMissing: true,
      status: "needs_review"
    });
  });
});
