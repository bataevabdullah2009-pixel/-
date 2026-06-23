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
