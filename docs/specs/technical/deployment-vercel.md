# Deployment on Vercel

Build command: `npm run build`.

Обязательные server env: Telegram token/webhook secret, Supabase URL/keys, STT/LLM settings, `NEXT_PUBLIC_APP_URL`. Для browser fallback дополнительно задаются:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

Migrations применяются до deploy кода, который читает новые колонки. После deploy задаётся Telegram webhook и проверяется `npm run telegram:webhook-info`.

Production smoke отдельно проверяет прямое открытие Web App в fallback mode и открытие через Telegram кнопку.
