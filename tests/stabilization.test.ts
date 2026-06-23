import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVoiceSaleRpcPayload,
  ensureReviewableSaleItems,
  resolveSellerAccess,
  SellerAccessError
} from "../apps/bot/src/services/records.service";
import { parseSaleTranscript } from "../apps/bot/src/services/cleanup-text.service";
import {
  createReportKeyboard,
  createReportMenuButton,
  createReportReplyKeyboard,
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
    expect(warning).toContain("⚠️ Запись сохранена, но нужно проверить товары и цены.");
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
