# Technical Spec: Database

## 1. Цель

1. Supabase хранит магазины, продавцов, голосовые записи, продажи, товары и audit logs.
2. Schema должна поддерживать быстрый отчёт по выручке.
3. Schema должна сохранять сомнительные распознавания без включения в revenue.
4. Schema должна поддерживать soft delete sale items.
5. Schema не должна требовать destructive reset для текущих изменений.

## 2. Migrations

1. Base schema: `supabase/migrations/001_init.sql`.
2. Parser diagnostics: `20260617184050_add_voice_parser_diagnostics.sql`.
3. Sale item soft delete: `20260618082931_add_sale_item_soft_delete.sql`.
4. Sale flow stabilization: `20260620135556_stabilize_sales_flow.sql`.
5. Cancelled status: `20260630120000_add_cancelled_voice_sale_status.sql`.
6. Soft delete repair: `20260630153000_ensure_sale_item_soft_delete_columns.sql`.
7. Earlier repair migrations remain part of history.
8. New DB fields must be added by migration.
9. Code must not reference a column that migrations do not create.

## 3. Tables

1. `shops` - store tenant/shop boundary.
2. `sellers` - Telegram sellers linked to shops.
3. `products` - optional product catalog for name/unit matching.
4. `voice_records` - audio/transcript/process status.
5. `sales` - parent sale record.
6. `sale_items` - individual product rows.
7. `audit_logs` - operational audit trail.

## 4. `shops`

1. Primary key: `id`.
2. Name identifies shop.
3. Used as top-level tenant boundary.
4. Every seller belongs to one shop.
5. Every voice record belongs to one shop.
6. Every sale belongs to one shop.

## 5. `sellers`

1. Primary key: `id`.
2. `shop_id` references `shops`.
3. `telegram_id` links Telegram user.
4. `name` stores display name.
5. `is_active` gates access.
6. Bot uses `telegram_id` to resolve seller.
7. WebApp session resolver can use seller to derive shop.

## 6. `voice_records`

1. Primary key: `id`.
2. `shop_id` scopes row.
3. `seller_id` links seller.
4. `telegram_message_id` links Telegram message.
5. `audio_path` may store Supabase Storage path.
6. `audio_url` may store public/fallback URL.
7. `raw_text` stores STT transcript.
8. `cleaned_text` stores parser-cleaned display text.
9. `parser_json` stores parser diagnostics.
10. `status` mirrors processing state.
11. `error_message` stores failure/fallback context.
12. `created_at` supports period filters.

## 7. `sales`

1. Primary key: `id`.
2. `shop_id` scopes sale.
3. `seller_id` links seller.
4. `voice_record_id` links voice record.
5. `raw_text` duplicates useful transcript context.
6. `cleaned_text` duplicates display text.
7. `total_amount` stores current sale total.
8. `status` controls revenue inclusion.
9. `created_at` supports period filters.

## 8. `sale_items`

1. Primary key: `id`.
2. `sale_id` links parent sale.
3. `product_id` optionally links catalog.
4. `product_name` stores display product name.
5. `quantity` stores numeric quantity.
6. `unit` stores normalized unit.
7. `price` stores unit price.
8. `total` stores quantity × price.
9. `confidence` stores parser confidence or manual confidence.
10. `status` stores item state.
11. `updated_at` changes on edit/delete/restore.
12. `deleted_at` marks soft delete.
13. `deleted_reason` stores delete reason.
14. `deleted_previous_status` stores restore target.

## 9. Canonical sale statuses

1. `processed` - sale is confirmed and can contribute revenue.
2. `needs_review` - sale is saved but excluded from revenue.
3. `cancelled` - sale was cancelled by user and excluded from revenue.
4. `failed` - processing failed and excluded from revenue.
5. `pending` may exist as legacy/base schema state but should not be emitted by current completed pipeline.

## 10. Canonical item statuses

1. `processed` - item can contribute revenue only with processed parent sale.
2. `needs_review` - item excluded from revenue.
3. `needs_price` - legacy review-like state, excluded from revenue.
4. `failed` - item excluded from revenue.
5. `excluded` - soft-deleted item excluded from active report.

## 11. Soft delete

1. Soft delete never physically deletes `sale_items`.
2. Delete sets `status = excluded`.
3. Delete sets `deleted_at = now`.
4. Delete sets `deleted_reason`.
5. Delete sets `deleted_previous_status`.
6. Active report filters `deleted_at is null`.
7. Legacy `excluded` with null `deleted_at` is still not active.
8. Restore clears soft-delete fields.
9. Restore uses `deleted_previous_status` or falls back to `needs_review`.

## 12. Revenue rule

An item contributes revenue only when:

1. Parent sale belongs to current shop.
2. Parent sale status is `processed`.
3. Item belongs to scoped sale ids.
4. Item status is `processed`.
5. Item `deleted_at is null`.
6. Item `total is not null`.
7. Item quantity/weight is valid.
8. Item `price` is valid or can be derived from `total / quantity`.

Never count:

1. Parent `needs_review`.
2. Parent `cancelled`.
3. Parent `failed`.
4. Item `needs_review`.
5. Item `needs_price`.
6. Item `failed`.
7. Item `excluded`.
8. Any deleted row.

## 13. Report scoping

1. WebApp calls `getReport`.
2. `getReport` resolves current owner/seller from session.
3. Sales are selected with `shop_id = owner.shopId`.
4. Items are selected only by those sale ids.
5. `scopeReportRows` verifies every sale row shop matches owner shop.
6. Cancelled/failed sales are excluded from active report scope.
7. Items from `needs_review` sales are downgraded to review status for report aggregation.
8. `buildSalesReport` aggregates only active processed rows.

## 14. Voice persistence

1. Bot builds payload with `buildVoiceSaleRpcPayload`.
2. Payload includes shop id, seller id, telegram message id, audio data, transcript and resolved items.
3. Deterministic parser fallback must split glued transcript into one payload item per product when evidence exists.
4. Bot calls RPC `save_voice_sale`.
5. RPC returns identifiers.
6. Code reads sale back.
7. Code reads sale_items count back.
8. Inserted `sale_items` ids are logged for diagnostics.
9. Mismatch throws error.
10. False success is not allowed.

## 15. Confirm mutation

1. Select sale by `id`, `shop_id`, `seller_id`.
2. If already processed, return unchanged success.
3. If already cancelled, return unchanged success.
4. If failed, return error.
5. Select active items by `sale_id` and `deleted_at is null`.
6. Validate product, quantity/weight and price-or-total per active item.
7. If no item is confirmable, return `Не удалось подтвердить: нет ни одной полной позиции.` and leave rows unchanged.
8. Update every confirmable item to `processed`.
9. Leave incomplete active items as `needs_review`.
10. Set confidence to `1` on confirmable items.
11. Recalculate item price/total when possible.
12. Update sale `status = processed`.
13. Update sale `total_amount` to the sum of confirmable items.
14. Update voice record `status = processed`.

## 16. Cancel mutation

1. Select sale by `id`, `shop_id`, `seller_id`.
2. If already cancelled, return unchanged success.
3. If already processed, return unchanged success.
4. If failed, return error.
5. Select active items.
6. Soft-delete each active item.
7. Update sale `status = cancelled`.
8. Update sale `total_amount = 0`.
9. Update voice record `status = cancelled`.

## 17. Sale item update

1. Select item by `id`.
2. Reject if deleted.
3. Select parent sale in current shop.
4. Validate shop access.
5. Build manual patch.
6. Match product catalog if possible.
7. Update active item with recalculated `total`, `confidence = 1` and `status = processed` when product/quantity/price are valid.
8. Parent `needs_review` sale remains excluded from revenue until explicit confirm.
9. Return updated row.
10. Recalculate parent sale.
11. Write audit log best effort.

## 18. Sale item delete

1. Select item by `id`.
2. Select parent sale in current shop.
3. Validate shop access.
4. Build excluded patch.
5. Update active item.
6. Recalculate parent sale.
7. Write audit log best effort.

## 19. Recalculation

1. Reads active items.
2. Sums only `processed` item totals with valid `total`.
3. Current cancelled sale total becomes zero.
4. Current failed sale total becomes zero.
5. Current needs_review sale stays needs_review until explicit confirm.
6. Current processed sale stays processed when all items are deleted or when mixed-cart review items remain active.
7. Voice record status follows recalculated sale status.

## 20. RLS and access

1. Runtime mutations use server-side service role client.
2. Service role key is never exposed to browser.
3. WebApp still enforces shop access server-side.
4. Client forms do not carry authoritative shop id.
5. Bot callbacks derive shop from seller lookup.

## 21. Errors

1. Missing admin client returns server error state.
2. Missing item returns not found state.
3. Missing sale returns not found state.
4. Supabase update returning zero rows becomes not found/update failed.
5. Audit log failure is logged, not user-blocking.
6. Missing soft-delete columns would break delete; migrations must prevent this.

## 22. Acceptance criteria

1. Processed sale enters revenue.
2. Needs_review sale does not enter revenue.
3. Cancelled sale does not enter revenue.
4. Failed sale does not enter revenue.
5. Deleted item does not enter active report.
6. Item update persists after reload.
7. Item delete persists after reload.
8. Report totals recalculate after update.
9. Report totals recalculate after delete.
10. No code path references missing `deleted_at`.

## 23. Out of scope

1. Full accounting ledger.
2. Inventory reservations.
3. Physical delete flow.
4. Public client-side writes to business tables.
5. Schema reset.
