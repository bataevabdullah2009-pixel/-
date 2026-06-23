# Database Schema

Основные таблицы: `shops`, `owners`, `sellers`, `products`, `voice_records`, `sales`, `sale_items`, `audit_logs`.

`sale_items` содержит:

- `product_name`, `quantity`, `unit`, `price`, `total`, `confidence`;
- `status`: `processed`, `needs_review`, legacy `needs_price`, `failed`, `excluded`;
- soft delete поля `deleted_at`, `deleted_reason`, `deleted_previous_status`;
- `updated_at`.

Новые voice-позиции получают `processed`, если полные и уверенные, иначе `needs_review`. Legacy `needs_price` поддерживается для старых строк, но UI показывает его как «Нужно проверить».

`save_voice_sale` проверяет, что seller активен и принадлежит `shop_id`, затем создаёт `voice_records`, `sales` и `sale_items`.
