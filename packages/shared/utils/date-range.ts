import type { DateRangePreset, ReportSummary, SaleItem, SaleItemStatus } from "../types/index";

export type DateRange = {
  preset: DateRangePreset;
  start: string;
  end: string;
  label: string;
};

type DateRangeOptions = {
  date?: string;
  now?: Date;
  timeZone?: string;
};

export const REPORT_TIME_ZONE = "Europe/Moscow";

type CalendarDate = { year: number; month: number; day: number };

function calendarDateFromInstant(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

function parseCalendarDate(value: string | undefined, fallback: CalendarDate): CalendarDate {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fallback;

  const parsed = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const verifier = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));

  return verifier.getUTCFullYear() === parsed.year && verifier.getUTCMonth() + 1 === parsed.month && verifier.getUTCDate() === parsed.day
    ? parsed
    : fallback;
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function zonedStartOfDay(date: CalendarDate, timeZone: string) {
  const target = Date.UTC(date.year, date.month - 1, date.day);
  let utc = target;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).formatToParts(new Date(utc));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const representedLocalTime = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
      value("second")
    );
    utc = target - (representedLocalTime - utc);
  }

  return new Date(utc);
}

export function getDateRange(preset: DateRangePreset = "today", options: DateRangeOptions = {}): DateRange {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? REPORT_TIME_ZONE;
  const today = calendarDateFromInstant(now, timeZone);
  const selected = parseCalendarDate(options.date, today);

  if (preset === "yesterday") {
    const startDate = addCalendarDays(today, -1);
    return {
      preset,
      start: zonedStartOfDay(startDate, timeZone).toISOString(),
      end: zonedStartOfDay(today, timeZone).toISOString(),
      label: "Вчера"
    };
  }

  if (preset === "week") {
    const startDate = addCalendarDays(today, -6);
    const endDate = addCalendarDays(today, 1);
    return {
      preset,
      start: zonedStartOfDay(startDate, timeZone).toISOString(),
      end: zonedStartOfDay(endDate, timeZone).toISOString(),
      label: "Последние 7 дней"
    };
  }

  if (preset === "month") {
    const startDate = { year: selected.year, month: selected.month, day: 1 };
    const nextMonth = selected.month === 12
      ? { year: selected.year + 1, month: 1, day: 1 }
      : { year: selected.year, month: selected.month + 1, day: 1 };
    return {
      preset,
      start: zonedStartOfDay(startDate, timeZone).toISOString(),
      end: zonedStartOfDay(nextMonth, timeZone).toISOString(),
      label: "Месяц"
    };
  }

  if (preset === "year") {
    const startDate = { year: selected.year, month: 1, day: 1 };
    const nextYear = { year: selected.year + 1, month: 1, day: 1 };
    return {
      preset,
      start: zonedStartOfDay(startDate, timeZone).toISOString(),
      end: zonedStartOfDay(nextYear, timeZone).toISOString(),
      label: "Год"
    };
  }

  const day = preset === "custom" ? selected : today;
  const nextDay = addCalendarDays(day, 1);
  return {
    preset,
    start: zonedStartOfDay(day, timeZone).toISOString(),
    end: zonedStartOfDay(nextDay, timeZone).toISOString(),
    label: preset === "custom" ? "Выбранная дата" : "Сегодня"
  };
}

export function filterByDateRange<T extends { created_at: string }>(items: T[], range: DateRange) {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();

  return items.filter((item) => {
    const createdAt = new Date(item.created_at).getTime();
    return createdAt >= start && createdAt < end;
  });
}

const PRODUCT_ALIASES = new Map([
  ["хлеба", "хлеб"],
  ["молока", "молоко"]
]);

const UNIT_ALIASES = new Map([
  ["шт", "шт"],
  ["шт.", "шт"],
  ["штука", "шт"],
  ["штуки", "шт"],
  ["штук", "шт"],
  ["кг", "кг"],
  ["кг.", "кг"],
  ["килограмм", "кг"],
  ["килограмма", "кг"],
  ["килограммов", "кг"]
]);

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeProductName(name: string | null | undefined) {
  const normalized = normalizeText(name).toLocaleLowerCase("ru-RU");
  return PRODUCT_ALIASES.get(normalized) ?? normalized;
}

export function displayProductName(name: string | null | undefined) {
  const source = normalizeText(name);
  const normalized = normalizeProductName(source);

  if (!normalized) {
    return "";
  }

  const displayValue = PRODUCT_ALIASES.has(source.toLocaleLowerCase("ru-RU")) ? normalized : source;
  return displayValue.charAt(0).toLocaleUpperCase("ru-RU") + displayValue.slice(1);
}

export function normalizeUnit(unit: string | null | undefined) {
  const normalized = normalizeText(unit).toLocaleLowerCase("ru-RU");

  if (!normalized) {
    return "шт";
  }

  return UNIT_ALIASES.get(normalized) ?? normalized;
}

export function calculateItemTotal(quantity: number, price: number | null | undefined) {
  if (price === null || price === undefined) {
    return null;
  }

  return Number((quantity * price).toFixed(2));
}

const MEANINGLESS_PRODUCT_TOKENS = new Set([
  "а",
  "ага",
  "вот",
  "да",
  "неразборчиво",
  "нет",
  "ну",
  "товар",
  "ээ",
  "эм",
  "unknown"
]);

export function isMeaningfulProductName(name: string | null | undefined) {
  const normalized = normalizeProductName(name);

  if (!normalized || normalized.length > 120 || /(.)\1{4,}/u.test(normalized)) {
    return false;
  }

  const tokens = normalized.match(/[\p{L}\p{N}%]+/gu) ?? [];
  const letters = normalized.match(/\p{L}/gu) ?? [];

  return letters.length >= 2 && tokens.some((token) => token.length >= 2 && !MEANINGLESS_PRODUCT_TOKENS.has(token));
}

export function resolveSaleItemStatus(params: {
  productName: string | null | undefined;
  quantityWasMissing?: boolean;
  price: number | null;
  total: number | null;
  confidence: number;
}): SaleItemStatus {
  if (
    !isMeaningfulProductName(params.productName) ||
    params.quantityWasMissing ||
    params.price === null ||
    params.total === null ||
    params.confidence < 0.8
  ) {
    return "needs_review";
  }

  return "processed";
}

export function normalizeSaleItemFields(item: {
  product_name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  price?: number | null;
  confidence?: number | null;
}) {
  const hasQuantity = typeof item.quantity === "number" && Number.isFinite(item.quantity);
  const hasPrice = typeof item.price === "number" && Number.isFinite(item.price);
  const hasConfidence = typeof item.confidence === "number" && Number.isFinite(item.confidence);
  const quantityWasMissing = !hasQuantity || Number(item.quantity) <= 0;
  const quantity = quantityWasMissing ? 1 : Number(item.quantity);
  const price = hasPrice ? Number(item.price) : null;
  const confidence = hasConfidence ? Number(item.confidence) : 0.5;
  const total = calculateItemTotal(quantity, price);
  const productName = displayProductName(item.product_name);
  const status = resolveSaleItemStatus({
    productName,
    quantityWasMissing,
    price,
    total,
    confidence
  });

  return {
    product_name: productName,
    normalized_product_name: normalizeProductName(productName),
    quantity,
    unit: normalizeUnit(item.unit),
    price,
    total,
    confidence,
    status,
    quantityWasMissing
  };
}

export function buildManualSaleItemPatch(params: {
  productName: string;
  quantity: number;
  unit?: string | null;
  price: number;
}) {
  const normalized = normalizeSaleItemFields({
    product_name: params.productName,
    quantity: params.quantity,
    unit: params.unit,
    price: params.price,
    confidence: 1
  });

  return {
    product_name: normalized.product_name,
    normalized_product_name: normalized.normalized_product_name,
    quantity: normalized.quantity,
    unit: normalized.unit,
    price: params.price,
    total: calculateItemTotal(normalized.quantity, params.price),
    confidence: 1,
    status: "processed" as const
  };
}

export function buildExcludedSaleItemPatch(
  previousStatus: Exclude<SaleItemStatus, "excluded">,
  timestamp = new Date().toISOString()
) {
  return {
    status: "excluded" as const,
    deleted_at: timestamp,
    deleted_reason: "excluded_by_owner" as const,
    deleted_previous_status: previousStatus,
    updated_at: timestamp
  };
}

export function isRevenueSaleItemStatus(status: string) {
  return status === "processed" || status === "confirmed";
}

export function buildSalesReport(items: SaleItem[]): ReportSummary {
  const rows = new Map<string, { key: string; product_name: string; quantity: number; unit: string; revenue: number }>();
  const reviewItems: SaleItem[] = [];
  const productKeyByName = new Map<string, string>();

  for (const item of items) {
    if (item.deleted_at) {
      continue;
    }

    if (
      isRevenueSaleItemStatus(item.status) &&
      item.product_id &&
      item.price !== null &&
      item.total !== null &&
      item.confidence >= 0.8
    ) {
      productKeyByName.set(normalizeProductName(item.product_name), `product:${item.product_id}`);
    }
  }

  for (const item of items) {
    if (item.deleted_at) {
      continue;
    }

    if (!isRevenueSaleItemStatus(item.status) || item.price === null || item.total === null) {
      if (item.status !== "excluded") {
        reviewItems.push(item);
      }
      continue;
    }

    const normalizedProductName = normalizeProductName(item.product_name);
    const key = item.product_id
      ? `product:${item.product_id}`
      : productKeyByName.get(normalizedProductName) ?? `name:${normalizedProductName}`;
    const current = rows.get(key) ?? {
      key,
      product_name: displayProductName(item.product_name),
      quantity: 0,
      unit: normalizeUnit(item.unit),
      revenue: 0
    };

    current.quantity = Number((current.quantity + item.quantity).toFixed(3));
    current.revenue = Number((current.revenue + item.total).toFixed(2));
    rows.set(key, current);
  }

  const sortedRows = [...rows.values()].sort((left, right) =>
    left.product_name.localeCompare(right.product_name, "ru-RU")
  );

  return {
    rows: sortedRows,
    reviewItems,
    totalQuantity: Number(sortedRows.reduce((sum, row) => sum + row.quantity, 0).toFixed(3)),
    totalRevenue: Number(sortedRows.reduce((sum, row) => sum + row.revenue, 0).toFixed(2))
  };
}
