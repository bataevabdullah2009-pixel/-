"use server";

import { revalidatePath } from "next/cache";
import { updateSaleItem } from "@/features/records/records.api";

export async function updateSaleItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const productName = String(formData.get("productName") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = Number(priceValue);

  if (!itemId || !productName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
    return;
  }

  await updateSaleItem({
    itemId,
    productName,
    quantity,
    price
  });
  revalidatePath("/daily-report");
  revalidatePath("/records");
}
