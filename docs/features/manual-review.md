# Ручное исправление

Позиции `needs_review` и `needs_price`, включая fallback после невалидного LLM result, находятся в блоке «Нужно проверить».

Владелец изменяет название, количество и цену. Server Action повторно проверяет Telegram owner/shop, не принимает `shop_id` из формы, сохраняет `product_name`, `quantity`, существующую/нормализованную `unit`, `price`, `total = quantity × price`, `status = processed`, `confidence = 1`, `updated_at = now()`.

Исключение выполняет soft delete: `status = excluded`, `deleted_at = now()`, `deleted_reason = excluded_by_owner`, `updated_at = now()`. После save/exclude связанная sale и отчёт пересчитываются и обновляются автоматически.
