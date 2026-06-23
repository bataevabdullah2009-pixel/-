# Deployment on Vercel

Build command: `npm run build`.

Обязательные server env: Telegram token/webhook secret, Supabase URL/keys, STT/LLM settings, `NEXT_PUBLIC_APP_URL`. Для browser fallback дополнительно задаются:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

`DEBUG_TELEGRAM_WEBAPP` в production отсутствует или равен `false`; временно включать диагностику можно только явным значением `true`.

Migrations применяются до deploy кода, который читает новые колонки. После deploy задаётся Telegram webhook и проверяется `npm run telegram:webhook-info`.

Production smoke проверяет открытие через Telegram кнопку, успешный auth при `initDataLength > 0`, совпадение seller/shop в auth и report logs, ненулевые counts при наличии строк и прямое открытие только если fallback включён.
