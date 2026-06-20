# Схема базы данных

- `shops`: магазины.
- `owners`: владельцы с `shop_id`, `telegram_id`, `is_active`.
- `sellers`: продавцы с `shop_id`, `telegram_id`, `is_active`.
- `products`: справочник известных товаров магазина и цена по умолчанию.
- `voice_records`: аудио, STT/LLM diagnostics и статус обработки.
- `sales`: заголовок продажи, магазин, продавец и итог.
- `sale_items`: позиции продажи, цена, количество, статус и soft-delete metadata.
- `audit_logs`: журнал серверных изменений.

`sale_items.deleted_at` и `deleted_reason` nullable. `updated_at` имеет `not null default now()`. Допустимые статусы позиции: `processed`, `needs_price`, `needs_review`, `failed`, `excluded`.

Принадлежность позиции магазину определяется только связью `sale_items.sale_id → sales.id → sales.shop_id`; отдельный `sale_items.shop_id` не используется.
