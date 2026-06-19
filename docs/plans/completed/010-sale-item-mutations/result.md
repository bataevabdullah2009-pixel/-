# Результат

- `updateSaleItem` проверяет положительные количество и цену, сохраняет единицу, считает `total`, ставит `processed`, `confidence = 1` и `updated_at`.
- `excludeSaleItem` оставляет запись в БД и ставит `deleted_at`, `excluded_by_owner`, `excluded` и `updated_at`.
- `getReport` учитывает только активные `processed`-позиции; `getReviewItems` выделяет позиции проверки.
- Server Actions скрывают технические ошибки Supabase от пользователя.
- Общие типы, Zod-схемы, тесты, specs, feature docs, rules, plans и changelog синхронизированы.

Применение migration и сквозная проверка подключённого Supabase остаются во внешнем плане `003-curator-release`.
