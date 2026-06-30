# API Spec

Подробный контракт WebApp Server Actions: [`webapp-api.md`](./webapp-api.md).

- `POST /api/telegram/webhook` — Telegram updates. Проверяет `x-telegram-bot-api-secret-token`, затем вызывает общий bot update processor. Voice updates сохраняют продажи; callback updates обрабатывают `✅ Подтвердить` / `❌ Отмена` для review sales.
- `POST /api/auth/telegram` — Web App bootstrap. Использует `resolveRequestContext(request)`.

`/api/auth/telegram` responses:

- `200 { ok: true, mode: "telegram" }` — raw initData валиден, seller/shop разрешены, cookie установлена.
- `200 { ok: true, mode: "fallback" }` — initData нет, server fallback разрешён.
- `401` — нет initData и fallback выключен, hash невалиден либо `auth_date` истёк.
- `403` — Telegram user не привязан, отключён или магазин не найден.
- `500` — ошибка конфигурации или сервера.

Бизнес-данные WebApp читаются через Server Components и изменяются Server Actions. Inline update/delete возвращают клиенту structured action state; restore/reset сохраняют redirect-based contract. WebApp не имеет action для подтверждения review voice sale.

Header `x-telegram-init-data` содержит raw `Telegram.WebApp.initData`. `TELEGRAM_WEBHOOK_SECRET` не используется этим endpoint.
