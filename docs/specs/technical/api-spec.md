# API Spec

- `POST /api/telegram/webhook` — Telegram updates. Проверяет `x-telegram-bot-api-secret-token`, затем вызывает общий bot update processor.
- `POST /api/auth/telegram` — Web App bootstrap. Использует `resolveRequestContext(request)`.

`/api/auth/telegram` responses:

- `200 { ok: true, mode: "telegram" }` — initData валиден, cookie установлена.
- `200 { ok: true, mode: "fallback" }` — initData нет, server fallback разрешён.
- `401` — нет initData и fallback выключен либо initData невалиден.
- `403` — Telegram user не привязан, отключён или магазин не найден.
- `500` — ошибка конфигурации или сервера.

Бизнес-данные Web App читаются через Server Components и изменяются Server Actions.
