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
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function parseManualDate(date: string | undefined, fallback: Date) {
  if (!date) {
    return fallback;
  }

  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function getDateRange(preset: DateRangePreset = "today", options: DateRangeOptions = {}): DateRange {
  const now = options.now ?? new Date();
  const selected = parseManualDate(options.date, now);
  const todayStart = startOfDay(now);

  if (preset === "yesterday") {
    const start = addDays(todayStart, -1);
    return {
      preset,
      start: start.toISOString(),
      end: todayStart.toISOString(),
      label: "Вчера"
    };
  }

  if (preset === "week") {
    const start = addDays(todayStart, -6);
    return {
      preset,
      start: start.toISOString(),
      end: addDays(todayStart, 1).toISOString(),
      label: "Последние 7 дней"
    };
  }

  if (preset === "month") {
    const start = startOfMonth(selected);
    return {
      preset,
      start: start.toISOString(),
      end: startOfMonth(new Date(selected.getFullYear(), selected.getMonth() + 1, 1)).toISOString(),
      label: "Месяц"
    };
  }

  if (preset === "year") {
    const start = startOfYear(selected);
    return {
      preset,
      start: start.toISOString(),
      end: startOfYear(new Date(selected.getFullYear() + 1, 0, 1)).toISOString(),
      label: "Год"
    };
  }

  const dayStart = startOfDay(preset === "custom" ? selected : now);
  return {
    preset,
    start: dayStart.toISOString(),
    end: addDays(dayStart, 1).toISOString(),
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
  ["штук", "шт"]
]);

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeProductName(name: string | null | undefined) {
  const normalized = normalizeText(name).toLocaleLowerCase("ru-RU");
  return PRODUCT_ALIASES.get(normalized) ?? normalized;
}

export function displayProductName(name: string | null | undefined) {
  const normalized = normalizeProductName(name);

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toLocaleUpperCase("ru-RU") + normalized.slice(1);
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

export function resolveSaleItemStatus(params: {
  productName: string | null | undefined;
  quantityWasMissing?: boolean;
  price: number | null;
  total: number | null;
  confidence: number;
}): SaleItemStatus {
  if (!normalizeProductName(params.productName) || params.quantityWasMissing || params.confidence < 0.75) {
    return "needs_review";
  }

  if (params.price === null || params.total === null) {
    return "needs_price";
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

export function buildSalesReport(items: SaleItem[]): ReportSummary {
  const rows = new Map<string, { key: string; product_name: string; quantity: number; unit: string; revenue: number }>();
  const reviewItems: SaleItem[] = [];
  const productKeyByName = new Map<string, string>();

  for (const item of items) {
    if (
      item.status === "processed" &&
      item.product_id &&
      item.price !== null &&
      item.total !== null &&
      item.confidence >= 0.75
    ) {
      productKeyByName.set(normalizeProductName(item.product_name), `product:${item.product_id}`);
    }
  }

  for (const item of items) {
    if (item.status !== "processed" || item.price === null || item.total === null || item.confidence < 0.75) {
      reviewItems.push(item);
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
