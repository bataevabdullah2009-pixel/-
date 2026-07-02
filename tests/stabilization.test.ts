import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelVoiceSaleWithClient,
  buildVoiceSaleRpcPayload,
  confirmVoiceSaleWithClient,
  ensureReviewableSaleItems,
  persistVoiceSale,
  resolveSellerAccess,
  SellerAccessError
} from "../apps/bot/src/services/records.service";
import { parseSaleTranscript } from "../apps/bot/src/services/cleanup-text.service";
import {
  createReportKeyboard,
  createReportMenuButton,
  createReportReplyKeyboard,
  createVoiceSaveFailureMessage,
  createVoiceSaleReviewKeyboard,
  createVoiceSaleUserMessage
} from "../apps/bot/src/services/telegram.service";
import { buildExcludedSaleItemPatch, buildManualSaleItemPatch, buildSalesReport } from "../packages/shared/utils/date-range";
import type { SaleItem } from "../packages/shared/types";
import {
  requireMatchingShop,
  requireTelegramInitDataHeader,
  verifyTelegramInitData
} from "../apps/web/src/lib/telegram-init-data";

function item(overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    id: "item-1",
    sale_id: "sale-1",
    product_name: "Чипсы Принглс",
    quantity: 20,
    unit: "шт",
    price: 300,
    total: 6000,
    confidence: 1,
    status: "processed",
    created_at: "2026-06-20T10:00:00.000Z",
    ...overrides
  };
}

function signedInitData(botToken: string, telegramId: number, authDate: number) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "query-1",
    user: JSON.stringify({ id: telegramId, first_name: "Owner" })
  });
  const check = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

function createReviewDecisionClient() {
  const state = {
    sales: [{
      id: "sale-1",
      shop_id: "shop-1",
      seller_id: "seller-1",
      voice_record_id: "voice-1",
      status: "needs_review",
      total_amount: 0
    }],
    voice_records: [{
      id: "voice-1",
      shop_id: "shop-1",
      seller_id: "seller-1",
      status: "needs_review"
    }],
    sale_items: [{
      id: "item-1",
      sale_id: "sale-1",
      product_name: "Сникерс",
      quantity: 5,
      unit: "шт",
      price: 100,
      total: 500,
      confidence: 0.62,
      status: "needs_review",
      deleted_at: null
    }]
  };

  const client = {
    from: vi.fn((tableName: keyof typeof state) => {
      const filters: Array<{ field: string; value: unknown; type: "eq" | "is" }> = [];
      let patch: Record<string, unknown> | null = null;
      const rows = state[tableName] as Array<Record<string, unknown>>;
      const applyFilters = () => rows.filter((row) =>
        filters.every((filter) => {
          if (filter.type === "is") return row[filter.field] === filter.value;
          return row[filter.field] === filter.value;
        })
      );
      const payload = () => {
        if (patch) {
          const matches = applyFilters();
          for (const row of matches) Object.assign(row, patch);
          return { data: matches.length === 1 ? matches[0] : matches, error: null };
        }
        return { data: applyFilters(), error: null };
      };
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((field: string, value: unknown) => {
          filters.push({ field, value, type: "eq" });
          return query;
        }),
        is: vi.fn((field: string, value: unknown) => {
          filters.push({ field, value, type: "is" });
          return query;
        }),
        update: vi.fn((value: Record<string, unknown>) => {
          patch = value;
          return query;
        }),
        maybeSingle: vi.fn(async () => {
          const matches = applyFilters();
          return { data: matches[0] ?? null, error: null };
        }),
        single: vi.fn(async () => {
          const result = payload();
          const data = Array.isArray(result.data) ? result.data[0] : result.data;
          return { data: data ?? null, error: data ? null : { message: "not found" } };
        }),
        then: (resolve: (value: { data: unknown; error: null }) => unknown, reject: (reason?: unknown) => unknown) =>
          Promise.resolve(payload()).then(resolve, reject)
      };
      return query;
    })
  };

  return { client, state };
}

describe("sales flow stabilization", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("1. Voice sale saves with correct shop_id", () => {
    const payload = buildVoiceSaleRpcPayload({
      seller: { id: "seller-1", shopId: "shop-1" },
      telegramMessageId: "42",
      audioPath: "shop-1/voice.ogg",
      audioUrl: null,
      rawText: "Чипсы Принглс 20 штук по 300 рублей",
      parsedSale: {
        items: [],
        raw_text: "Чипсы Принглс 20 штук по 300 рублей",
        cleaned_text: "Чипсы Принглс — 20 штук по 300 рублей.",
        needs_review: false
      },
      parserJson: null,
      errorMessage: null,
      saleStatus: "processed",
      totalAmount: 6000,
      resolvedItems: [{
        product_id: null,
        product_name: "Чипсы Принглс",
        quantity: 20,
        unit: "шт",
        price: 300,
        total: 6000,
        confidence: 1,
        status: "processed"
      }]
    });

    expect(payload.p_shop_id).toBe("shop-1");
    expect(payload.p_seller_id).toBe("seller-1");
    expect(payload.p_items).toHaveLength(1);
  });

  it("2. Owner sees only own shop sales", () => {
    expect(requireMatchingShop("shop-1", "shop-1")).toBe("shop-1");
    expect(() => requireMatchingShop("shop-1", "shop-2")).toThrow();
  });

  it("3. Report ignores deleted_at items", () => {
    expect(buildSalesReport([item({ deleted_at: new Date().toISOString(), status: "excluded" })]).totalRevenue).toBe(0);
  });

  it("4. Report ignores needs_review and needs_price", () => {
    const report = buildSalesReport([
      item({ id: "review", status: "needs_review" }),
      item({ id: "price", status: "needs_price", price: null, total: null })
    ]);
    expect(report.totalRevenue).toBe(0);
    expect(report.reviewItems).toHaveLength(2);
  });

  it("5. Processed items appear in report", () => {
    expect(buildSalesReport([item()]).totalRevenue).toBe(6000);
  });

  it("6. updateSaleItem recalculates total", () => {
    expect(buildManualSaleItemPatch({ productName: "Чипсы Принглс", quantity: 20, price: 300 })).toMatchObject({
      total: 6000,
      status: "processed",
      confidence: 1
    });
  });

  it("7. excludeSaleItem sets deleted_at and removes item from report", () => {
    const patch = buildExcludedSaleItemPatch("processed", "2026-06-20T11:00:00.000Z");
    expect(patch).toMatchObject({ status: "excluded", deleted_reason: "excluded_by_owner" });
    expect(buildSalesReport([item(patch)]).totalRevenue).toBe(0);
  });

  it("8. Unknown seller does not save sale", () => {
    expect(() => resolveSellerAccess(null, false)).toThrow(SellerAccessError);
  });

  it("9. Invalid Telegram initData denies access", () => {
    expect(() => verifyTelegramInitData("auth_date=1&user=%7B%22id%22%3A1%7D&hash=00", "token")).toThrow();
  });

  it("10. DEMO_MODE behavior is explicit and tested", () => {
    expect(resolveSellerAccess(null, true)).toBeNull();
    expect(() => resolveSellerAccess(null, false)).toThrow();
  });

  it("accepts valid, fresh Telegram initData", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const initData = signedInitData("123456:secret", 777, Math.floor(now.getTime() / 1000));
    expect(verifyTelegramInitData(initData, "123456:secret", { now }).user.id).toBe(777);
  });

  it("uses a Telegram Web App button for the report", () => {
    const keyboard = createReportKeyboard("https://voice-sales.example.com");
    const button = keyboard.reply_markup.inline_keyboard[0]?.[0];

    expect(button).toMatchObject({
      text: "Открыть отчёт",
      web_app: { url: "https://voice-sales.example.com" }
    });
    expect(button).not.toHaveProperty("url");
    expect(keyboard.reply_markup.inline_keyboard).toHaveLength(1);
  });

  it("shows Telegram diagnostics only behind DEBUG_TELEGRAM_WEBAPP", () => {
    const keyboard = createReportKeyboard("https://voice-sales.example.com", true);

    expect(keyboard.reply_markup.inline_keyboard[1]?.[0]).toMatchObject({
      text: "Диагностика Telegram",
      web_app: { url: "https://voice-sales.example.com/debug-telegram" }
    });
  });

  it("uses a Telegram Web App reply button for persistent access", () => {
    const keyboard = createReportReplyKeyboard("https://voice-sales.example.com");
    const button = keyboard.reply_markup.keyboard[0]?.[0];

    expect(button).toMatchObject({
      text: "Открыть отчёт",
      web_app: { url: "https://voice-sales.example.com" }
    });
    expect(button).not.toHaveProperty("url");
  });

  it("uses only short confirm and cancel callback buttons for a review sale", () => {
    const keyboard = createVoiceSaleReviewKeyboard(
      "550e8400-e29b-41d4-a716-446655440000",
      "https://voice-sales.example.com"
    );
    const buttons = keyboard.reply_markup.inline_keyboard[0];

    expect(keyboard.reply_markup.inline_keyboard).toHaveLength(1);
    expect(buttons).toHaveLength(2);
    expect(buttons?.[0]).toMatchObject({
      text: "✅ Подтвердить",
      callback_data: "confirm:550e8400-e29b-41d4-a716-446655440000"
    });
    expect(buttons?.[1]).toMatchObject({
      text: "❌ Отмена",
      callback_data: "cancel:550e8400-e29b-41d4-a716-446655440000"
    });
  });

  it("confirms a review sale and includes valid items in revenue", async () => {
    const { client, state } = createReviewDecisionClient();
    const seller = { id: "seller-1", shopId: "shop-1" };

    const result = await confirmVoiceSaleWithClient(client as never, seller, "sale-1");
    const repeat = await confirmVoiceSaleWithClient(client as never, seller, "sale-1");
    const report = buildSalesReport(state.sale_items.map((row) => ({
      ...row,
      created_at: "2026-06-30T09:00:00.000Z"
    })) as SaleItem[]);

    expect(result).toMatchObject({
      ok: true,
      status: "processed",
      message: "✅ Запись подтверждена и добавлена в отчёт."
    });
    expect(repeat).toMatchObject({ ok: true, status: "unchanged" });
    expect(state.sales[0]).toMatchObject({ status: "processed", total_amount: 500 });
    expect(state.voice_records[0]).toMatchObject({ status: "processed" });
    expect(state.sale_items[0]).toMatchObject({ status: "processed", confidence: 1 });
    expect(report.totalRevenue).toBe(500);
  });

  it("cancels a review sale with soft delete and zero revenue", async () => {
    const { client, state } = createReviewDecisionClient();
    const seller = { id: "seller-1", shopId: "shop-1" };

    const result = await cancelVoiceSaleWithClient(client as never, seller, "sale-1");
    const repeat = await cancelVoiceSaleWithClient(client as never, seller, "sale-1");
    const report = buildSalesReport(state.sale_items.map((row) => ({
      ...row,
      created_at: "2026-06-30T09:00:00.000Z"
    })) as SaleItem[]);

    expect(result).toMatchObject({
      ok: true,
      status: "cancelled",
      message: "❌ Запись отменена и не входит в отчёт."
    });
    expect(repeat).toMatchObject({ ok: true, status: "unchanged" });
    expect(state.sales[0]).toMatchObject({ status: "cancelled", total_amount: 0 });
    expect(state.voice_records[0]).toMatchObject({ status: "cancelled" });
    expect(state.sale_items[0]).toMatchObject({
      status: "excluded",
      deleted_reason: "excluded_by_owner",
      deleted_previous_status: "needs_review"
    });
    expect(state.sale_items[0].deleted_at).toBeTruthy();
    expect(report.totalRevenue).toBe(0);
  });

  it("does not let another seller shop confirm a review sale", async () => {
    const { client, state } = createReviewDecisionClient();
    const foreignSeller = { id: "seller-2", shopId: "shop-2" };

    const result = await confirmVoiceSaleWithClient(client as never, foreignSeller, "sale-1");

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      oldStatus: null,
      newStatus: null,
      message: "Запись не найдена."
    });
    expect(state.sales[0]).toMatchObject({ status: "needs_review", total_amount: 0 });
    expect(state.sale_items[0]).toMatchObject({ status: "needs_review", deleted_at: null });
  });

  it("does not use the old Telegram-only blocking message for missing initData", () => {
    expect(() => requireTelegramInitDataHeader(new Headers())).toThrow(
      "Telegram initData is missing."
    );
  });

  it("uses a Telegram Web App menu button for the persistent report action", () => {
    expect(createReportMenuButton("https://voice-sales.example.com")).toEqual({
      type: "web_app",
      text: "Открыть отчёт",
      web_app: { url: "https://voice-sales.example.com" }
    });
  });

  it("never shows raw pipeline statuses after a voice sale", () => {
    const normal = createVoiceSaleUserMessage("Сникерс, 4 штуки по 100 рублей", false);
    const warning = createVoiceSaleUserMessage("Сникерс", true);

    expect(normal).toContain("✅ Запись сохранена: Сникерс, 4 штуки по 100 рублей");
    expect(normal).not.toContain("Проверьте");
    expect(warning).toContain("⚠️ Запись сохранена, но нужно подтвердить товары и цены.");
    expect(warning).toContain("Распознано: Сникерс");
    for (const message of [normal, warning]) {
      expect(message).not.toMatch(/processed|needs_review|pending|failed/);
    }
  });

  it("creates a needs_review item when parsing produces no items", () => {
    const items = ensureReviewableSaleItems({
      items: [],
      raw_text: "неразборчиво",
      cleaned_text: "Неразборчиво.",
      needs_review: true
    });

    expect(items).toEqual([expect.objectContaining({
      product_name: "Неразборчиво.",
      quantity: null,
      price: null,
      confidence: 0
    })]);
  });

  it("does not force complete recognized sale items into review", () => {
    const payload = buildVoiceSaleRpcPayload({
      seller: { id: "seller-1", shopId: "shop-1" },
      telegramMessageId: "43",
      audioPath: null,
      audioUrl: null,
      rawText: "Сникерс 4 штуки по 100 рублей",
      parsedSale: {
        items: [],
        raw_text: "Сникерс 4 штуки по 100 рублей",
        cleaned_text: "Сникерс, 4 штуки по 100 рублей.",
        needs_review: false
      },
      parserJson: null,
      errorMessage: null,
      saleStatus: "processed",
      totalAmount: 400,
      resolvedItems: [{
        product_id: null,
        product_name: "Сникерс",
        quantity: 4,
        unit: "шт",
        price: 100,
        total: 400,
        confidence: 0.98,
        status: "processed"
      }]
    });

    expect(payload.p_status).toBe("processed");
    expect(payload.p_items).toEqual([expect.objectContaining({ status: "processed", total: 400 })]);
  });

  it("creates sale and sale_items and verifies them before reporting success", async () => {
    const persistedSales: Array<Record<string, unknown>> = [];
    const persistedItems: Array<Record<string, unknown>> = [];
    const payload = buildVoiceSaleRpcPayload({
      seller: { id: "seller-1", shopId: "shop-1" },
      telegramMessageId: "44",
      audioPath: null,
      audioUrl: null,
      rawText: "Сникерс 5 штук по 100 рублей",
      parsedSale: {
        items: [],
        raw_text: "Сникерс 5 штук по 100 рублей",
        cleaned_text: "Сникерс, 5 штук по 100 рублей.",
        needs_review: false
      },
      parserJson: null,
      errorMessage: null,
      saleStatus: "processed",
      totalAmount: 500,
      resolvedItems: [{
        product_id: null,
        product_name: "Сникерс",
        quantity: 5,
        unit: "шт",
        price: 100,
        total: 500,
        confidence: 1,
        status: "processed"
      }]
    });
    const client = {
      rpc: vi.fn(async () => {
        persistedSales.push({
          id: "sale-1",
          shop_id: payload.p_shop_id,
          seller_id: payload.p_seller_id,
          voice_record_id: "voice-1"
        });
        persistedItems.push(...payload.p_items.map((saleItem, index) => ({
          id: `item-${index + 1}`,
          sale_id: "sale-1",
          ...saleItem
        })));
        return { data: [{ sale_id: "sale-1", voice_record_id: "voice-1" }], error: null };
      }),
      from: vi.fn((table: string) => {
        if (table === "sales") {
          const query = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            single: vi.fn(async () => ({ data: persistedSales[0], error: null }))
          };
          return query;
        }

        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(async () => ({
            data: persistedItems.map(({ id }) => ({ id })),
            count: persistedItems.length,
            error: null
          }))
        };
        return query;
      })
    };

    const result = await persistVoiceSale(client as never, payload);
    const report = buildSalesReport(persistedItems.map((persistedItem) => ({
      ...persistedItem,
      created_at: "2026-06-24T10:00:00.000Z"
    })) as SaleItem[]);

    expect(result).toEqual({
      sale_id: "sale-1",
      voice_record_id: "voice-1",
      item_count: 1
    });
    expect(persistedSales).toHaveLength(1);
    expect(persistedItems).toHaveLength(1);
    expect(report.totalRevenue).toBe(500);
  });

  it("rejects false success when no sale_items can be read back", async () => {
    const payload = buildVoiceSaleRpcPayload({
      seller: { id: "seller-1", shopId: "shop-1" },
      telegramMessageId: "45",
      audioPath: null,
      audioUrl: null,
      rawText: "Сникерс 5 штук по 100 рублей",
      parsedSale: {
        items: [],
        raw_text: "Сникерс 5 штук по 100 рублей",
        cleaned_text: "Сникерс, 5 штук по 100 рублей.",
        needs_review: false
      },
      parserJson: null,
      errorMessage: null,
      saleStatus: "processed",
      totalAmount: 500,
      resolvedItems: [{
        product_id: null,
        product_name: "Сникерс",
        quantity: 5,
        unit: "шт",
        price: 100,
        total: 500,
        confidence: 1,
        status: "processed"
      }]
    });
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ sale_id: "sale-1", voice_record_id: "voice-1" }],
        error: null
      }),
      from: vi.fn((table: string) => {
        if (table === "sales") {
          const query = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            single: vi.fn().mockResolvedValue({ data: { id: "sale-1" }, error: null })
          };
          return query;
        }

        const query = {
          select: vi.fn(() => query),
          eq: vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
        };
        return query;
      })
    };

    await expect(persistVoiceSale(client as never, payload)).rejects.toThrow(
      "Saved sale item count mismatch"
    );
    expect(createVoiceSaveFailureMessage()).toBe("⚠️ Не удалось сохранить запись. Попробуйте ещё раз.");
  });

  it("turns invalid LLM JSON into manual review instead of failing the voice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not-json" } }] })
    }));

    const result = await parseSaleTranscript({
      TELEGRAM_BOT_TOKEN: "token",
      NEXT_PUBLIC_APP_URL: "https://voice-sales.example.com",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      SUPABASE_STORAGE_BUCKET: "voice-records",
      STT_API_KEY: "stt",
      STT_API_URL: "https://stt.example.com",
      STT_MODEL: "stt-model",
      LLM_API_KEY: "llm",
      LLM_API_URL: "https://llm.example.com",
      LLM_MODEL: "llm-model",
      DEMO_MODE: false,
      DEFAULT_SHOP_NAME: "Демо-магазин"
    }, "хлеб одна штука", "Хлеб, одна штука.");

    expect(result.parsedSale.needs_review).toBe(true);
    expect(result.parsedSale.items).toEqual([]);
    expect(result.errorMessage).toContain("LLM parser fallback");
  });
});
