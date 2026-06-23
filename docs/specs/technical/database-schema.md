# Database Schema

Основные таблицы: `shops`, `owners`, `sellers`, `products`, `voice_records`, `sales`, `sale_items`, `audit_logs`.

`sale_items` содержит:

- `product_name`, `quantity`, `unit`, `price`, `total`, `confidence`;
- `status`: `processed`, `needs_review`, legacy `needs_price`, `failed`, `excluded`;
- soft delete поля `deleted_at`, `deleted_reason`, `deleted_previous_status`;
- `updated_at`.

Новые voice-позиции получают `processed`, если полные и уверенные, иначе `needs_review`. Legacy `needs_price` поддерживается для старых строк, но UI показывает его как «Нужно проверить».

`save_voice_sale` проверяет, что seller активен и принадлежит `shop_id`, затем атомарно создаёт `voice_records`, `sales` и `sale_items`. Приложение после RPC читает sale и items обратно и сравнивает точное количество строк.

`20260623221651_repair_complete_single_item_sales.sql` переводит старые однозначные single-item записи в `processed`, только если parser JSON содержит полный уверенный item, а cleaned text явно содержит единицу и цену.
