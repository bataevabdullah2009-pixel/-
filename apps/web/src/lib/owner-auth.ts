import "server-only";

import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "./supabase";
import { requireMatchingShop, TelegramInitDataError, verifyTelegramInitData } from "./telegram-init-data";

export const TELEGRAM_INIT_DATA_COOKIE = "voice_sales_telegram_init_data";

export type OwnerContext = {
  ownerId: string;
  shopId: string;
  telegramId: number;
  demo: boolean;
};

export class OwnerAccessError extends Error {
  constructor(
    public readonly code: "not_authenticated" | "not_authorized" | "misconfigured",
    message: string
  ) {
    super(message);
    this.name = "OwnerAccessError";
  }
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

async function findActiveOwnerByTelegramId(telegramId: number): Promise<OwnerContext> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    throw new OwnerAccessError("misconfigured", "Supabase admin client is not configured.");
  }

  const { data, error } = await admin
    .from("owners")
    .select("id, shop_id, telegram_id, is_active")
    .eq("telegram_id", telegramId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new OwnerAccessError("not_authorized", "Telegram user is not an active shop owner.");
  }

  return {
    ownerId: String(data.id),
    shopId: String(data.shop_id),
    telegramId: Number(data.telegram_id),
    demo: false
  };
}

async function requireDemoOwner(): Promise<OwnerContext> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { ownerId: "demo-owner", shopId: "demo-shop", telegramId: 0, demo: true };
  }

  const configuredTelegramId = Number(process.env.DEMO_OWNER_TELEGRAM_ID);
  if (Number.isSafeInteger(configuredTelegramId) && configuredTelegramId > 0) {
    const owner = await findActiveOwnerByTelegramId(configuredTelegramId);
    return { ...owner, demo: true };
  }

  const shopName = process.env.DEFAULT_SHOP_NAME || "Демо-магазин";
  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("id")
    .eq("name", shopName)
    .maybeSingle();

  if (shopError) throw shopError;
  if (!shop) {
    throw new OwnerAccessError("not_authorized", "Demo shop is not configured.");
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
    throw new OwnerAccessError("not_authorized", "Demo owner is not configured.");
  }

  return {
    ownerId: String(owner.id),
    shopId: String(owner.shop_id),
    telegramId: Number(owner.telegram_id),
    demo: true
  };
}

export async function authenticateOwner(initData: string): Promise<OwnerContext> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new OwnerAccessError("misconfigured", "Telegram bot token is not configured.");
  }

  try {
    const { user } = verifyTelegramInitData(initData, botToken);
    return await findActiveOwnerByTelegramId(user.id);
  } catch (error) {
    if (error instanceof OwnerAccessError) throw error;
    if (error instanceof TelegramInitDataError) {
      throw new OwnerAccessError("not_authenticated", error.message);
    }
    throw error;
  }
}

export async function requireOwner(): Promise<OwnerContext> {
  const cookieStore = await cookies();
  const initData = cookieStore.get(TELEGRAM_INIT_DATA_COOKIE)?.value;

  if (initData) {
    return authenticateOwner(initData);
  }

  if (isDemoMode()) {
    return requireDemoOwner();
  }

  throw new OwnerAccessError("not_authenticated", "Open the Web App from Telegram.");
}

export function requireShopAccess(owner: OwnerContext, shopId: string) {
  try {
    return requireMatchingShop(owner.shopId, shopId);
  } catch {
    throw new OwnerAccessError("not_authorized", "Owner cannot access this shop.");
  }
}
