# Глобальная спецификация

Voice Sales Log обслуживает несколько магазинов с изоляцией данных по server-derived `shop_id`.

## Инварианты

- Продавец определяется по Telegram user id и активной записи `sellers`.
- Пользователь Web App определяется через валидный raw Telegram Mini App initData либо через явно включённый server-side fallback.
- Клиент проверяет `Telegram.WebApp`, непустой initData и `initDataUnsafe.user.id`, но доверие устанавливает только server-side HMAC.
- HMAC использует `TELEGRAM_BOT_TOKEN`, исключает только `hash` и не использует `TELEGRAM_WEBHOOK_SECRET`.
- Seller ищется по Telegram user id; active owner binding может создать seller только в owner shop.
- Browser fallback разрешён только при `ALLOW_WEBAPP_FALLBACK=true`.
- `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` читаются только сервером.
- Клиент никогда не передаёт доверенный `shop_id`.
- Browser API вызовы идут через `apiFetch()` и отправляют `x-app-mode`; Telegram mode также отправляет `x-telegram-init-data`.
- Server Components и Server Actions используют `resolveRequestContext()` / `requireOwner()`.
- Report читает `sales` по server-derived `shop_id`, затем `sale_items` по найденным sale IDs.
- Auth/DB failure не отображается как успешный нулевой отчёт или пустой журнал.
- Уверенная voice-позиция: товар есть, `quantity > 0`, `price > 0`, `confidence >= 0.80`.
- Уверенная позиция получает `processed` и входит в отчёт.
- Неполные или сомнительные позиции получают `needs_review` и видны в «Нужно проверить».
- Отчёт суммирует только `processed` и `deleted_at is null`.
- Исключение позиции — soft delete.
- Технические ошибки логируются на сервере; UI не показывает internal enum.

За пределами продукта: CRM, складской учёт, касса, платежи и клиентская база.
