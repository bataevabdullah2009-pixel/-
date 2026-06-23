import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeTelegramAuthError } from "../apps/web/src/lib/telegram-auth-errors";
import {
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
  initializeTelegramWebApp
} from "../apps/web/src/lib/telegram-api";
import {
  buildTelegramWebhookUrl,
  parseTelegramPublicUrl
} from "../packages/shared/utils/telegram-url";

function signedInitData(botToken: string, telegramId: number, authDate: number) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "query-1",
    user: JSON.stringify({ id: telegramId, first_name: "Owner" })
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(dataCheckString).digest("hex"));
  return params.toString();
}

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
    expect(describeTelegramAuthError(error)).toMatchObject({
      status: 401,
      code: "TELEGRAM_INIT_DATA_INVALID"
    });
  });

  it("valid initData resolves the linked seller", async () => {
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

  it("seller receives only the shop_id stored in the database", async () => {
    const principal = await resolveTelegramPrincipal(777, lookup());
    expect(principal.shopId).toBe("shop-1");
    expect(requireMatchingShop(principal.shopId, "shop-1")).toBe("shop-1");
    expect(() => requireMatchingShop(principal.shopId, "shop-2")).toThrow();
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
