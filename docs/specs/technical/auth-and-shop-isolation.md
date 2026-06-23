# Auth and Shop Isolation

## Client contract

`getAppAuthContext()` возвращает:

```ts
{
  mode: "telegram" | "fallback",
  initData?: string,
  telegramUserId?: number,
  hasTelegram: boolean,
  hasWebApp: boolean
}
```

Telegram mode требует `window.Telegram.WebApp`, непустой raw `initData` и `initDataUnsafe.user.id`. `apiFetch()` всегда отправляет `x-app-mode`; `x-telegram-init-data` содержит raw строку, не `initDataUnsafe`.

## Server contract

`resolveRequestContext(request)`:

1. Если есть `x-telegram-init-data`, валидирует HMAC через `TELEGRAM_BOT_TOKEN`. Data-check-string содержит все поля, включая `signature`, кроме `hash`. `TELEGRAM_WEBHOOK_SECRET` не используется.
2. Ищет active seller по Telegram user id и возвращает его DB `shop_id`. Если seller отсутствует, active owner binding может создать seller только в owner shop.
3. Если initData нет и `ALLOW_WEBAPP_FALLBACK=true`, загружает `DEFAULT_SELLER_ID` из БД и требует совпадения его `shop_id` с `DEFAULT_SHOP_ID`.
4. Если initData нет и fallback выключен, возвращает 401; report/records показывают явную ошибку, не пустой результат.

Auth logs не содержат initData или токены. Они фиксируют user/seller/shop и reason: `missing_init_data`, `invalid_hash`, `expired_auth_date`, `missing_bot_token`, `user_not_linked` и другие безопасные коды.

`shop_id` из query, form или JSON не используется для tenant selection. Текущие чтения и мутации реализованы Server Components/Server Actions; отдельных `/api/report`, `/api/records`, `/api/sellers`, `/api/sale-items/*`, `/api/reset-day` и `/api/refresh` routes нет.
