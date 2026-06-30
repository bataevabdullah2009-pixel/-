import type { DateRangePreset } from "@voice-sales-log/shared/types";
import type { ReportFilters, SearchParams } from "./records.types";

export function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getPreset(value: string | string[] | undefined): DateRangePreset {
  const preset = getStringParam(value);

  if (preset === "yesterday" || preset === "week" || preset === "month" || preset === "year" || preset === "custom") {
    return preset;
  }

  return "today";
}

export function getReportFilters(params: SearchParams): ReportFilters {
  const date = getStringParam(params.date);
  return {
    period: getPreset(params.period),
    ...(date ? { date } : {})
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3
  }).format(value);
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Нужно проверить",
    processed: "Готово",
    needs_review: "Нужно проверить",
    cancelled: "Исключено",
    failed: "Нужно проверить",
    needs_price: "Нужно проверить",
    excluded: "Исключено"
  };

  return labels[status] ?? "Нужно проверить";
}

export function buildHref(basePath: string, params: SearchParams, updates: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === "mutation" || key === "message") {
      continue;
    }
    const current = getStringParam(value);
    if (current) {
      query.set(key, current);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      query.set(key, value);
    } else {
      query.delete(key);
    }
  }

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
