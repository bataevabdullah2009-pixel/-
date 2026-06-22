# Ручное исправление

Каждая новая voice-позиция, включая high-confidence result и fallback после невалидного LLM result, находится в блоке «Нужно проверить».

Пользователь изменяет название, количество и цену. Server Action повторно проверяет Telegram principal/shop, не принимает `shop_id` из формы, сохраняет `product_name`, `quantity`, существующую/нормализованную `unit`, `price`, `total = quantity × price`, `status = needs_review`, `confidence = 1`, `updated_at = now()`. Отдельная кнопка «Подтвердить позицию» устанавливает внутренний `processed`; запись становится подтверждённой после подтверждения всех активных позиций.

Исключение выполняет soft delete: `status = excluded`, `deleted_at = now()`, `deleted_reason = excluded_by_owner`, `updated_at = now()`. После save/confirm/exclude/restore связанная sale и отчёт пересчитываются и обновляются через revalidation без полной перезагрузки.
