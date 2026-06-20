# Модель данных

`shops` является корнем tenant boundary. `owners`, `sellers`, `products`, `voice_records` и `sales` содержат `shop_id`. `sale_items` связаны с магазином через `sales`. `audit_logs` фиксируют магазин и, когда применимо, продавца.

Одна Telegram voice запись создаёт один `voice_records`, один `sales` и ноль или несколько `sale_items`. Создание выполняется одной PostgreSQL-функцией `save_voice_sale`, поэтому частичная продажа не остаётся после ошибки вставки позиции.
