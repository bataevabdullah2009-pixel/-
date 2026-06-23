import { TelegramInitDataError } from "./telegram-init-data";

export type TelegramAuthErrorCode =
  | "TELEGRAM_INIT_DATA_MISSING"
  | "TELEGRAM_INIT_DATA_INVALID"
  | "SELLER_NOT_LINKED"
  | "SELLER_INACTIVE"
  | "SHOP_NOT_FOUND"
  | "AUTH_MISCONFIGURED"
  | "AUTH_FAILED";

type CodedError = Error & { code?: TelegramAuthErrorCode };
type ReasonedError = CodedError & { reason?: string };

export function getTelegramAuthErrorReason(error: unknown) {
  const reason = (error as ReasonedError)?.reason;
  if (reason) return reason;

  const code = (error as CodedError)?.code;
  switch (code) {
    case "TELEGRAM_INIT_DATA_MISSING":
      return "missing_init_data";
    case "TELEGRAM_INIT_DATA_INVALID":
      return "invalid_hash";
    case "SELLER_NOT_LINKED":
      return "user_not_linked";
    case "SELLER_INACTIVE":
      return "seller_inactive";
    case "SHOP_NOT_FOUND":
      return "shop_not_found";
    case "AUTH_MISCONFIGURED":
      return "auth_misconfigured";
    default:
      return "unknown";
  }
}

export function describeTelegramAuthError(error: unknown) {
  const codedError = error as CodedError;
  const code = error instanceof TelegramInitDataError
    ? error.code
    : codedError?.code ?? "AUTH_FAILED";

  switch (code) {
    case "TELEGRAM_INIT_DATA_MISSING":
      return { status: 401, code, message: "Telegram initData отсутствует, а fallback mode выключен." };
    case "TELEGRAM_INIT_DATA_INVALID":
      return { status: 401, code, message: "Не удалось подтвердить Telegram Web App." };
    case "SELLER_NOT_LINKED":
      return { status: 403, code, message: "Ваш Telegram не привязан к магазину" };
    case "SELLER_INACTIVE":
      return { status: 403, code, message: "Доступ к магазину отключён" };
    case "SHOP_NOT_FOUND":
      return { status: 403, code, message: "Магазин не найден" };
    case "AUTH_MISCONFIGURED":
      return { status: 500, code, message: "Сервис авторизации временно не настроен" };
    default:
      return { status: 500, code: "AUTH_FAILED" as const, message: "Не удалось подтвердить доступ к магазину" };
  }
}
