import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramInitUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramInitDataFailureReason =
  | "missing_init_data"
  | "missing_bot_token"
  | "invalid_hash"
  | "expired_auth_date"
  | "invalid_user"
  | "shop_mismatch";

export class TelegramInitDataError extends Error {
  constructor(
    public readonly code: "TELEGRAM_INIT_DATA_MISSING" | "TELEGRAM_INIT_DATA_INVALID",
    message: string,
    public readonly reason: TelegramInitDataFailureReason
  ) {
    super(message);
    this.name = "TelegramInitDataError";
  }
}

export function requireMatchingShop(ownerShopId: string, targetShopId: string) {
  if (ownerShopId !== targetShopId) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Owner cannot access this shop.",
      "shop_mismatch"
    );
  }

  return ownerShopId;
}

export function readTelegramInitDataHeader(headers: Pick<Headers, "get">) {
  return headers.get("x-telegram-init-data")?.trim() ?? "";
}

export function requireTelegramInitDataHeader(headers: Pick<Headers, "get">) {
  const initData = readTelegramInitDataHeader(headers);
  if (!initData) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_MISSING",
      "Telegram initData is missing.",
      "missing_init_data"
    );
  }
  return initData;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  options: { now?: Date; maxAgeSeconds?: number } = {}
) {
  if (!initData) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_MISSING",
      "Telegram initData is missing.",
      "missing_init_data"
    );
  }
  if (!botToken) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Telegram bot token is missing.",
      "missing_bot_token"
    );
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userJson = params.get("user");

  if (!receivedHash || !/^[a-f\d]{64}$/i.test(receivedHash) || !Number.isFinite(authDate) || !userJson) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Telegram initData is incomplete.",
      "invalid_hash"
    );
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const actualHash = Buffer.from(receivedHash, "hex");

  if (actualHash.length !== expectedHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Telegram initData signature is invalid.",
      "invalid_hash"
    );
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? 24 * 60 * 60;
  const age = nowSeconds - authDate;

  if (age < -60 || age > maxAgeSeconds) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Telegram initData has expired.",
      "expired_auth_date"
    );
  }

  let user: TelegramInitUser;
  try {
    user = JSON.parse(userJson) as TelegramInitUser;
  } catch {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Telegram user data is invalid.",
      "invalid_user"
    );
  }

  if (!Number.isSafeInteger(user.id) || user.id <= 0) {
    throw new TelegramInitDataError(
      "TELEGRAM_INIT_DATA_INVALID",
      "Telegram user id is invalid.",
      "invalid_user"
    );
  }

  return { user, authDate };
}
