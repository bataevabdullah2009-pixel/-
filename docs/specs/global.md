# Глобальная спецификация

Voice Sales Log обслуживает несколько магазинов с изоляцией данных по server-derived `shop_id`.

## Инварианты

- Продавец определяется по Telegram user id и активной записи `sellers`.
- Владелец/пользователь Web App определяется через валидный Telegram Mini App initData либо через server-side fallback.
- Browser fallback разрешён только при `ALLOW_WEBAPP_FALLBACK=true`.
- `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` читаются только сервером.
- Клиент никогда не передаёт доверенный `shop_id`.
- Browser API вызовы идут через `apiFetch()` и отправляют `x-app-mode`; Telegram mode также отправляет `x-telegram-init-data`.
- Server Components и Server Actions используют `resolveRequestContext()` / `requireOwner()`.
- Уверенная voice-позиция: товар есть, `quantity > 0`, `price > 0`, `confidence >= 0.80`.
- Уверенная позиция получает `processed` и входит в отчёт.
- Неполные или сомнительные позиции получают `needs_review` и видны в «Нужно проверить».
- Отчёт суммирует только `processed` и `deleted_at is null`.
- Исключение позиции — soft delete.
- Технические ошибки логируются на сервере; UI не показывает internal enum.

За пределами продукта: CRM, складской учёт, касса, платежи и клиентская база.
