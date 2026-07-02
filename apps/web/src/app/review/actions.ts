"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelReviewSale,
  confirmReviewSale
} from "@/features/records/records.api";

function safeReturnTo(formData: FormData) {
  const candidate = String(formData.get("returnTo") ?? "/review");
  return candidate.startsWith("/review") && !candidate.startsWith("//")
    ? candidate
    : "/review";
}

function redirectWithResult(returnTo: string, result: { ok: boolean; message: string }): never {
  const url = new URL(returnTo, "http://voice-sales-log.local");
  url.searchParams.set("mutation", result.ok ? "success" : "error");
  url.searchParams.set("message", result.message);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function finishReviewMutation(returnTo: string, result: { ok: boolean; message: string }): never {
  revalidatePath("/review");
  revalidatePath("/daily-report");
  revalidatePath("/records");
  revalidatePath("/sellers");
  redirectWithResult(returnTo, result);
}

export async function confirmReviewSaleAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const saleId = String(formData.get("saleId") ?? "");

  if (!saleId) {
    finishReviewMutation(returnTo, { ok: false, message: "Запись не найдена." });
  }

  const result = await confirmReviewSale(saleId);
  finishReviewMutation(returnTo, result);
}

export async function cancelReviewSaleAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const saleId = String(formData.get("saleId") ?? "");

  if (!saleId) {
    finishReviewMutation(returnTo, { ok: false, message: "Запись не найдена." });
  }

  const result = await cancelReviewSale(saleId);
  finishReviewMutation(returnTo, result);
}

export async function confirmAllReviewSalesAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const saleIds = [...new Set(formData.getAll("saleId").map((value) => String(value)).filter(Boolean))];

  if (!saleIds.length) {
    finishReviewMutation(returnTo, { ok: false, message: "Нет записей для подтверждения." });
  }

  const results = [];
  for (const saleId of saleIds) {
    results.push(await confirmReviewSale(saleId));
  }

  const failed = results.find((result) => !result.ok);
  if (failed) {
    finishReviewMutation(returnTo, failed);
  }

  finishReviewMutation(returnTo, {
    ok: true,
    message: `Подтверждено записей: ${results.length}.`
  });
}
