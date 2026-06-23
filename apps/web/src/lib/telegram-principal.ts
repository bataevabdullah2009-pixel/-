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
  createSellerForOwner?(params: {
    telegramId: number;
    shopId: string;
  }): Promise<TelegramPrincipalRecord>;
};

export class TelegramPrincipalError extends Error {
  constructor(
    public readonly code: "SELLER_NOT_LINKED" | "SELLER_INACTIVE" | "SHOP_NOT_FOUND",
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
  const seller = await lookup.findSeller(telegramId);
  if (seller && seller.is_active !== true) {
    throw new TelegramPrincipalError("SELLER_INACTIVE", "Доступ к магазину отключён");
  }

  const owner = seller ? null : await lookup.findOwner(telegramId);
  if (owner && owner.is_active !== true) {
    throw new TelegramPrincipalError("SELLER_INACTIVE", "Доступ к магазину отключён");
  }

  let principal = seller
    ? { record: seller, role: "seller" as const }
    : owner
      ? { record: owner, role: "owner" as const }
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

  if (principal.role === "owner" && lookup.createSellerForOwner) {
    const createdSeller = await lookup.createSellerForOwner({ telegramId, shopId });
    if (
      createdSeller.is_active !== true ||
      String(createdSeller.shop_id).trim() !== shopId ||
      Number(createdSeller.telegram_id) !== telegramId
    ) {
      throw new TelegramPrincipalError(
        "SELLER_NOT_LINKED",
        "Не удалось привязать Telegram к продавцу"
      );
    }
    principal = { record: createdSeller, role: "seller" };
  }

  return {
    principalId: String(principal.record.id),
    shopId,
    telegramId: Number(principal.record.telegram_id),
    role: principal.role
  };
}
