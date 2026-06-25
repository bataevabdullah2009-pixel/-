import type { SaleItem } from "@voice-sales-log/shared/types";

export type ReportSaleRow = {
  id: unknown;
  shop_id: unknown;
  created_at: unknown;
};

export type ReportSaleItemRow = {
  id: unknown;
  sale_id: unknown;
  product_id?: unknown;
  product_name: unknown;
  quantity: unknown;
  unit: unknown;
  price: unknown;
  total: unknown;
  confidence: unknown;
  status: unknown;
  updated_at?: unknown;
  deleted_at?: unknown;
  deleted_reason?: unknown;
  deleted_previous_status?: unknown;
};

export function scopeReportRows(
  sales: ReportSaleRow[],
  saleItems: ReportSaleItemRow[],
  shopId: string
) {
  const saleCreatedAt = new Map<string, string>();

  for (const sale of sales) {
    if (String(sale.shop_id) !== shopId) {
      throw new Error("Report shop scope mismatch.");
    }
    saleCreatedAt.set(String(sale.id), String(sale.created_at));
  }

  const items: SaleItem[] = saleItems.flatMap((item) => {
    const createdAt = saleCreatedAt.get(String(item.sale_id));
    if (!createdAt) return [];

    return [{
      id: String(item.id),
      sale_id: String(item.sale_id),
      product_id: item.product_id ? String(item.product_id) : undefined,
      product_name: String(item.product_name),
      quantity: Number(item.quantity),
      unit: String(item.unit),
      price: item.price === null ? null : Number(item.price),
      total: item.total === null ? null : Number(item.total),
      confidence: Number(item.confidence),
      status: String(item.status),
      created_at: createdAt,
      updated_at: item.updated_at ? String(item.updated_at) : undefined,
      deleted_at: item.deleted_at ? String(item.deleted_at) : null,
      deleted_reason: item.deleted_reason ? String(item.deleted_reason) : null,
      deleted_previous_status: item.deleted_previous_status
        ? String(item.deleted_previous_status)
        : null
    } as SaleItem];
  });

  return {
    salesCount: sales.length,
    saleItemsCount: items.length,
    items
  };
}

export function partitionSaleItems(items: SaleItem[]) {
  return {
    activeItems: items.filter((item) => !item.deleted_at && item.status !== "excluded"),
    deletedItems: items.filter((item) => Boolean(item.deleted_at) || item.status === "excluded")
  };
}
