# Архитектура Voice Sales Log

```text
Telegram voice
  -> bot webhook / process-update
  -> audio preparation
  -> Russian STT
  -> LLM parser + evidence rules
  -> Supabase save_voice_sale
  -> sales/sale_items read-back verification
  -> Next.js App Router Web App
  -> report / records / sellers / item mutations
```

## Web App auth

```text
Telegram mode:
  telegram-web-app.js
  -> window.Telegram.WebApp.initData
  -> client checks WebApp + raw initData + initDataUnsafe.user.id
  -> apiFetch(x-app-mode=telegram, x-telegram-init-data=<raw initData>)
  -> resolveRequestContext()
  -> HMAC via TELEGRAM_BOT_TOKEN, all fields except hash
  -> seller lookup by Telegram user id
  -> optional seller creation from active owner binding in the same shop
  -> server-derived shop_id
  -> sales filtered by shop_id
  -> sale_items filtered by resolved sale IDs

Browser fallback mode:
  no initData
  -> apiFetch(x-app-mode=fallback)
  -> resolveRequestContext()
  -> ALLOW_WEBAPP_FALLBACK=true
  -> DEFAULT_SHOP_ID / DEFAULT_SELLER_ID from server env
  -> seller row lookup and shop_id equality check
```

`TELEGRAM_WEBHOOK_SECRET` не участвует в WebApp auth. `shop_id` не является частью доверенного client contract. Отчёт, записи, продавцы и Server Actions используют только server-derived context.

## Data flow

`sales.total_amount` и отчёт считаются по активным `sale_items.status = processed` и `deleted_at is null`. `needs_review` и legacy `needs_price` выводятся в блок «Нужно проверить». Исключение позиции — это `deleted_at = now()`, восстановление — `deleted_at = null`.

Подробности: [technical architecture](../specs/technical/architecture.md), [auth and shop isolation](../specs/technical/auth-and-shop-isolation.md), [report calculation](../specs/technical/report-calculation.md).
