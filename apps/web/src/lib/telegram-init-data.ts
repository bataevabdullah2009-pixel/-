import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramInitUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export class TelegramInitDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramInitDataError";
  }
}

export function requireMatchingShop(ownerShopId: string, targetShopId: string) {
  if (ownerShopId !== targetShopId) {
    throw new TelegramInitDataError("Owner cannot access this shop.");
  }

  return ownerShopId;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  options: { now?: Date; maxAgeSeconds?: number } = {}
) {
  if (!initData || !botToken) {
    throw new TelegramInitDataError("Telegram initData or bot token is missing.");
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userJson = params.get("user");

  if (!receivedHash || !/^[a-f\d]{64}$/i.test(receivedHash) || !Number.isFinite(authDate) || !userJson) {
    throw new TelegramInitDataError("Telegram initData is incomplete.");
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const actualHash = Buffer.from(receivedHash, "hex");

  if (actualHash.length !== expectedHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    throw new TelegramInitDataError("Telegram initData signature is invalid.");
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? 24 * 60 * 60;
  const age = nowSeconds - authDate;

  if (age < -60 || age > maxAgeSeconds) {
    throw new TelegramInitDataError("Telegram initData has expired.");
  }

  let user: TelegramInitUser;
  try {
    user = JSON.parse(userJson) as TelegramInitUser;
  } catch {
    throw new TelegramInitDataError("Telegram user data is invalid.");
  }

  if (!Number.isSafeInteger(user.id) || user.id <= 0) {
    throw new TelegramInitDataError("Telegram user id is invalid.");
  }

  return { user, authDate };
}
