import type { ParsedSale, ParsedSaleItem } from "../types/index";
import { calculateItemTotal } from "./date-range";

const NUMBER_WORD_VALUES = new Map<string, number>([
  ["ноль", 0],
  ["один", 1],
  ["одна", 1],
  ["одно", 1],
  ["два", 2],
  ["две", 2],
  ["три", 3],
  ["четыре", 4],
  ["пять", 5],
  ["шесть", 6],
  ["семь", 7],
  ["восемь", 8],
  ["девять", 9],
  ["десять", 10],
  ["одиннадцать", 11],
  ["двенадцать", 12],
  ["тринадцать", 13],
  ["четырнадцать", 14],
  ["пятнадцать", 15],
  ["шестнадцать", 16],
  ["семнадцать", 17],
  ["восемнадцать", 18],
  ["девятнадцать", 19],
  ["двадцать", 20],
  ["тридцать", 30],
  ["сорок", 40],
  ["пятьдесят", 50],
  ["шестьдесят", 60],
  ["семьдесят", 70],
  ["восемьдесят", 80],
  ["девяносто", 90],
  ["сто", 100],
  ["двести", 200],
  ["триста", 300],
  ["четыреста", 400],
  ["пятьсот", 500],
  ["шестьсот", 600],
  ["семьсот", 700],
  ["восемьсот", 800],
  ["девятьсот", 900],
  ["полтора", 1.5],
  ["полторы", 1.5]
]);

const NUMBER_WORDS = [...NUMBER_WORD_VALUES.keys()].sort((left, right) => right.length - left.length).join("|");
const NUMBER_PATTERN = `(?:\\d+(?:[.,]\\d+)?|(?:${NUMBER_WORDS})(?:[ -]+(?:${NUMBER_WORDS})){0,4})`;
const QUANTITY_PATTERN = new RegExp(
  `(${NUMBER_PATTERN})\\s*(шт\\.?|штук(?:а|и)?|кг\\.?|килограмм(?:а|ов)?|г\\.?|гр\\.?|грамм(?:а|ов)?)(?!\\p{L})`,
  "iu"
);
const PRICE_PATTERN = new RegExp(
  `(?:(?<!\\p{L})по\\s+(${NUMBER_PATTERN})(?:\\s*(?:руб(?:ль|ля|лей|\\.)?|₽))?|(${NUMBER_PATTERN})\\s*(?:руб(?:ль|ля|лей|\\.)?|₽))`,
  "iu"
);

function parseSpokenNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLocaleLowerCase("ru-RU").replace(",", ".");
  const numeric = Number(normalized);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const tokens = normalized.split(/[ -]+/).filter(Boolean);
  let result = 0;

  for (const token of tokens) {
    const tokenValue = NUMBER_WORD_VALUES.get(token);

    if (tokenValue === undefined) {
      return null;
    }

    result += tokenValue;
  }

  return result > 0 ? result : null;
}

function normalizeEvidenceUnit(unit: string | undefined) {
  const normalized = unit?.toLocaleLowerCase("ru-RU").replace(".", "");
  if (normalized?.startsWith("кг") || normalized?.startsWith("килограмм")) {
    return "кг";
  }
  if (normalized === "г" || normalized === "гр" || normalized?.startsWith("грамм")) {
    return "г";
  }
  return "шт";
}

function trimEvidenceProductName(value: string) {
  return value
    .replace(/^[\s,;:—–-]+/u, "")
    .replace(/[\s,;:—–-]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findItemStart(source: string, productName: string, cursor: number) {
  const normalizedName = productName.trim().toLocaleLowerCase("ru-RU");
  const exactIndex = normalizedName ? source.indexOf(normalizedName, cursor) : -1;

  if (exactIndex >= 0) {
    const boundary = Math.max(
      source.lastIndexOf(".", exactIndex),
      source.lastIndexOf("!", exactIndex),
      source.lastIndexOf("?", exactIndex),
      source.lastIndexOf("…", exactIndex),
      source.lastIndexOf(";", exactIndex),
      source.lastIndexOf(",", exactIndex)
    ) + 1;
    const prefix = source.slice(boundary, exactIndex);

    if (QUANTITY_PATTERN.test(prefix)) {
      const leadingWhitespace = source.slice(boundary).match(/^\s*/u)?.[0].length ?? 0;
      return boundary + leadingWhitespace;
    }

    return exactIndex;
  }

  const tokens = normalizedName.match(/[\p{L}\p{N}%]+/gu) ?? [];
  const anchor = tokens.find((token) => /\p{L}/u.test(token) && token.length >= 3);
  return anchor ? source.indexOf(anchor, cursor) : -1;
}

function getItemSegments(rawText: string, items: ParsedSaleItem[]) {
  const source = rawText.toLocaleLowerCase("ru-RU");

  if (items.length === 1) {
    return [source];
  }

  const starts: number[] = [];
  let cursor = 0;

  for (const item of items) {
    const start = findItemStart(source, item.product_name, cursor);
    starts.push(start);

    if (start >= 0) {
      cursor = start + Math.max(item.product_name.length, 1);
    }
  }

  return starts.map((start, index) => {
    if (start < 0) {
      return "";
    }

    const nextStart = starts.slice(index + 1).find((candidate) => candidate >= 0) ?? source.length;
    return source.slice(start, nextStart);
  });
}

function extractEvidence(segment: string) {
  const quantityMatch = segment.match(QUANTITY_PATTERN);
  const priceMatch = segment.match(PRICE_PATTERN);
  const quantityStart = quantityMatch?.index;
  const quantityEnd = !quantityMatch || quantityStart === undefined
    ? undefined
    : quantityStart + quantityMatch[0].length;
  const priceStart = priceMatch?.index;
  const beforeQuantity = quantityStart === undefined
    ? ""
    : trimEvidenceProductName(segment.slice(0, quantityStart));
  const betweenQuantityAndPrice =
    quantityEnd === undefined || priceStart === undefined || priceStart <= quantityEnd
      ? ""
      : trimEvidenceProductName(segment.slice(quantityEnd, priceStart));
  const beforePrice = priceStart === undefined
    ? ""
    : trimEvidenceProductName(segment.slice(0, priceStart));
  const productName = beforeQuantity || betweenQuantityAndPrice || (quantityStart === undefined ? beforePrice : "");

  return {
    productName,
    quantity: parseSpokenNumber(quantityMatch?.[1]),
    unit: normalizeEvidenceUnit(quantityMatch?.[2]),
    price: parseSpokenNumber(priceMatch?.[1] ?? priceMatch?.[2])
  };
}

function segmentHasSaleEvidence(segment: string) {
  return PRICE_PATTERN.test(segment) || QUANTITY_PATTERN.test(segment);
}

function splitByConjunctions(segment: string) {
  const parts = segment
    .split(/\s+(?:и|плюс|а также)\s+/iu)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [segment];
  }

  return parts.every(segmentHasSaleEvidence) ? parts : [segment];
}

function splitPotentialSaleSegments(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/[.!?…;]+|,/u)
    .flatMap((segment) => splitByConjunctions(segment.trim()))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildEvidenceItemsFromText(text: string, confidence: number): ParsedSaleItem[] {
  return splitPotentialSaleSegments(text).flatMap((segment) => {
    const evidence = extractEvidence(segment);

    if (!evidence.productName || evidence.quantity === null || evidence.price === null) {
      return [];
    }

    return [{
      product_name: evidence.productName,
      quantity: evidence.quantity,
      unit: evidence.unit,
      price: evidence.price,
      total: calculateItemTotal(evidence.quantity, evidence.price, evidence.unit),
      confidence
    }];
  });
}

function expandSingleItemFromTranscript(
  parsedSale: ParsedSale,
  rawText: string,
  cleanedText: string
): ParsedSaleItem[] {
  if (parsedSale.items.length !== 1) {
    return parsedSale.items;
  }

  const confidence = parsedSale.items[0]?.confidence ?? 0.95;
  const rawItems = buildEvidenceItemsFromText(rawText, confidence);
  const cleanedItems = buildEvidenceItemsFromText(cleanedText, confidence);
  const evidenceItems = rawItems.length >= cleanedItems.length ? rawItems : cleanedItems;

  return evidenceItems.length > 1 ? evidenceItems : parsedSale.items;
}

function matchesParsedNumber(value: number | null, parsedValue: number | null | undefined) {
  return value !== null && typeof parsedValue === "number" && Number(parsedValue) === value;
}

function applyEvidence(item: ParsedSaleItem, rawSegment: string, cleanedSegment: string): ParsedSaleItem {
  const rawEvidence = extractEvidence(rawSegment);
  const cleanedEvidence = extractEvidence(cleanedSegment);
  const allowCleanedFallback = !/\p{Script=Cyrillic}/u.test(rawSegment);
  const quantity = rawEvidence.quantity ??
    (allowCleanedFallback && matchesParsedNumber(cleanedEvidence.quantity, item.quantity)
      ? cleanedEvidence.quantity
      : null);
  const price = rawEvidence.price ??
    (allowCleanedFallback && matchesParsedNumber(cleanedEvidence.price, item.price)
      ? cleanedEvidence.price
      : null);
  const unit = rawEvidence.quantity !== null
    ? rawEvidence.unit
    : quantity !== null
      ? cleanedEvidence.unit
      : null;
  const productName = allowCleanedFallback && cleanedEvidence.productName
    ? cleanedEvidence.productName
    : item.product_name;

  return {
    ...item,
    product_name: productName,
    quantity,
    unit,
    price,
    total: quantity === null || price === null ? null : calculateItemTotal(quantity, price, unit)
  };
}

export function enforceTranscriptEvidence(parsedSale: ParsedSale, rawText: string, cleanedText: string): ParsedSale {
  const sourceItems = expandSingleItemFromTranscript(parsedSale, rawText, cleanedText);
  const rawSegments = getItemSegments(rawText, sourceItems);
  const cleanedSegments = getItemSegments(cleanedText, sourceItems);
  const items = sourceItems.map((item, index) =>
    applyEvidence(item, rawSegments[index] ?? "", cleanedSegments[index] ?? "")
  );
  const needsReview =
    items.length === 0 ||
    items.some((item) =>
      !item.product_name.trim() ||
      item.quantity === null ||
      item.price === null ||
      item.confidence < 0.8
    );

  return {
    items,
    raw_text: rawText,
    cleaned_text: cleanedText,
    needs_review: needsReview
  };
}
