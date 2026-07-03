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
const UNIT_PATTERN = [
  "бутылк(?:а|и|у|ок)?",
  "шт\\.?",
  "штук(?:а|и)?",
  "кг\\.?",
  "килограмм(?:а|ов)?",
  "гр?\\.?",
  "грамм(?:а|ов)?"
].join("|");
const QUANTITY_PATTERN = new RegExp(
  `(${NUMBER_PATTERN})\\s*(${UNIT_PATTERN})(?!\\p{L})`,
  "iu"
);
const BARE_QUANTITY_BEFORE_PRICE_PATTERN = new RegExp(
  `(${NUMBER_PATTERN})\\s+(?=по\\s+${NUMBER_PATTERN}(?:\\s*(?:руб(?:ль|ля|лей|\\.)?|₽))?)`,
  "iu"
);
const QUANTITY_PRICE_PATTERN = new RegExp(
  `(${NUMBER_PATTERN})\\s*(?:(?:(${UNIT_PATTERN})(?!\\p{L})\\s*(?:по\\s+)?(${NUMBER_PATTERN})(?:\\s*(?:руб(?:ль|ля|лей|\\.)?|₽))?)|(?:по\\s+(${NUMBER_PATTERN})(?:\\s*(?:руб(?:ль|ля|лей|\\.)?|₽))?))`,
  "giu"
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
  if (normalized?.startsWith("бутыл")) {
    return "шт";
  }
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
    .replace(/^(?:и|плюс|а также)\s+/iu, "")
    .replace(/[\s,;:—–-]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findQuantityEvidence(segment: string) {
  const quantityMatch = segment.match(QUANTITY_PATTERN);

  if (quantityMatch) {
    return {
      match: quantityMatch[0],
      index: quantityMatch.index,
      quantity: parseSpokenNumber(quantityMatch[1]),
      unit: normalizeEvidenceUnit(quantityMatch[2])
    };
  }

  const bareQuantityMatch = segment.match(BARE_QUANTITY_BEFORE_PRICE_PATTERN);

  if (!bareQuantityMatch) {
    return null;
  }

  return {
    match: bareQuantityMatch[0],
    index: bareQuantityMatch.index,
    quantity: parseSpokenNumber(bareQuantityMatch[1]),
    unit: "шт"
  };
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
  const quantityEvidence = findQuantityEvidence(segment);
  const priceMatch = segment.match(PRICE_PATTERN);
  const quantityStart = quantityEvidence?.index;
  const quantityEnd = !quantityEvidence || quantityStart === undefined
    ? undefined
    : quantityStart + quantityEvidence.match.length;
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
    quantity: quantityEvidence?.quantity ?? null,
    unit: quantityEvidence?.unit ?? "шт",
    price: parseSpokenNumber(priceMatch?.[1] ?? priceMatch?.[2])
  };
}

function segmentHasSaleEvidence(segment: string) {
  return PRICE_PATTERN.test(segment) || QUANTITY_PATTERN.test(segment);
}

function splitPotentialSaleSegments(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/[.!?…;\n]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function splitIncompleteSegments(segment: string) {
  return segment
    .split(/,|\s+(?:и|плюс|а также)\s+/iu)
    .map((part) => trimEvidenceProductName(part))
    .filter(Boolean);
}

function hasProductLetters(value: string) {
  const letters = value.match(/\p{L}/gu) ?? [];
  return letters.length >= 2;
}

function buildItemFromSegment(segment: string, confidence: number): ParsedSaleItem | null {
  const evidence = extractEvidence(segment);
  const productName = evidence.productName || trimEvidenceProductName(segment);

  if (!productName || !hasProductLetters(productName)) {
    return null;
  }

  const complete = evidence.quantity !== null && evidence.price !== null;
  const total = evidence.quantity !== null && evidence.price !== null
    ? calculateItemTotal(evidence.quantity, evidence.price, evidence.unit)
    : null;

  return {
    product_name: productName,
    quantity: evidence.quantity,
    unit: evidence.unit,
    price: evidence.price,
    total,
    confidence: complete ? confidence : Math.min(confidence, 0.6)
  };
}

function buildEvidenceItemsFromText(text: string, confidence: number): ParsedSaleItem[] {
  return splitPotentialSaleSegments(text).flatMap((segment) => {
    const items: ParsedSaleItem[] = [];
    let cursor = 0;
    let foundCompleteEvidence = false;

    QUANTITY_PRICE_PATTERN.lastIndex = 0;

    for (const match of segment.matchAll(QUANTITY_PRICE_PATTERN)) {
      const matchStart = match.index ?? 0;
      const matchEnd = matchStart + match[0].length;
      const itemSegment = segment.slice(cursor, matchEnd);
      const item = buildItemFromSegment(itemSegment, confidence);

      if (item) {
        items.push(item);
        foundCompleteEvidence = true;
      }

      cursor = matchEnd;
    }

    const remainder = segment.slice(cursor);
    if (foundCompleteEvidence) {
      for (const incompleteSegment of splitIncompleteSegments(remainder)) {
        const item = buildItemFromSegment(incompleteSegment, confidence);
        if (item) {
          items.push(item);
        }
      }
      return items;
    }

    return splitIncompleteSegments(segment).flatMap((incompleteSegment) => {
      const item = buildItemFromSegment(incompleteSegment, confidence);
      return item ? [item] : [];
    });
  });
}

export function buildFallbackSaleItemsFromTranscript(
  rawText: string,
  cleanedText: string,
  confidence = 0.6
): ParsedSaleItem[] {
  const rawItems = buildEvidenceItemsFromText(rawText, confidence);
  const cleanedItems = buildEvidenceItemsFromText(cleanedText, confidence);
  const rawCompleteCount = rawItems.filter((item) => item.quantity !== null && item.price !== null).length;
  const cleanedCompleteCount = cleanedItems.filter((item) => item.quantity !== null && item.price !== null).length;

  if (cleanedCompleteCount > rawCompleteCount) {
    return cleanedItems;
  }

  return rawItems.length ? rawItems : cleanedItems;
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
  const evidenceItems = buildFallbackSaleItemsFromTranscript(rawText, cleanedText, confidence);
  const sourceItem = parsedSale.items[0];
  const sourceItemLooksGlued = sourceItem
    ? segmentHasSaleEvidence(sourceItem.product_name) ||
      sourceItem.quantity === null ||
      sourceItem.quantity === undefined ||
      sourceItem.price === null
    : false;

  return evidenceItems.length > 1 || (evidenceItems.length === 1 && sourceItemLooksGlued)
    ? evidenceItems
    : parsedSale.items;
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
    : rawEvidence.productName && segmentHasSaleEvidence(item.product_name)
      ? rawEvidence.productName
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
