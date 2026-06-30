"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelReviewSale,
  confirmReviewSale
} from "@/features/records/records.api";

function safeReviewReturnTo(formData: FormData) {
  const candidate = String(formData.get("returnTo") ?? "/review");
  return candidate.startsWith("/review") && !candidate.startsWith("//")
    ? candidate
    : "/review";
}

function revalidateProductViews() {
  revalidatePath("/daily-report");
  revalidatePath("/records");
  revalidatePath("/review");
  revalidatePath("/sellers");
}

function redirectWithResult(returnTo: string, result: { ok: boolean; message: string }): never {
  const url = new URL(returnTo, "http://voice-sales-log.local");
  url.searchParams.set("mutation", result.ok ? "success" : "error");
  url.searchParams.set("message", result.message);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

export async function confirmReviewSaleAction(formData: FormData) {
  const saleId = String(formData.get("saleId") ?? "");
  const returnTo = safeReviewReturnTo(formData);
  let result = { ok: false, message: "Не удалось подтвердить запись." };

  try {
    result = await confirmReviewSale(saleId);
  } catch (error) {
    console.error("Failed to confirm review sale", error);
  }

  revalidateProductViews();
  redirectWithResult(returnTo, result.ok ? result : { ok: false, message: result.message });
}

export async function cancelReviewSaleAction(formData: FormData) {
  const saleId = String(formData.get("saleId") ?? "");
  const returnTo = safeReviewReturnTo(formData);
  let result = { ok: false, message: "Не удалось отменить запись." };

  try {
    result = await cancelReviewSale(saleId);
  } catch (error) {
    console.error("Failed to cancel review sale", error);
  }

  revalidateProductViews();
  redirectWithResult(returnTo, result.ok ? result : { ok: false, message: result.message });
}

