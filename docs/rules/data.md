# Data Rules

- `shop_id` не принимается от клиента.
- Service role key используется только сервером.
- Активный отчёт учитывает только `processed` и `deleted_at is null`.
- Revenue требует валидный `total`; unit price может быть сохранён или выведен из total.
- Confirm работает по active `sale_items`: валидные позиции входят в выручку, неполные остаются `needs_review`.
- Parser fallback должен создавать отдельные `sale_items` для каждого товара и отдельные review rows для неполных остатков.
- Валидный WebApp edit ставит item `processed`; такой item может войти в выручку, даже если parent sale остаётся `needs_review`.
- Исключение позиции выполняется только через soft delete.
- Review voice-запись может содержать processed revenue items; неполные review items не входят в выручку.
- Отмена voice-записи хранится как `cancelled` и не удаляет sale физически.
- Изменение schema требует migration и обновления data docs.
- Legacy `needs_price` поддерживается в чтении, но новые неполные позиции используют `needs_review`.
