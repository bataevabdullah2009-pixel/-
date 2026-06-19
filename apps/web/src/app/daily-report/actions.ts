"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDateRange } from "@voice-sales-log/shared/utils/date-range";
import type { DateRangePreset } from "@voice-sales-log/shared/types";
import {
  excludeSaleItem,
  resetDayRevenue,
  restoreSaleItem,
  updateSaleItem
} from "@/features/records/records.api";

const UPDATE_ERROR_MESSAGE = "Не удалось сохранить товар. Проверьте данные и попробуйте ещё раз.";
const EXCLUDE_ERROR_MESSAGE = "Не удалось исключить товар из отчёта.";

function safeReturnTo(formData: FormData) {
  const candidate = String(formData.get("returnTo") ?? "/daily-report");
  return candidate.startsWith("/daily-report") && !candidate.startsWith("//")
    ? candidate
    : "/daily-report";
}

function redirectWithResult(returnTo: string, result: { ok: boolean; message: string }): never {
  const url = new URL(returnTo, "http://voice-sales-log.local");
  url.searchParams.set("mutation", result.ok ? "success" : "error");
  url.searchParams.set("message", result.message);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function finishMutation(returnTo: string, result: { ok: boolean; message: string }): never {
  revalidatePath("/daily-report");
  revalidatePath("/records");
  redirectWithResult(returnTo, result);
}

export async function updateSaleItemAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const itemId = String(formData.get("itemId") ?? "");
  const productName = String(formData.get("productName") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = Number(priceValue);

  if (!itemId || !productName || !Number.isFinite(quantity) || quantity <= 0 || !priceValue || !Number.isFinite(price) || price <= 0) {
    finishMutation(returnTo, {
      ok: false,
      message: UPDATE_ERROR_MESSAGE
    });
  }

  let result: { ok: boolean; message: string };
  try {
    result = await updateSaleItem({ itemId, productName, quantity, price });
  } catch (error) {
    console.error("Failed to update sale item", error);
    result = { ok: false, message: UPDATE_ERROR_MESSAGE };
  }

  finishMutation(returnTo, result.ok ? result : { ok: false, message: UPDATE_ERROR_MESSAGE });
}

export async function excludeSaleItemAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) {
    finishMutation(returnTo, { ok: false, message: EXCLUDE_ERROR_MESSAGE });
  }

  let result: { ok: boolean; message: string };
  try {
    result = await excludeSaleItem(itemId);
  } catch (error) {
    console.error("Failed to exclude sale item", error);
    result = { ok: false, message: EXCLUDE_ERROR_MESSAGE };
  }

  finishMutation(returnTo, result.ok ? result : { ok: false, message: EXCLUDE_ERROR_MESSAGE });
}

export async function restoreSaleItemAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const itemId = String(formData.get("itemId") ?? "");
  const result = itemId
    ? await restoreSaleItem(itemId)
    : { ok: false, message: "Позиция не найдена." };

  finishMutation(returnTo, result);
}

export async function resetDayRevenueAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const periodValue = String(formData.get("period") ?? "today");
  const date = String(formData.get("date") ?? "") || undefined;
  const allowedPeriods = new Set<DateRangePreset>(["today", "yesterday", "custom"]);

  if (!allowedPeriods.has(periodValue as DateRangePreset)) {
    finishMutation(returnTo, { ok: false, message: "Выберите один день перед сбросом выручки." });
  }

  if (periodValue === "custom" && !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    finishMutation(returnTo, { ok: false, message: "Выберите корректную дату перед сбросом." });
  }

  const range = getDateRange(periodValue as DateRangePreset, { date });
  const result = await resetDayRevenue({ start: range.start, end: range.end });
  finishMutation(returnTo, result);
}
