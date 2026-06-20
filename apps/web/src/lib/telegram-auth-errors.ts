import { TelegramInitDataError } from "./telegram-init-data";

export type TelegramAuthErrorCode =
  | "TELEGRAM_INIT_DATA_MISSING"
  | "TELEGRAM_INIT_DATA_INVALID"
  | "SELLER_NOT_LINKED"
  | "SHOP_NOT_FOUND"
  | "AUTH_MISCONFIGURED"
  | "AUTH_FAILED";

type CodedError = Error & { code?: TelegramAuthErrorCode };

export function describeTelegramAuthError(error: unknown) {
  const codedError = error as CodedError;
  const code = error instanceof TelegramInitDataError
    ? error.code
    : codedError?.code ?? "AUTH_FAILED";

  switch (code) {
    case "TELEGRAM_INIT_DATA_MISSING":
      return { status: 401, code, message: "Откройте отчёт через кнопку в Telegram-боте" };
    case "TELEGRAM_INIT_DATA_INVALID":
      return { status: 401, code, message: "Откройте отчёт через кнопку в Telegram-боте" };
    case "SELLER_NOT_LINKED":
      return { status: 403, code, message: "Ваш Telegram не привязан к магазину" };
    case "SHOP_NOT_FOUND":
      return { status: 403, code, message: "Магазин не найден" };
    case "AUTH_MISCONFIGURED":
      return { status: 500, code, message: "Сервис авторизации временно не настроен" };
    default:
      return { status: 500, code: "AUTH_FAILED" as const, message: "Не удалось подтвердить доступ к магазину" };
  }
}
