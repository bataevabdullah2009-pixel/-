# Data Rules

- `shop_id` не принимается от клиента.
- Service role key используется только сервером.
- Активный отчёт учитывает только `processed` и `deleted_at is null`.
- Исключение позиции выполняется только через soft delete.
- Изменение schema требует migration и обновления data docs.
- Legacy `needs_price` поддерживается в чтении, но новые неполные позиции используют `needs_review`.
