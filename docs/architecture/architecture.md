# Архитектура Voice Sales Log

Voice Sales Log — монорепозиторий реального MVP: Telegram bot принимает голосовые продажи, STT/LLM формирует позиции, Supabase хранит данные, а Next.js Mini App показывает владельцу отчёт.

```text
Telegram web_app button
  → telegram-web-app.js
  → Telegram.WebApp.initData
  → apiFetch(x-telegram-init-data)
  → HMAC validation with TELEGRAM_BOT_TOKEN
  → active owner/seller lookup
  → shop existence check
  → server-derived shop_id
  → report / records / sellers / mutations
```

Первичный browser fetch проходит через `apps/web/src/lib/telegram-api.ts`. После `POST /api/auth/telegram` сервер хранит initData в HttpOnly cookie и повторно валидирует его для Server Components и Server Actions. Клиентский `shop_id` не является частью доверенного контракта.

Публичный Telegram URL проходит общую проверку в `packages/shared/utils/telegram-url.ts`. Bot runtime, setWebhook и webhook diagnostics отклоняют HTTP, локальные, ngrok и временные Vercel URL до отправки кнопки пользователю.

Подробности: [technical architecture](../specs/technical/architecture.md), [auth and shop isolation](../specs/technical/auth-and-shop-isolation.md), [Telegram webhook](../specs/technical/telegram-webhook.md).
