export type TelegramPrincipalRecord = {
  id: unknown;
  shop_id: unknown;
  telegram_id: unknown;
  is_active: unknown;
};

export type TelegramPrincipalLookup = {
  findOwner(telegramId: number): Promise<TelegramPrincipalRecord | null>;
  findSeller(telegramId: number): Promise<TelegramPrincipalRecord | null>;
  shopExists(shopId: string): Promise<boolean>;
};

export class TelegramPrincipalError extends Error {
  constructor(
    public readonly code: "SELLER_NOT_LINKED" | "SHOP_NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "TelegramPrincipalError";
  }
}

export async function resolveTelegramPrincipal(
  telegramId: number,
  lookup: TelegramPrincipalLookup
) {
  const owner = await lookup.findOwner(telegramId);
  const seller = owner?.is_active === true ? null : await lookup.findSeller(telegramId);
  const principal = owner?.is_active === true
    ? { record: owner, role: "owner" as const }
    : seller?.is_active === true
      ? { record: seller, role: "seller" as const }
      : null;

  if (!principal) {
    throw new TelegramPrincipalError(
      "SELLER_NOT_LINKED",
      "Ваш Telegram не привязан к магазину"
    );
  }

  const shopId = typeof principal.record.shop_id === "string"
    ? principal.record.shop_id.trim()
    : "";
  if (!shopId || !(await lookup.shopExists(shopId))) {
    throw new TelegramPrincipalError("SHOP_NOT_FOUND", "Магазин не найден");
  }

  return {
    principalId: String(principal.record.id),
    shopId,
    telegramId: Number(principal.record.telegram_id),
    role: principal.role
  };
}
