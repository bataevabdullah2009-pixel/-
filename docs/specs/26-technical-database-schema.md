# Схема базы данных

Каноническая подробная спецификация: [`25-technical-database.md`](./25-technical-database.md).

Этот документ фиксирует итоговое состояние схемы после всех миграций, а не только `001_init.sql`.

## Порядок миграций

1. `001_init.sql` - base schema, RLS, storage bucket.
2. `20260617184050_add_voice_parser_diagnostics.sql` - поля parser diagnostics.
3. `20260618082931_add_sale_item_soft_delete.sql` - начальные поля soft delete.
4. `20260619132225_align_sale_item_update_and_exclusion.sql` - выравнивание update/exclusion.
5. `20260620135556_stabilize_sales_flow.sql` - owners, RPC, RLS/grant hardening.
6. `20260623221651_repair_complete_single_item_sales.sql` - historical data repair.
7. `20260630120000_add_cancelled_voice_sale_status.sql` - статусы `cancelled`.
8. `20260630153000_ensure_sale_item_soft_delete_columns.sql` - финальный soft delete repair/indexes.

## Основные таблицы

1. `shops`.
2. `owners`.
3. `sellers`.
4. `products`.
5. `voice_records`.
6. `sales`.
7. `sale_items`.
8. `audit_logs`.

## `shops`

Назначение: top-level tenant boundary.

Важные поля:

1. `id uuid`.
2. `name text`.
3. `created_at timestamptz`.

`shops.name` имеет case-insensitive unique index.

## `owners`

Назначение: WebApp owner binding.

Важные поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `telegram_id bigint`.
4. `name text`.
5. `is_active boolean`.
6. `created_at timestamptz`.
7. `updated_at timestamptz`.

Доступ:

1. RLS enabled.
2. Service role manages rows.
3. Anon/authenticated grants are revoked.

## `sellers`

Назначение: Telegram seller binding.

Важные поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `telegram_id bigint`.
4. `name text`.
5. `is_active boolean`.
6. `created_at timestamptz`.

Bot и WebApp резолвят seller по `telegram_id`.

## `products`

Назначение: optional catalog для product matching.

Важные поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `name text`.
4. `default_price numeric`.
5. `unit text`.
6. `is_active boolean`.
7. `created_at timestamptz`.

Current code использует product match в основном для identity/name/unit. Pricing приходит из parser/manual input, а не из hidden client state.

## `voice_records`

Назначение: исходная row для voice processing.

Важные поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `seller_id uuid`.
4. `telegram_message_id text`.
5. `audio_path text`.
6. `audio_url text`.
7. `raw_text text`.
8. `cleaned_text text`.
9. `parser_json jsonb`.
10. `status text`.
11. `error_message text`.
12. `created_at timestamptz`.

Статусы:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

## `sales`

Назначение: parent sale record.

Важные поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `seller_id uuid`.
4. `voice_record_id uuid`.
5. `raw_text text`.
6. `cleaned_text text`.
7. `total_amount numeric`.
8. `status text`.
9. `created_at timestamptz`.

Статусы:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

`sales.total_amount` пересчитывается из active processed items. Parent `needs_review` sale может иметь non-zero total, когда некоторые sibling items уже `processed`.

## `sale_items`

Назначение: item-level revenue source of truth.

Важные поля:

1. `id uuid`.
2. `sale_id uuid`.
3. `product_id uuid`.
4. `product_name text`.
5. `quantity numeric`.
6. `unit text`.
7. `price numeric`.
8. `total numeric`.
9. `confidence numeric`.
10. `status text`.
11. `created_at timestamptz`.
12. `updated_at timestamptz`.
13. `deleted_at timestamptz`.
14. `deleted_reason text`.
15. `deleted_previous_status text`.

Статусы:

1. `processed`.
2. `needs_review`.
3. `needs_price` legacy.
4. `failed`.
5. `excluded`.

Поля pricing:

1. Фактическое поле unit price - `price`.
2. Фактическое поле total - `total`.
3. `unit_price` не используется.
4. `total_price` не используется.

Метаданные soft delete:

1. Active row имеет все deleted metadata null.
2. Deleted row имеет `deleted_at`, `deleted_reason`, `deleted_previous_status`.
3. `deleted_reason` values: `manual`, `excluded_by_owner`, `day_reset`.
4. `deleted_previous_status` excludes `excluded`.

## `audit_logs`

Назначение: best-effort operational audit.

Важные поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `seller_id uuid`.
4. `action text`.
5. `details jsonb`.
6. `created_at timestamptz`.

Audit failures логируются и не блокируют user-facing mutations.

## RPC `save_voice_sale`

Входные параметры сигнатуры:

1. `p_shop_id`.
2. `p_seller_id`.
3. `p_telegram_message_id`.
4. `p_audio_path`.
5. `p_audio_url`.
6. `p_raw_text`.
7. `p_cleaned_text`.
8. `p_parser_json`.
9. `p_status`.
10. `p_error_message`.
11. `p_total_amount`.
12. `p_items`.

Поведение:

1. Проверяет, что active seller принадлежит requested shop.
2. Вставляет `voice_records`.
3. Вставляет `sales`.
4. Вставляет `sale_items` из JSON payload.
5. Возвращает `voice_record_id` и `sale_id`.

Безопасность:

1. `security invoker`.
2. Search path is `public`.
3. Execute revoked from `public`, `anon`, `authenticated`.
4. Execute выдан `service_role`.

Application read-back проверяет identifiers и точное количество inserted item.

## Включение в revenue

Учитывать item только если:

1. Parent sale belongs to current shop.
2. Parent sale is not `cancelled`.
3. Parent sale is not `failed`.
4. Item is selected from scoped sale ids.
5. Item status is `processed`.
6. Item `deleted_at is null`.
7. Item `total` is valid.
8. Quantity/weight is valid.

Исключать:

1. Parent `cancelled`.
2. Parent `failed`.
3. Item `needs_review`.
4. Item `needs_price`.
5. Item `failed`.
6. Item `excluded`.
7. Any soft-deleted row.

## Финальные проверки схемы

1. `cancelled` разрешён в `sales.status`.
2. `cancelled` разрешён в `voice_records.status`.
3. `excluded` разрешён в `sale_items.status`.
4. `sale_items.updated_at` не null.
5. `sale_items.deleted_at` существует.
6. `sale_items.deleted_reason` существует.
7. `sale_items.deleted_previous_status` существует.
8. Active-item indexes существуют для report/delete paths.
9. Таблица `owners` существует.
10. Demo read policies из base migration удалены stabilization migration.

## Критерии приемки

1. New code ссылается только на поля, созданные migrations.
2. New statuses присутствуют в DB constraints.
3. Soft delete constraints обеспечивают consistent metadata.
4. Business mutations во время выполнения используют service role server-side.
5. WebApp всё равно проверяет shop access в code.
6. Parser fallback создаёт несколько `sale_items`, когда transcript evidence содержит несколько products.
7. Confirm/cancel и edit/delete могут пересчитывать sale totals без missing columns.
