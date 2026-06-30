"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDateRange } from "@voice-sales-log/shared/utils/date-range";
import type { DateRangePreset } from "@voice-sales-log/shared/types";
import {
  excludeSaleItem,
  resetDay,
  restoreSaleItem,
  updateSaleItem
} from "@/features/records/records.api";

const UPDATE_ERROR_MESSAGE = "Не удалось сохранить товар. Проверьте данные и попробуйте ещё раз.";
const EXCLUDE_ERROR_MESSAGE = "Не удалось исключить товар из отчёта.";

export type SaleItemActionState = {
  status: "idle" | "success" | "error";
  message: string;
  statusCode?: 401 | 403 | 404 | 422 | 500;
  code?: string;
  item?: {
    id: string;
    sale_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    price: number | null;
    total: number | null;
    status: string;
    updated_at: string;
  };
  itemId?: string;
};

function actionError(
  message: string,
  statusCode: NonNullable<SaleItemActionState["statusCode"]>,
  code: string
): SaleItemActionState {
  return { status: "error", message, statusCode, code };
}

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

function revalidateReports() {
  revalidatePath("/daily-report");
  revalidatePath("/records");
}

export async function updateSaleItemAction(
  _previousState: SaleItemActionState,
  formData: FormData
): Promise<SaleItemActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  const productName = String(formData.get("productName") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = Number(priceValue);

  if (!itemId || !productName || !Number.isFinite(quantity) || quantity <= 0 || !priceValue || !Number.isFinite(price) || price <= 0) {
    return {
      status: "error",
      message: "Заполните товар, количество и цену положительными значениями.",
      statusCode: 422,
      code: "INVALID_ITEM_DATA"
    };
  }

  try {
    const result = await updateSaleItem({ itemId, productName, quantity, price });
    if (!result.ok) {
      console.error("Failed to update sale item", {
        itemId,
        statusCode: result.statusCode,
        code: result.code
      });
      return actionError(result.message || UPDATE_ERROR_MESSAGE, result.statusCode ?? 500, result.code ?? "ITEM_UPDATE_FAILED");
    }

    revalidateReports();
    return {
      status: "success",
      message: result.message,
      item: result.item
    };
  } catch (error) {
    console.error("Failed to update sale item", error);
    return actionError(UPDATE_ERROR_MESSAGE, 500, "ITEM_UPDATE_FAILED");
  }
}

export async function excludeSaleItemAction(
  _previousState: SaleItemActionState,
  formData: FormData
): Promise<SaleItemActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) {
    return actionError(EXCLUDE_ERROR_MESSAGE, 422, "ITEM_ID_MISSING");
  }

  try {
    const result = await excludeSaleItem(itemId);
    if (!result.ok) {
      console.error("Failed to exclude sale item", {
        itemId,
        statusCode: result.statusCode,
        code: result.code
      });
      return actionError(result.message || EXCLUDE_ERROR_MESSAGE, result.statusCode ?? 500, result.code ?? "ITEM_EXCLUDE_FAILED");
    }

    revalidateReports();
    return {
      status: "success",
      message: result.message,
      itemId: result.itemId ?? itemId
    };
  } catch (error) {
    console.error("Failed to exclude sale item", error);
    return actionError(EXCLUDE_ERROR_MESSAGE, 500, "ITEM_EXCLUDE_FAILED");
  }
}

export async function restoreSaleItemAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const itemId = String(formData.get("itemId") ?? "");
  let result = { ok: false, message: "Не удалось восстановить товар." };

  if (itemId) {
    try {
      result = await restoreSaleItem(itemId);
    } catch (error) {
      console.error("Failed to restore sale item", error);
    }
  }

  finishMutation(returnTo, result.ok ? result : { ok: false, message: "Не удалось восстановить товар." });
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
  let result: { ok: boolean; message: string };
  try {
    result = await resetDay({ start: range.start, end: range.end });
  } catch (error) {
    console.error("Failed to reset daily report", error);
    result = { ok: false, message: "Не удалось сбросить отчёт за день." };
  }

  finishMutation(returnTo, result.ok ? result : { ok: false, message: "Не удалось сбросить отчёт за день." });
}
