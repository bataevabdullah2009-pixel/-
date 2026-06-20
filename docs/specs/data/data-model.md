# Модель данных

`shops` является корнем tenant boundary. `owners`, `sellers`, `products`, `voice_records` и `sales` содержат `shop_id`. `sale_items` связаны с магазином через `sales`. `audit_logs` фиксируют магазин и, когда применимо, продавца.

Telegram auth не меняет schema: сервер читает `telegram_id`, `is_active` и `shop_id` из `owners`/`sellers`, затем подтверждает строку в `shops`. Client `shop_id` не записывается и не используется для выбора tenant.

Одна Telegram voice запись создаёт один `voice_records`, один `sales` и минимум один `sale_items`: пустой parser result материализуется как `needs_review`. Целевой путь использует PostgreSQL-функцию `save_voice_sale`; совместимый server-side fallback удаляет уже созданные строки при ошибке последующей вставки.
