# Техническая спецификация: база данных

## 1. Цель

1. Supabase хранит магазины, продавцов, голосовые записи, продажи, товары и audit logs.
2. Схема должна поддерживать быстрый отчёт по выручке.
3. Схема должна сохранять сомнительные распознавания без включения в revenue.
4. Схема должна поддерживать soft delete sale items.
5. Схема не должна требовать destructive reset для текущих изменений.

## 2. Миграции

1. Базовая schema: `supabase/migrations/001_init.sql`.
2. Parser diagnostics: `20260617184050_add_voice_parser_diagnostics.sql`.
3. Soft delete sale item: `20260618082931_add_sale_item_soft_delete.sql`.
4. Стабилизация sale flow: `20260620135556_stabilize_sales_flow.sql`.
5. Статус cancelled: `20260630120000_add_cancelled_voice_sale_status.sql`.
6. Repair soft delete: `20260630153000_ensure_sale_item_soft_delete_columns.sql`.
7. Earlier repair migrations остаются частью истории.
8. Новые DB fields должны добавляться миграцией.
9. Code не должен ссылаться на колонку, которую migrations не создают.

## 3. Таблицы

1. `shops` - хранит tenant/shop boundary.
2. `sellers` - Telegram sellers, привязанные к shops.
3. `products` - опциональный product catalog для сопоставления name/unit.
4. `voice_records` - audio/transcript/process status.
5. `sales` - parent sale record.
6. `sale_items` - отдельные product rows.
7. `audit_logs` - operational audit trail.

## 4. `shops`

1. Primary key: `id`.
2. Name идентифицирует магазин.
3. Используется как top-level tenant boundary.
4. Каждый seller принадлежит одному shop.
5. Каждая voice record принадлежит одному shop.
6. Каждая sale принадлежит одному shop.

## 5. `sellers`

1. Primary key: `id`.
2. `shop_id` references `shops`.
3. `telegram_id` связывает Telegram user.
4. `name` хранит display name.
5. `is_active` управляет доступом.
6. Bot использует `telegram_id`, чтобы резолвить seller.
7. WebApp session resolver может использовать seller, чтобы вывести shop.

## 6. `voice_records`

1. Primary key: `id`.
2. `shop_id` ограничивает row.
3. `seller_id` связывает seller.
4. `telegram_message_id` связывает Telegram message.
5. `audio_path` может хранить Supabase Storage path.
6. `audio_url` может хранить public/fallback URL.
7. `raw_text` хранит STT transcript.
8. `cleaned_text` хранит display text, очищенный parser.
9. `parser_json` хранит parser diagnostics.
10. `status` отражает processing state.
11. `error_message` хранит failure/fallback context.
12. `created_at` поддерживает period filters.

## 7. `sales`

1. Primary key: `id`.
2. `shop_id` ограничивает sale.
3. `seller_id` связывает seller.
4. `voice_record_id` связывает voice record.
5. `raw_text` дублирует полезный transcript context.
6. `cleaned_text` дублирует display text.
7. `total_amount` хранит текущий sale total.
8. `status` управляет lifecycle и исключает `cancelled`/`failed`; item status управляет revenue inclusion.
9. `created_at` поддерживает period filters.

## 8. `sale_items`

1. Primary key: `id`.
2. `sale_id` связывает parent sale.
3. `product_id` опционально связывает catalog.
4. `product_name` хранит display product name.
5. `quantity` хранит numeric quantity.
6. `unit` хранит normalized unit.
7. `price` хранит unit price.
8. `total` хранит quantity × price.
9. `confidence` хранит parser confidence или manual confidence.
10. `status` хранит item state.
11. `updated_at` меняется при edit/delete/restore.
12. `deleted_at` помечает soft delete.
13. `deleted_reason` хранит delete reason.
14. `deleted_previous_status` хранит restore target.

## 9. Канонические статусы sale

1. `processed` - sale не имеет active review items и может давать revenue через processed items.
2. `needs_review` - sale сохранена и всё ещё имеет review items; active processed items всё равно могут давать revenue.
3. `cancelled` - sale отменена пользователем и исключена из revenue.
4. `failed` - processing завершился ошибкой и исключён из revenue.
5. `pending` может существовать как legacy/base schema state, но текущий completed pipeline не должен его выдавать.

## 10. Канонические статусы item

1. `processed` - item может давать revenue, когда parent sale не `cancelled` и не `failed`.
2. `needs_review` - item исключён из revenue.
3. `needs_price` - legacy review-like state, исключён из revenue.
4. `failed` - item исключён из revenue.
5. `excluded` - soft-deleted item исключён из active report.

## 11. Soft delete

1. Soft delete никогда физически не удаляет `sale_items`.
2. Delete устанавливает `status = excluded`.
3. Delete устанавливает `deleted_at = now`.
4. Delete устанавливает `deleted_reason`.
5. Delete устанавливает `deleted_previous_status`.
6. Active report фильтрует `deleted_at is null`.
7. Legacy `excluded` с null `deleted_at` всё равно не active.
8. Restore очищает поля soft-delete.
9. Restore использует `deleted_previous_status` или fallback на `needs_review`.

## 12. Правило revenue

Item участвует в revenue только когда:

1. Parent sale принадлежит current shop.
2. Parent sale status не `cancelled` и не `failed`.
3. Item принадлежит scoped sale ids.
4. Item status равен `processed`.
5. Item имеет `deleted_at is null`.
6. Item имеет `total is not null`.
7. Item quantity/weight валиден.
8. Item `price` валиден или может быть выведен из `total / quantity`.

Никогда не учитывать:

1. Parent `cancelled`.
2. Parent `failed`.
3. Item `needs_review`.
4. Item `needs_price`.
5. Item `failed`.
6. Item `excluded`.
7. Любая deleted row.

## 13. Ограничение отчёта

1. WebApp вызывает `getReport`.
2. `getReport` резолвит current owner/seller из session.
3. Sales выбираются с `shop_id = owner.shopId`.
4. Items выбираются только по этим sale ids.
5. `scopeReportRows` проверяет, что shop каждой sale row совпадает с owner shop.
6. Cancelled/failed sales исключаются из active report scope.
7. Items из `needs_review` sales сохраняют собственный item status для report aggregation.
8. `buildSalesReport` агрегирует только active processed item rows.

## 14. Сохранение voice

1. Bot строит payload через `buildVoiceSaleRpcPayload`.
2. Payload включает shop id, seller id, telegram message id, audio data, transcript и resolved items.
3. Deterministic parser fallback должен разделить glued transcript в один payload item на product, когда есть evidence.
4. Bot вызывает RPC `save_voice_sale`.
5. RPC возвращает identifiers.
6. Code читает sale обратно.
7. Code читает sale_items count обратно.
8. Inserted `sale_items` ids логируются для diagnostics.
9. Mismatch выбрасывает error.
10. False success запрещён.

## 15. Mutation подтверждения

1. Выбрать sale по `id`, `shop_id`, `seller_id`.
2. Если уже processed, вернуть unchanged success.
3. Если уже cancelled, вернуть unchanged success.
4. Если failed, вернуть error.
5. Выбрать active items по `sale_id` и `deleted_at is null`.
6. Валидировать product, quantity/weight и price-or-total для каждого active item.
7. Если нет confirmable item, вернуть `Не удалось подтвердить: нет ни одной полной позиции.` и оставить rows unchanged.
8. Обновить каждый confirmable item до `processed`.
9. Оставить incomplete active items как `needs_review`.
10. Установить confidence в `1` на confirmable items.
11. Пересчитать item price/total, когда возможно.
12. Обновить sale `status = processed` только когда не осталось active review items; иначе оставить/установить `needs_review`.
13. Обновить sale `total_amount` до суммы active processed items.
14. Обновить voice record до того же final status, что и sale.
15. Повторно прочитать sale после updates; если DB state уже совпадает, вернуть success даже когда mutation вернула empty `data`.

## 16. Mutation отмены

1. Выбрать sale по `id`, `shop_id`, `seller_id`.
2. Если уже cancelled, вернуть unchanged success.
3. Если уже processed, вернуть unchanged success.
4. Если failed, вернуть error.
5. Выбрать active items.
6. Выполнить soft-delete каждого active item.
7. Обновить sale `status = cancelled`.
8. Обновить sale `total_amount = 0`.
9. Обновить voice record `status = cancelled`.

## 17. Обновление sale item

1. Выбрать item по `id`.
2. Отклонить, если deleted.
3. Выбрать parent sale в current shop.
4. Валидировать shop access.
5. Построить manual patch.
6. Сопоставить product catalog, если возможно.
7. Обновить active item с пересчитанным `total`, `confidence = 1` и `status = processed`, когда product/quantity/price валидны.
8. Parent `needs_review` sale остаётся in review, если остаются other active review items; сохранённый `processed` item может войти в revenue.
9. Вернуть updated row.
10. Пересчитать parent sale.
11. Записать audit log best effort.

## 18. Удаление sale item

1. Выбрать item по `id`.
2. Выбрать parent sale в current shop.
3. Валидировать shop access.
4. Построить excluded patch.
5. Обновить active item.
6. Пересчитать parent sale.
7. Записать audit log best effort.

## 19. Пересчёт

1. Читает active items.
2. Суммирует только `processed` item totals с valid `total`.
3. Current cancelled sale total становится zero.
4. Current failed sale total становится zero.
5. Current needs_review sale остаётся needs_review, пока остаются active review items.
6. Current processed sale может стать needs_review, если restored/edited active review items остаются.
7. Voice record status следует recalculated sale status.

## 20. RLS и доступ

1. Мутации во время выполнения используют server-side service role client.
2. Service role key никогда не раскрывается browser.
3. WebApp всё равно проверяет shop access server-side.
4. Client forms не несут authoritative shop id.
5. Bot callbacks выводят shop из seller lookup.

## 21. Ошибки

1. Отсутствующий admin client возвращает server error state.
2. Отсутствующий item возвращает not found state.
3. Отсутствующая sale возвращает not found state.
4. Supabase update, returning zero rows, становится not found/update failed.
5. Audit log failure логируется и не блокирует пользователя.
6. Отсутствующие soft-delete columns сломали бы delete; migrations должны это предотвращать.

## 22. Критерии приемки

1. Processed active item входит в revenue, когда parent sale не cancelled/failed.
2. Needs_review item не входит в revenue.
3. Cancelled sale не входит в revenue.
4. Failed sale не входит в revenue.
5. Deleted item не входит в active report.
6. Item update сохраняется после reload.
7. Item delete сохраняется после reload.
8. Report totals пересчитываются после update.
9. Report totals пересчитываются после delete.
10. Нет code path, который ссылается на отсутствующий `deleted_at`.

## 23. Вне области

1. Full accounting ledger.
2. Inventory reservations.
3. Physical delete flow.
4. Public client-side writes в business tables.
5. Schema reset.
