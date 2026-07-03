# Database Schema

Каноническая подробная спецификация: [`database.md`](./database.md).

Основные таблицы: `shops`, `owners`, `sellers`, `products`, `voice_records`, `sales`, `sale_items`, `audit_logs`.

`voice_records.status` и `sales.status`: `pending`, `processed`, `needs_review`, `cancelled`, `failed`.

`sale_items` содержит:

- `product_name`, `quantity`, `unit`, `price`, `total`, `confidence`;
- `status`: `processed`, `needs_review`, legacy `needs_price`, `failed`, `excluded`;
- soft delete поля `deleted_at`, `deleted_reason`, `deleted_previous_status`;
- `updated_at`.

Фактические имена ценовых полей — `price` и `total`. `unit_price`/`total_price` не используются. Live schema check 25 июня 2026 подтвердил наличие полей WebApp update/delete. Migration `20260630120000_add_cancelled_voice_sale_status.sql` расширяет constraints для `cancelled`.

Новые voice-позиции получают `processed`, если полные и уверенные, иначе `needs_review`. Deterministic parser fallback разделяет glued transcript на отдельные `sale_items` и сохраняет неполные остатки отдельными review rows. Legacy `needs_price` поддерживается для старых строк, но UI показывает его как «Нужно проверить».

`save_voice_sale` проверяет, что seller активен и принадлежит `shop_id`, затем атомарно создаёт `voice_records`, `sales` и `sale_items`. Приложение после RPC читает sale и items обратно и сравнивает точное количество строк.

Confirm переводит sale/voice в `processed`. Cancel переводит sale/voice в `cancelled` и soft-delete active items. Решение может прийти из Telegram callback или WebApp `/review`; обычный WebApp item edit/delete сам по себе не подтверждает и не отменяет review voice-записи. Валидный edit может поставить item row в `processed`, но parent sale остаётся gate для выручки до confirm.

`20260623221651_repair_complete_single_item_sales.sql` переводит старые однозначные single-item записи в `processed`, только если parser JSON содержит полный уверенный item, а cleaned text явно содержит единицу и цену.
