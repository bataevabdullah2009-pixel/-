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

export const TELEGRAM_INIT_DATA_COOKIE = "voice_sales_telegram_init_data";

export type OwnerContext = {
  ownerId: string;
  shopId: string;
  telegramId: number;
  demo: boolean;
};

export class OwnerAccessError extends Error {
  constructor(
    public readonly code:
      | "TELEGRAM_INIT_DATA_MISSING"
      | "TELEGRAM_INIT_DATA_INVALID"
      | "SELLER_NOT_LINKED"
      | "SHOP_NOT_FOUND"
      | "AUTH_MISCONFIGURED",
    message: string
  ) {
    super(message);
    this.name = "OwnerAccessError";
  }
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function isMissingOwnersTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205";
}

async function findActiveOwnerByTelegramId(telegramId: number): Promise<OwnerContext> {
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
      }
    });

    return {
      ownerId: principal.principalId,
      shopId: principal.shopId,
      telegramId: principal.telegramId,
      demo: false
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
    ownerId: String(owner.id),
    shopId: String(owner.shop_id),
    telegramId: Number(owner.telegram_id),
    demo: true
  };
}

export async function authenticateOwner(initData: string): Promise<OwnerContext> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new OwnerAccessError("AUTH_MISCONFIGURED", "Telegram bot token is not configured.");
  }

  try {
    const { user } = verifyTelegramInitData(initData, botToken);
    return await findActiveOwnerByTelegramId(user.id);
  } catch (error) {
    if (error instanceof OwnerAccessError) throw error;
    if (error instanceof TelegramInitDataError) {
      throw new OwnerAccessError(error.code, error.message);
    }
    throw error;
  }
}

export async function requireOwner(request?: Request): Promise<OwnerContext> {
  const headerInitData = request ? readTelegramInitDataHeader(request.headers) : "";
  if (headerInitData) {
    return authenticateOwner(headerInitData);
  }

  const cookieStore = await cookies();
  const initData = cookieStore.get(TELEGRAM_INIT_DATA_COOKIE)?.value;

  if (initData) {
    return authenticateOwner(initData);
  }

  if (isDemoMode()) {
    return requireDemoOwner();
  }

  throw new OwnerAccessError(
    "TELEGRAM_INIT_DATA_MISSING",
    "Откройте отчёт через кнопку в Telegram-боте"
  );
}

export function requireShopAccess(owner: OwnerContext, shopId: string) {
  try {
    return requireMatchingShop(owner.shopId, shopId);
  } catch {
    throw new OwnerAccessError("SELLER_NOT_LINKED", "Owner cannot access this shop.");
  }
}
