import type { DateRangePreset, ReportSummary, SaleItem } from "../types/index";

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

function normalizeProductName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function displayProductName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  return normalized.charAt(0).toLocaleUpperCase("ru-RU") + normalized.slice(1);
}

export function calculateItemTotal(quantity: number, price: number | null | undefined) {
  if (price === null || price === undefined) {
    return null;
  }

  return Number((quantity * price).toFixed(2));
}

export function buildSalesReport(items: SaleItem[]): ReportSummary {
  const rows = new Map<string, { product_name: string; quantity: number; unit: string; revenue: number }>();
  const reviewItems: SaleItem[] = [];

  for (const item of items) {
    if (item.status !== "processed" || item.price === null || item.total === null || item.confidence < 0.75) {
      reviewItems.push(item);
      continue;
    }

    const key = `${normalizeProductName(item.product_name)}|${item.unit}`;
    const current = rows.get(key) ?? {
      product_name: displayProductName(item.product_name),
      quantity: 0,
      unit: item.unit,
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
