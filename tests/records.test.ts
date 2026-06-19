import { describe, expect, it } from "vitest";
import type { SaleItem } from "../packages/shared/types";
import {
  buildExcludedSaleItemPatch,
  buildManualSaleItemPatch,
  buildSalesReport,
  calculateItemTotal,
  normalizeSaleItemFields
} from "../packages/shared/utils/date-range";

describe("sales report", () => {
  it("normalizes bread quantity and unit from parsed text", () => {
    const item = normalizeSaleItemFields({
      product_name: "Хлеб",
      quantity: 4,
      unit: "штуки",
      price: 40,
      confidence: 0.95
    });

    expect(item).toMatchObject({
      product_name: "Хлеб",
      quantity: 4,
      unit: "шт",
      status: "processed"
    });
  });

  it("groups same products and sums revenue", () => {
    const items: SaleItem[] = [
      {
        id: "1",
        sale_id: "sale-1",
        product_id: "product-bread",
        product_name: "хлеб",
        quantity: 3,
        unit: "штуки",
        price: 40,
        total: 120,
        confidence: 0.95,
        status: "processed",
        created_at: "2026-06-16T08:00:00.000Z"
      },
      {
        id: "2",
        sale_id: "sale-2",
        product_name: "Хлеб",
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
      unit: "шт",
      revenue: 200
    });
    expect(report.totalRevenue).toBe(200);
  });

  it("normalizes milk quantity and unit from parsed text", () => {
    const item = normalizeSaleItemFields({
      product_name: "Молоко",
      quantity: 2,
      unit: "штуки",
      price: 90,
      confidence: 0.95
    });

    expect(item).toMatchObject({
      product_name: "Молоко",
      quantity: 2,
      unit: "шт",
      status: "processed"
    });
  });

  it("keeps unknown price out of revenue and review block", () => {
    const normalized = normalizeSaleItemFields({
      product_name: "Чай",
      quantity: 3,
      unit: "шт",
      price: null,
      confidence: 0.9
    });

    expect(normalized.status).toBe("needs_price");

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

  it("marks low confidence and missing required fields for review", () => {
    expect(
      normalizeSaleItemFields({
        product_name: "Хлеб",
        quantity: 1,
        unit: "шт",
        price: 40,
        confidence: 0.7
      }).status
    ).toBe("needs_review");

    expect(
      normalizeSaleItemFields({
        product_name: "Хлеб",
        quantity: null,
        unit: "шт",
        price: 40,
        confidence: 0.95
      })
    ).toMatchObject({
      quantity: 1,
      status: "needs_review"
    });

    expect(
      normalizeSaleItemFields({
        product_name: "",
        quantity: 1,
        unit: "шт",
        price: 40,
        confidence: 0.95
      }).status
    ).toBe("needs_review");
  });

  it("updates a sale item with recalculated total and processed status", () => {
    const patch = buildManualSaleItemPatch({
      productName: "Хлеб",
      quantity: 20,
      price: 300
    });

    expect(patch).toMatchObject({
      product_name: "Хлеб",
      quantity: 20,
      unit: "шт",
      price: 300,
      total: 6000,
      status: "processed",
      confidence: 1
    });
  });

  it("builds a soft-delete patch with excluded status", () => {
    const patch = buildExcludedSaleItemPatch("processed", "2026-06-19T10:00:00.000Z");

    expect(patch).toEqual({
      status: "excluded",
      deleted_at: "2026-06-19T10:00:00.000Z",
      deleted_reason: "excluded_by_owner",
      deleted_previous_status: "processed",
      updated_at: "2026-06-19T10:00:00.000Z"
    });
  });

  it("calculates item total from quantity and price", () => {
    expect(calculateItemTotal(7, 90)).toBe(630);
    expect(calculateItemTotal(3, null)).toBeNull();
  });

  it("excludes soft-deleted items from quantity and revenue", () => {
    const items: SaleItem[] = [
      {
        id: "active",
        sale_id: "sale-1",
        product_name: "Хлеб",
        quantity: 2,
        unit: "шт",
        price: 40,
        total: 80,
        confidence: 1,
        status: "processed",
        created_at: "2026-06-18T08:00:00.000Z"
      },
      {
        id: "deleted",
        sale_id: "sale-1",
        product_name: "Молоко",
        quantity: 3,
        unit: "шт",
        price: 90,
        total: 270,
        confidence: 1,
        status: "excluded",
        created_at: "2026-06-18T09:00:00.000Z",
        deleted_at: "2026-06-18T10:00:00.000Z",
        deleted_reason: "excluded_by_owner",
        deleted_previous_status: "processed"
      }
    ];

    const report = buildSalesReport(items);

    expect(report.rows).toHaveLength(1);
    expect(report.totalQuantity).toBe(2);
    expect(report.totalRevenue).toBe(80);
    expect(report.reviewItems).toHaveLength(0);
  });

  it("does not include needs_price items in revenue", () => {
    const report = buildSalesReport([{
      id: "needs-price",
      sale_id: "sale-1",
      product_name: "Чай",
      quantity: 5,
      unit: "шт",
      price: null,
      total: null,
      confidence: 1,
      status: "needs_price",
      created_at: "2026-06-19T08:00:00.000Z"
    }]);

    expect(report.totalRevenue).toBe(0);
    expect(report.reviewItems).toHaveLength(1);
  });

  it("includes active processed items in revenue", () => {
    const report = buildSalesReport([{
      id: "processed",
      sale_id: "sale-1",
      product_name: "Чай",
      quantity: 20,
      unit: "шт",
      price: 300,
      total: 6000,
      confidence: 1,
      status: "processed",
      created_at: "2026-06-19T08:00:00.000Z"
    }]);

    expect(report.totalQuantity).toBe(20);
    expect(report.totalRevenue).toBe(6000);
  });
});
