import { describe, expect, it } from "vitest";
import type { SaleItem } from "../packages/shared/types";
import { buildSalesReport, calculateItemTotal } from "../packages/shared/utils/date-range";

describe("sales report", () => {
  it("groups same products and sums revenue", () => {
    const items: SaleItem[] = [
      {
        id: "1",
        sale_id: "sale-1",
        product_name: "Хлеб",
        quantity: 3,
        unit: "шт",
        price: 40,
        total: 120,
        confidence: 0.95,
        status: "processed",
        created_at: "2026-06-16T08:00:00.000Z"
      },
      {
        id: "2",
        sale_id: "sale-2",
        product_name: "хлеб",
        quantity: 2,
        unit: "шт",
        price: 40,
        total: 80,
        confidence: 0.95,
        status: "processed",
        created_at: "2026-06-16T18:00:00.000Z"
      }
    ];

    const report = buildSalesReport(items);

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      product_name: "Хлеб",
      quantity: 5,
      revenue: 200
    });
    expect(report.totalRevenue).toBe(200);
  });

  it("keeps unknown price out of revenue and review block", () => {
    const items: SaleItem[] = [
      {
        id: "1",
        sale_id: "sale-1",
        product_name: "Чай",
        quantity: 3,
        unit: "шт",
        price: null,
        total: null,
        confidence: 0.9,
        status: "needs_price",
        created_at: "2026-06-16T10:00:00.000Z"
      }
    ];

    const report = buildSalesReport(items);

    expect(report.rows).toHaveLength(0);
    expect(report.reviewItems).toHaveLength(1);
    expect(report.totalRevenue).toBe(0);
  });

  it("calculates item total from quantity and price", () => {
    expect(calculateItemTotal(7, 90)).toBe(630);
    expect(calculateItemTotal(3, null)).toBeNull();
  });
});
