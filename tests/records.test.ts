import { describe, expect, it } from "vitest";
import type { SaleItem } from "../packages/shared/types";
import {
  buildExcludedSaleItemPatch,
  buildManualSaleItemPatch,
  buildSalesReport,
  calculateItemTotal,
  normalizeSaleItemFields
} from "../packages/shared/utils/date-range";
import {
  buildHref,
  getStatusLabel
} from "../apps/web/src/features/records/records.utils";

describe("sales report", () => {
  it("never exposes raw technical statuses to users", () => {
    expect(getStatusLabel("processed")).toBe("Готово");
    expect(getStatusLabel("needs_review")).toBe("Нужно проверить");
    expect(getStatusLabel("cancelled")).toBe("Исключено");
    expect(getStatusLabel("failed")).toBe("Нужно проверить");
    expect(getStatusLabel("needs_price")).toBe("Нужно проверить");
    expect(getStatusLabel("unexpected_internal_status")).toBe("Нужно проверить");
  });

  it("does not carry mutation notices into period filter links", () => {
    expect(buildHref("/daily-report", {
      period: "yesterday",
      mutation: "success",
      message: "Сохранено"
    }, {
      period: "week"
    })).toBe("/daily-report?period=week");
  });

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

    expect(normalized.status).toBe("needs_review");

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
        status: "needs_review",
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

    expect(
      normalizeSaleItemFields({
        product_name: "ээээээ",
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

  it("persists edited name, quantity and unit price in the update patch", () => {
    const patch = buildManualSaleItemPatch({
      productName: "Сникерс",
      quantity: 10,
      unit: "шт",
      price: 100
    });

    expect(patch).toMatchObject({
      product_name: "Сникерс",
      quantity: 10,
      price: 100,
      total: 1000,
      status: "processed"
    });
  });

  it("builds a complete manual WebApp save patch for bread", () => {
    const patch = buildManualSaleItemPatch({
      productName: "Буханка хлеба",
      quantity: 5,
      unit: "шт",
      price: 50
    });

    expect(patch).toMatchObject({
      product_name: "Буханка хлеба",
      quantity: 5,
      unit: "шт",
      price: 50,
      total: 250,
      status: "processed",
      confidence: 1
    });
  });

  it("recalculates report totals after an item update", () => {
    const patch = buildManualSaleItemPatch({
      productName: "Сникерс",
      quantity: 10,
      unit: "шт",
      price: 50
    });
    const report = buildSalesReport([{
      id: "updated-item",
      sale_id: "sale-1",
      ...patch,
      created_at: "2026-06-25T08:00:00.000Z"
    }]);

    expect(report).toMatchObject({
      totalQuantity: 10,
      totalRevenue: 500
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
    expect(calculateItemTotal(300, 200, "г")).toBe(60);
    expect(calculateItemTotal(3, null)).toBeNull();
  });

  it("derives unit price from total when recognition has total but no unit price", () => {
    expect(normalizeSaleItemFields({
      product_name: "Сникерс",
      quantity: 5,
      unit: "шт",
      price: null,
      total: 500,
      confidence: 1
    })).toMatchObject({
      product_name: "Сникерс",
      quantity: 5,
      price: 100,
      total: 500,
      status: "processed"
    });
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

  it("recalculates report totals after deleting one item", () => {
    const deletedPatch = buildExcludedSaleItemPatch(
      "processed",
      "2026-06-25T09:00:00.000Z"
    );
    const report = buildSalesReport([
      {
        id: "active",
        sale_id: "sale-1",
        product_name: "Сникерс",
        quantity: 2,
        unit: "шт",
        price: 50,
        total: 100,
        confidence: 1,
        status: "processed",
        created_at: "2026-06-25T08:00:00.000Z"
      },
      {
        id: "deleted",
        sale_id: "sale-1",
        product_name: "Марс",
        quantity: 3,
        unit: "шт",
        price: 50,
        total: 150,
        confidence: 1,
        created_at: "2026-06-25T08:10:00.000Z",
        ...deletedPatch
      }
    ]);

    expect(report).toMatchObject({
      totalQuantity: 2,
      totalRevenue: 100
    });
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
