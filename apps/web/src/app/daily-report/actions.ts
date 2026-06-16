"use server";

import { revalidatePath } from "next/cache";
import { updateSaleItem } from "@/features/records/records.api";

export async function updateSaleItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = priceValue ? Number(priceValue) : null;

  if (!itemId || !Number.isFinite(quantity) || quantity <= 0 || (price !== null && (!Number.isFinite(price) || price < 0))) {
    return;
  }

  await updateSaleItem({
    itemId,
    quantity,
    price
  });
  revalidatePath("/daily-report");
  revalidatePath("/records");
}
