# Auth and Shop Isolation

## Client contract

`getAppAuthContext()` возвращает:

```ts
{
  mode: "telegram" | "fallback",
  initData?: string,
  hasTelegram: boolean,
  hasWebApp: boolean
}
```

`apiFetch()` всегда отправляет `x-app-mode`. Header `x-telegram-init-data` отправляется только когда Telegram SDK дал непустой initData.

## Server contract

`resolveRequestContext(request)`:

1. Если есть `x-telegram-init-data`, валидирует HMAC через `TELEGRAM_BOT_TOKEN`, находит active owner/seller и возвращает `shopId`.
2. Если initData нет и `ALLOW_WEBAPP_FALLBACK=true`, берёт `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` из server env.
3. Если initData нет и fallback выключен, возвращает 401 для route handlers или пустое состояние в Server Components без красной блокировки UI.

Fallback log содержит только безопасные признаки: `mode`, `hasDefaultShop`, `hasDefaultSeller`.

`shop_id` из query, form или JSON не используется для tenant selection. Текущие чтения и мутации реализованы Server Components/Server Actions; отдельных `/api/report`, `/api/records`, `/api/sellers`, `/api/sale-items/*`, `/api/reset-day` и `/api/refresh` routes нет.
