# Database Schema

Каноническая подробная спецификация: [`database.md`](./database.md).

Этот документ фиксирует итоговое состояние схемы после всех migrations, а не только `001_init.sql`.

## Migrations order

1. `001_init.sql` - base schema, RLS, storage bucket.
2. `20260617184050_add_voice_parser_diagnostics.sql` - parser diagnostics fields.
3. `20260618082931_add_sale_item_soft_delete.sql` - initial soft delete fields.
4. `20260619132225_align_sale_item_update_and_exclusion.sql` - update/exclusion alignment.
5. `20260620135556_stabilize_sales_flow.sql` - owners, RPC, RLS/grant hardening.
6. `20260623221651_repair_complete_single_item_sales.sql` - historical data repair.
7. `20260630120000_add_cancelled_voice_sale_status.sql` - `cancelled` statuses.
8. `20260630153000_ensure_sale_item_soft_delete_columns.sql` - final soft delete repair/indexes.

## Core tables

1. `shops`.
2. `owners`.
3. `sellers`.
4. `products`.
5. `voice_records`.
6. `sales`.
7. `sale_items`.
8. `audit_logs`.

## `shops`

Purpose: top-level tenant boundary.

Important fields:

1. `id uuid`.
2. `name text`.
3. `created_at timestamptz`.

`shops.name` has case-insensitive unique index.

## `owners`

Purpose: WebApp owner binding.

Important fields:

1. `id uuid`.
2. `shop_id uuid`.
3. `telegram_id bigint`.
4. `name text`.
5. `is_active boolean`.
6. `created_at timestamptz`.
7. `updated_at timestamptz`.

Access:

1. RLS enabled.
2. Service role manages rows.
3. Anon/authenticated grants are revoked.

## `sellers`

Purpose: Telegram seller binding.

Important fields:

1. `id uuid`.
2. `shop_id uuid`.
3. `telegram_id bigint`.
4. `name text`.
5. `is_active boolean`.
6. `created_at timestamptz`.

Bot and WebApp resolve seller by `telegram_id`.

## `products`

Purpose: optional catalog for product matching.

Important fields:

1. `id uuid`.
2. `shop_id uuid`.
3. `name text`.
4. `default_price numeric`.
5. `unit text`.
6. `is_active boolean`.
7. `created_at timestamptz`.

Current code uses product match mainly for identity/name/unit. Pricing comes from parser/manual input, not hidden client state.

## `voice_records`

Purpose: source voice processing row.

Important fields:

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

Statuses:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

## `sales`

Purpose: parent sale record.

Important fields:

1. `id uuid`.
2. `shop_id uuid`.
3. `seller_id uuid`.
4. `voice_record_id uuid`.
5. `raw_text text`.
6. `cleaned_text text`.
7. `total_amount numeric`.
8. `status text`.
9. `created_at timestamptz`.

Statuses:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

`sales.total_amount` is recalculated from active processed items. A parent `needs_review` sale may have non-zero total when some sibling items are already `processed`.

## `sale_items`

Purpose: item-level revenue source of truth.

Important fields:

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

Statuses:

1. `processed`.
2. `needs_review`.
3. `needs_price` legacy.
4. `failed`.
5. `excluded`.

Pricing fields:

1. Actual unit price field is `price`.
2. Actual total field is `total`.
3. `unit_price` is not used.
4. `total_price` is not used.

Soft delete metadata:

1. Active row has all deleted metadata null.
2. Deleted row has `deleted_at`, `deleted_reason`, `deleted_previous_status`.
3. `deleted_reason` values: `manual`, `excluded_by_owner`, `day_reset`.
4. `deleted_previous_status` excludes `excluded`.

## `audit_logs`

Purpose: best-effort operational audit.

Important fields:

1. `id uuid`.
2. `shop_id uuid`.
3. `seller_id uuid`.
4. `action text`.
5. `details jsonb`.
6. `created_at timestamptz`.

Audit failures are logged and do not block user-facing mutations.

## RPC `save_voice_sale`

Signature inputs:

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

Behavior:

1. Checks active seller belongs to requested shop.
2. Inserts `voice_records`.
3. Inserts `sales`.
4. Inserts `sale_items` from JSON payload.
5. Returns `voice_record_id` and `sale_id`.

Security:

1. `security invoker`.
2. Search path is `public`.
3. Execute revoked from `public`, `anon`, `authenticated`.
4. Execute granted to `service_role`.

Application read-back verifies identifiers and exact inserted item count.

## Revenue inclusion

Count item only if:

1. Parent sale belongs to current shop.
2. Parent sale is not `cancelled`.
3. Parent sale is not `failed`.
4. Item is selected from scoped sale ids.
5. Item status is `processed`.
6. Item `deleted_at is null`.
7. Item `total` is valid.
8. Quantity/weight is valid.

Exclude:

1. Parent `cancelled`.
2. Parent `failed`.
3. Item `needs_review`.
4. Item `needs_price`.
5. Item `failed`.
6. Item `excluded`.
7. Any soft-deleted row.

## Final schema checks

1. `cancelled` is allowed on `sales.status`.
2. `cancelled` is allowed on `voice_records.status`.
3. `excluded` is allowed on `sale_items.status`.
4. `sale_items.updated_at` is not null.
5. `sale_items.deleted_at` exists.
6. `sale_items.deleted_reason` exists.
7. `sale_items.deleted_previous_status` exists.
8. Active-item indexes exist for report/delete paths.
9. `owners` table exists.
10. Demo read policies from base migration are removed by stabilization migration.

## Acceptance criteria

1. New code references only fields created by migrations.
2. New statuses are present in DB constraints.
3. Soft delete constraints enforce consistent metadata.
4. Runtime business mutations use service role server-side.
5. WebApp still checks shop access in code.
6. Parser fallback creates multiple `sale_items` when transcript evidence contains multiple products.
7. Confirm/cancel and edit/delete can recalculate sale totals without missing columns.
