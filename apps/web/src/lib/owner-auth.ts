import "server-only";

import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "./supabase";
import {
  readTelegramInitDataHeader,
  requireMatchingShop,
  TelegramInitDataError,
  verifyTelegramInitData
} from "./telegram-init-data";
import {
  resolveTelegramPrincipal,
  TelegramPrincipalError,
  type TelegramPrincipalRecord
} from "./telegram-principal";
import { getTelegramAuthErrorReason } from "./telegram-auth-errors";

export const TELEGRAM_INIT_DATA_COOKIE = "voice_sales_telegram_init_data";

export type OwnerContext = {
  sellerId: string | null;
  shopId: string;
  telegramId: number;
  demo: boolean;
  mode: "telegram" | "fallback" | "demo";
};

export class OwnerAccessError extends Error {
  constructor(
    public readonly code:
      | "TELEGRAM_INIT_DATA_MISSING"
      | "TELEGRAM_INIT_DATA_INVALID"
      | "SELLER_NOT_LINKED"
      | "SELLER_INACTIVE"
      | "SHOP_NOT_FOUND"
      | "AUTH_MISCONFIGURED",
    message: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = "OwnerAccessError";
  }
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function isWebAppFallbackAllowed() {
  return process.env.ALLOW_WEBAPP_FALLBACK === "true";
}

function readRequiredFallbackEnv() {
  const defaultShopId = process.env.DEFAULT_SHOP_ID?.trim() ?? "";
  const defaultSellerId = process.env.DEFAULT_SELLER_ID?.trim() ?? "";

  console.info("webapp auth", {
    mode: "fallback",
    hasDefaultShop: Boolean(defaultShopId),
    hasDefaultSeller: Boolean(defaultSellerId)
  });

  if (!defaultShopId || !defaultSellerId) {
    throw new OwnerAccessError(
      "AUTH_MISCONFIGURED",
      "Web App fallback mode is enabled but DEFAULT_SHOP_ID or DEFAULT_SELLER_ID is missing."
    );
  }

  return { defaultShopId, defaultSellerId };
}

async function resolveFallbackContext(): Promise<OwnerContext> {
  const { defaultShopId, defaultSellerId } = readRequiredFallbackEnv();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    throw new OwnerAccessError("AUTH_MISCONFIGURED", "Supabase admin client is not configured.");
  }

  const { data: seller, error } = await admin
    .from("sellers")
    .select("id, shop_id, telegram_id, is_active")
    .eq("id", defaultSellerId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!seller) {
    throw new OwnerAccessError("SELLER_NOT_LINKED", "Fallback seller is not configured.");
  }
  if (!seller.is_active) {
    throw new OwnerAccessError("SELLER_INACTIVE", "Fallback seller is inactive.");
  }

  try {
    requireMatchingShop(defaultShopId, String(seller.shop_id));
  } catch {
    throw new OwnerAccessError(
      "AUTH_MISCONFIGURED",
      "DEFAULT_SHOP_ID does not match DEFAULT_SELLER_ID shop_id."
    );
  }

  return {
    sellerId: String(seller.id),
    shopId: String(seller.shop_id),
    telegramId: Number(seller.telegram_id),
    demo: false,
    mode: "fallback"
  };
}

function isMissingOwnersTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205";
}

async function resolveTelegramSellerContext(
  telegramId: number,
  sellerName: string | null
): Promise<OwnerContext> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    throw new OwnerAccessError("AUTH_MISCONFIGURED", "Supabase admin client is not configured.");
  }

  try {
    const principal = await resolveTelegramPrincipal(telegramId, {
      async findOwner(id) {
        const { data, error } = await admin
          .from("owners")
          .select("id, shop_id, telegram_id, is_active")
          .eq("telegram_id", id)
          .maybeSingle();
        if (error && !isMissingOwnersTable(error)) throw error;
        return (data as TelegramPrincipalRecord | null) ?? null;
      },
      async findSeller(id) {
        const { data, error } = await admin
          .from("sellers")
          .select("id, shop_id, telegram_id, is_active")
          .eq("telegram_id", id)
          .maybeSingle();
        if (error) throw error;
        return (data as TelegramPrincipalRecord | null) ?? null;
      },
      async shopExists(shopId) {
        const { data, error } = await admin
          .from("shops")
          .select("id")
          .eq("id", shopId)
          .maybeSingle();
        if (error) throw error;
        return Boolean(data);
      },
      async createSellerForOwner({ shopId }) {
        const { data, error } = await admin
          .from("sellers")
          .insert({
            shop_id: shopId,
            telegram_id: telegramId,
            name: sellerName
          })
          .select("id, shop_id, telegram_id, is_active")
          .single();

        if (!error) {
          return data as TelegramPrincipalRecord;
        }

        if (error.code === "23505") {
          const { data: existing, error: existingError } = await admin
            .from("sellers")
            .select("id, shop_id, telegram_id, is_active")
            .eq("telegram_id", telegramId)
            .single();
          if (existingError) throw existingError;
          return existing as TelegramPrincipalRecord;
        }

        throw error;
      }
    });

    return {
      sellerId: principal.role === "seller" ? principal.principalId : null,
      shopId: principal.shopId,
      telegramId: principal.telegramId,
      demo: false,
      mode: "telegram"
    };
  } catch (error) {
    if (error instanceof TelegramPrincipalError) {
      throw new OwnerAccessError(error.code, error.message);
    }
    throw error;
  }
}

async function requireDemoOwner(): Promise<OwnerContext> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { sellerId: "demo-seller", shopId: "demo-shop", telegramId: 0, demo: true, mode: "demo" };
  }

  const configuredTelegramId = Number(process.env.DEMO_OWNER_TELEGRAM_ID);
  if (Number.isSafeInteger(configuredTelegramId) && configuredTelegramId > 0) {
    const owner = await resolveTelegramSellerContext(configuredTelegramId, null);
    return { ...owner, demo: true, mode: "demo" };
  }

  const shopName = process.env.DEFAULT_SHOP_NAME || "Демо-магазин";
  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("id")
    .eq("name", shopName)
    .maybeSingle();

  if (shopError) throw shopError;
  if (!shop) {
    throw new OwnerAccessError("SHOP_NOT_FOUND", "Demo shop is not configured.");
  }

  const { data: owner, error: ownerError } = await admin
    .from("owners")
    .select("id, shop_id, telegram_id")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (ownerError) throw ownerError;
  if (!owner) {
    throw new OwnerAccessError("SELLER_NOT_LINKED", "Demo owner is not configured.");
  }

  return {
    sellerId: null,
    shopId: String(owner.shop_id),
    telegramId: Number(owner.telegram_id),
    demo: true,
    mode: "demo"
  };
}

export async function authenticateOwner(initData: string): Promise<OwnerContext> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let telegramUserId: number | null = null;
  let sellerId: string | null = null;
  let shopId: string | null = null;
  let errorReason: string | null = null;

  try {
    if (!botToken) {
      throw new OwnerAccessError(
        "AUTH_MISCONFIGURED",
        "Telegram bot token is not configured.",
        "missing_bot_token"
      );
    }

    const { user } = verifyTelegramInitData(initData, botToken);
    telegramUserId = user.id;
    const sellerName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || null;
    const owner = await resolveTelegramSellerContext(user.id, sellerName);
    sellerId = owner.sellerId;
    shopId = owner.shopId;
    return owner;
  } catch (error) {
    errorReason = getTelegramAuthErrorReason(error);
    if (error instanceof OwnerAccessError) throw error;
    if (error instanceof TelegramInitDataError) {
      throw new OwnerAccessError(error.code, error.message, error.reason);
    }
    throw error;
  } finally {
    console.info("webapp auth", {
      telegramUserId,
      sellerId,
      shopId,
      mode: "telegram",
      errorReason
    });
  }
}

export async function resolveRequestContext(request?: Request): Promise<OwnerContext> {
  const headerInitData = request ? readTelegramInitDataHeader(request.headers) : "";
  if (headerInitData) {
    return authenticateOwner(headerInitData);
  }

  if (request && isWebAppFallbackAllowed()) {
    return await resolveFallbackContext();
  }

  const cookieStore = await cookies();
  const initData = cookieStore.get(TELEGRAM_INIT_DATA_COOKIE)?.value;

  if (initData) {
    return authenticateOwner(initData);
  }

  if (isWebAppFallbackAllowed()) {
    return await resolveFallbackContext();
  }

  if (isDemoMode()) {
    return requireDemoOwner();
  }

  throw new OwnerAccessError(
    "TELEGRAM_INIT_DATA_MISSING",
    "Telegram initData is missing and Web App fallback mode is disabled."
  );
}

export const requireOwner = resolveRequestContext;

export function requireShopAccess(owner: OwnerContext, shopId: string) {
  try {
    return requireMatchingShop(owner.shopId, shopId);
  } catch {
    throw new OwnerAccessError("SELLER_NOT_LINKED", "Owner cannot access this shop.");
  }
}
