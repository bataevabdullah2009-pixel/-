import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeTelegramAuthError } from "../apps/web/src/lib/telegram-auth-errors";
import {
  buildTelegramDataCheckString,
  requireMatchingShop,
  requireTelegramInitDataHeader,
  TelegramInitDataError,
  verifyTelegramInitData
} from "../apps/web/src/lib/telegram-init-data";
import {
  resolveTelegramPrincipal,
  type TelegramPrincipalLookup
} from "../apps/web/src/lib/telegram-principal";
import { getReportFilters } from "../apps/web/src/features/records/records.utils";
import {
  apiFetch,
  getAppAuthContext,
  getTelegramInitData,
  initializeTelegramWebApp,
  waitForTelegramWebApp
} from "../apps/web/src/lib/telegram-api";
import { scopeReportRows } from "../apps/web/src/features/records/report-scope";
import { buildSalesReport } from "../packages/shared/utils/date-range";
import {
  buildTelegramWebhookUrl,
  parseTelegramPublicUrl
} from "../packages/shared/utils/telegram-url";

function signedInitData(botToken: string, telegramId: number, authDate: number) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "query-1",
    signature: "telegram-ed25519-signature",
    user: JSON.stringify({ id: telegramId, first_name: "Owner" })
  });
  const dataCheckString = buildTelegramDataCheckString(params);
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(dataCheckString).digest("hex"));
  return params.toString();
}

const telegramFixtureInitData = [
  "user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vladislav+%2B+-+%3F+%2F%22%2C%22last_name%22%3A%22Kibenko%22%2C%22username%22%3A%22vdkfrost%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%2F%2Ft.me%2Fi%2Fuserpic%2F320%2Fexample.svg%22%7D",
  "chat_instance=8134722200314281151",
  "chat_type=private",
  "auth_date=1733509682",
  "signature=TYJxVcisqbWjtodPepiJ6ghziUL94-KNpG8Pau-X7oNNLNBM72APCpi_RKiUlBvcqo5L-LAxIc3dnTzcZX_PDg",
  "hash=fd58ee89d5e4646f39a45a52b77b8a9c9157dd2c4e2813d489a01d787a05b516"
].join("&");
const telegramFixtureBotToken = "123456:telegram-fixture-secret";

function lookup(overrides: Partial<TelegramPrincipalLookup> = {}): TelegramPrincipalLookup {
  return {
    findOwner: vi.fn().mockResolvedValue(null),
    findSeller: vi.fn().mockResolvedValue({
      id: "seller-1",
      shop_id: "shop-1",
      telegram_id: 777,
      is_active: true
    }),
    shopExists: vi.fn().mockResolvedValue(true),
    ...overrides
  };
}

describe("Telegram Mini App authentication", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("WebApp exposes initData and calls ready/expand", () => {
    const ready = vi.fn();
    const expand = vi.fn();
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          initData: "signed-data",
          initDataUnsafe: { user: { id: 777 } },
          platform: "android",
          version: "9.0",
          ready,
          expand
        }
      }
    });

    initializeTelegramWebApp();

    expect(getTelegramInitData()).toBe("signed-data");
    expect(getAppAuthContext().telegramUserId).toBe(777);
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
  });

  it("apiFetch sends telegram initData and app mode when Telegram provides it", async () => {
    vi.stubGlobal("window", { Telegram: { WebApp: { initData: "signed-data" } } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/report", { headers: { accept: "application/json" } });

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("x-app-mode")).toBe("telegram");
    expect(headers.get("x-telegram-init-data")).toBe("signed-data");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("apiFetch uses fallback mode without blocking when initData is absent", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(getAppAuthContext()).toMatchObject({
      mode: "fallback",
      hasTelegram: false,
      hasWebApp: false
    });

    await apiFetch("/api/report");

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("x-app-mode")).toBe("fallback");
    expect(headers.has("x-telegram-init-data")).toBe(false);
  });

  it("API without initData maps to a non-blocking 401 when fallback is disabled", () => {
    let error: unknown;
    try {
      requireTelegramInitDataHeader(new Headers());
    } catch (caught) {
      error = caught;
    }

    expect(describeTelegramAuthError(error)).toEqual({
      status: 401,
      code: "TELEGRAM_INIT_DATA_MISSING",
      message: "Telegram initData отсутствует, а fallback mode выключен."
    });
  });

  it("API with invalid initData maps to 401 TELEGRAM_INIT_DATA_INVALID", () => {
    let error: unknown;
    try {
      verifyTelegramInitData("auth_date=1&user=%7B%22id%22%3A1%7D&hash=00", "token");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(TelegramInitDataError);
    expect(error).toMatchObject({ reason: "invalid_hash" });
    expect(describeTelegramAuthError(error)).toMatchObject({
      status: 401,
      code: "TELEGRAM_INIT_DATA_INVALID"
    });
  });

  it("reports expired auth_date separately from invalid hash", () => {
    const token = "123456:secret";
    const signedAt = new Date("2026-06-20T12:00:00.000Z");
    const initData = signedInitData(token, 777, Math.floor(signedAt.getTime() / 1000));

    expect(() => verifyTelegramInitData(initData, token, {
      now: new Date("2026-06-22T12:00:00.000Z")
    })).toThrow(expect.objectContaining({ reason: "expired_auth_date" }));
  });

  it("reports a missing bot token without using the webhook secret", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const initData = signedInitData("123456:secret", 777, Math.floor(now.getTime() / 1000));

    expect(() => verifyTelegramInitData(initData, "", { now }))
      .toThrow(expect.objectContaining({ reason: "missing_bot_token" }));
  });

  it("valid initData returns a session for the linked seller", async () => {
    const token = "123456:secret";
    const now = new Date("2026-06-20T12:00:00.000Z");
    const initData = signedInitData(token, 777, Math.floor(now.getTime() / 1000));
    const { user } = verifyTelegramInitData(initData, token, { now });

    const principal = await resolveTelegramPrincipal(user.id, lookup());

    expect(principal).toMatchObject({
      principalId: "seller-1",
      telegramId: 777,
      shopId: "shop-1",
      role: "seller"
    });
  });

  it("accepts a fixed Telegram Mini App fixture containing signature and user photo_url", () => {
    const result = verifyTelegramInitData(
      telegramFixtureInitData,
      telegramFixtureBotToken,
      { now: new Date(1733509682 * 1000) }
    );

    expect(result.user).toMatchObject({
      id: 279058397,
      first_name: "Vladislav + - ? /",
      username: "vdkfrost"
    });
  });

  it("rejects a tampered fixed Telegram Mini App fixture with 401 mapping", () => {
    let error: unknown;
    try {
      verifyTelegramInitData(
        telegramFixtureInitData.replace("chat_type=private", "chat_type=group"),
        telegramFixtureBotToken,
        { now: new Date(1733509682 * 1000) }
      );
    } catch (caught) {
      error = caught;
    }

    expect(describeTelegramAuthError(error)).toMatchObject({
      status: 401,
      code: "TELEGRAM_INIT_DATA_INVALID"
    });
  });

  it("creates and links a seller from an existing owner shop", async () => {
    const createSellerForOwner = vi.fn().mockResolvedValue({
      id: "seller-created",
      shop_id: "shop-1",
      telegram_id: 777,
      is_active: true
    });
    const principal = await resolveTelegramPrincipal(777, lookup({
      findSeller: vi.fn().mockResolvedValue(null),
      findOwner: vi.fn().mockResolvedValue({
        id: "owner-1",
        shop_id: "shop-1",
        telegram_id: 777,
        is_active: true
      }),
      createSellerForOwner
    }));

    expect(createSellerForOwner).toHaveBeenCalledWith({
      telegramId: 777,
      shopId: "shop-1"
    });
    expect(principal).toMatchObject({
      principalId: "seller-created",
      shopId: "shop-1",
      role: "seller"
    });
  });

  it("seller receives only the shop_id stored in the database", async () => {
    const principal = await resolveTelegramPrincipal(777, lookup());
    expect(principal.shopId).toBe("shop-1");
    expect(requireMatchingShop(principal.shopId, "shop-1")).toBe("shop-1");
    expect(() => requireMatchingShop(principal.shopId, "shop-2")).toThrow();
  });

  it("prefers the seller shop used by the bot when the same Telegram user is also an owner", async () => {
    const principal = await resolveTelegramPrincipal(777, lookup({
      findOwner: vi.fn().mockResolvedValue({
        id: "owner-1",
        shop_id: "shop-2",
        telegram_id: 777,
        is_active: true
      })
    }));

    expect(principal).toMatchObject({
      principalId: "seller-1",
      shopId: "shop-1",
      role: "seller"
    });
  });

  it("waits for Telegram initData instead of locking into fallback mode too early", async () => {
    vi.useFakeTimers();
    const webApp = { initData: "" };
    vi.stubGlobal("window", { Telegram: { WebApp: webApp } });

    const pending = waitForTelegramWebApp(500);
    setTimeout(() => {
      webApp.initData = "signed-data";
    }, 100);
    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toBe(webApp);
  });

  it("inactive seller is denied", async () => {
    await expect(resolveTelegramPrincipal(777, lookup({
      findSeller: vi.fn().mockResolvedValue({
        id: "seller-1",
        shop_id: "shop-1",
        telegram_id: 777,
        is_active: false
      })
    }))).rejects.toMatchObject({ code: "SELLER_INACTIVE" });
  });

  it("missing shop is denied with SHOP_NOT_FOUND", async () => {
    await expect(resolveTelegramPrincipal(777, lookup({
      shopExists: vi.fn().mockResolvedValue(false)
    }))).rejects.toMatchObject({ code: "SHOP_NOT_FOUND" });
  });

  it("report filters ignore client shop_id", () => {
    const filters = getReportFilters({
      period: "today",
      date: "2026-06-20",
      shop_id: "attacker-shop"
    });

    expect(filters).toEqual({ period: "today", date: "2026-06-20" });
    expect(filters).not.toHaveProperty("shop_id");
  });

  it("report reads sale_items only through sales from the resolved shop", () => {
    const scoped = scopeReportRows(
      [{
        id: "sale-1",
        shop_id: "shop-1",
        created_at: "2026-06-24T10:00:00.000Z"
      }],
      [
        {
          id: "item-1",
          sale_id: "sale-1",
          product_name: "Хлеб",
          quantity: 2,
          unit: "шт",
          price: 50,
          total: 100,
          confidence: 1,
          status: "processed"
        },
        {
          id: "item-other-shop",
          sale_id: "sale-2",
          product_name: "Чужой товар",
          quantity: 100,
          unit: "шт",
          price: 100,
          total: 10000,
          confidence: 1,
          status: "processed"
        }
      ],
      "shop-1"
    );

    expect(scoped.salesCount).toBe(1);
    expect(scoped.saleItemsCount).toBe(1);
    expect(buildSalesReport(scoped.items)).toMatchObject({
      totalQuantity: 2,
      totalRevenue: 100
    });
  });

  it("does not return a zero report when scoped sales and sale_items exist", () => {
    const scoped = scopeReportRows(
      [{
        id: "sale-1",
        shop_id: "shop-1",
        created_at: "2026-06-24T10:00:00.000Z"
      }],
      [{
        id: "item-1",
        sale_id: "sale-1",
        product_name: "Сникерс",
        quantity: 5,
        unit: "шт",
        price: 100,
        total: 500,
        confidence: 1,
        status: "processed"
      }],
      "shop-1"
    );

    expect(buildSalesReport(scoped.items).totalRevenue).toBe(500);
  });

  it("rejects report rows from a shop different from the resolved seller shop", () => {
    expect(() => scopeReportRows(
      [{
        id: "sale-2",
        shop_id: "shop-2",
        created_at: "2026-06-24T10:00:00.000Z"
      }],
      [],
      "shop-1"
    )).toThrow("Report shop scope mismatch");
  });

  it("accepts only a canonical HTTPS Web App URL", () => {
    expect(parseTelegramPublicUrl(
      "https://web-n3ji.vercel.app",
      "NEXT_PUBLIC_APP_URL"
    ).hostname).toBe("web-n3ji.vercel.app");

    for (const invalidUrl of [
      "",
      "http://web-n3ji.vercel.app",
      "https://localhost:3000",
      "https://voice-sales.ngrok.app",
      "https://web-n3ji-5jo7bcdzx-team.vercel.app",
      "https://web-n3ji-git-main-team.vercel.app"
    ]) {
      expect(() => parseTelegramPublicUrl(invalidUrl, "NEXT_PUBLIC_APP_URL")).toThrow();
    }
  });

  it("builds one expected webhook URL from the Web App configuration", () => {
    expect(buildTelegramWebhookUrl("https://web-n3ji.vercel.app"))
      .toBe("https://web-n3ji.vercel.app/api/telegram/webhook");
    expect(buildTelegramWebhookUrl(
      "https://web-n3ji.vercel.app",
      "https://hooks.example.com/api/telegram/webhook"
    )).toBe("https://hooks.example.com/api/telegram/webhook");
  });
});
