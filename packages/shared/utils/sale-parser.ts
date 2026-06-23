import type { ParsedSale, ParsedSaleItem } from "../types/index";

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
  `(${NUMBER_PATTERN})\\s*(шт\\.?|штук(?:а|и)?|кг\\.?|килограмм(?:а|ов)?)(?!\\p{L})`,
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
  return normalized?.startsWith("кг") || normalized?.startsWith("килограмм") ? "кг" : "шт";
}

function findItemStart(source: string, productName: string, cursor: number) {
  const normalizedName = productName.trim().toLocaleLowerCase("ru-RU");
  const exactIndex = normalizedName ? source.indexOf(normalizedName, cursor) : -1;

  if (exactIndex >= 0) {
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
  const productName = quantityMatch?.index === undefined
    ? ""
    : segment
      .slice(0, quantityMatch.index)
      .replace(/[\s,;:—–-]+$/u, "")
      .trim();

  return {
    productName,
    quantity: parseSpokenNumber(quantityMatch?.[1]),
    unit: normalizeEvidenceUnit(quantityMatch?.[2]),
    price: parseSpokenNumber(priceMatch?.[1] ?? priceMatch?.[2])
  };
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
    total: quantity === null || price === null ? null : Number((quantity * price).toFixed(2))
  };
}

export function enforceTranscriptEvidence(parsedSale: ParsedSale, rawText: string, cleanedText: string): ParsedSale {
  const rawSegments = getItemSegments(rawText, parsedSale.items);
  const cleanedSegments = getItemSegments(cleanedText, parsedSale.items);
  const items = parsedSale.items.map((item, index) =>
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
