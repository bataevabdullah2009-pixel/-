# База данных

Статус: реализовано.

## Цель

Описать фактическую Supabase/Postgres схему, которую используют Telegram bot, WebApp и отчёт.

Spec не описывает желаемую будущую схему.

Если код обращается к колонке, она должна быть здесь или в migration.

## Основные таблицы

1. `shops`.
2. `sellers`.
3. `owners`.
4. `products`.
5. `voice_records`.
6. `sales`.
7. `sale_items`.
8. `audit_logs`.
9. `storage.objects` для voice audio.

## Роли доступа

1. `service_role` выполняет server-side bot/WebApp операции.
2. `anon` и `authenticated` не получают прямой доступ к бизнес-таблицам после hardening.
3. RLS включён на public tables.
4. Прикладной сервер выполняет authorization до service-role запроса.
5. Client не получает service role key.

## `shops`

Назначение: магазин.

Ключевые поля:

1. `id uuid`.
2. `name text`.
3. `created_at timestamptz`.

`shop_id` используется как boundary данных.

Клиентский ввод `shop_id` не доверенный.

## `sellers`

Назначение: Telegram-продавцы магазина.

Ключевые поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `telegram_id bigint`.
4. `name text`.
5. `is_active boolean`.
6. `created_at timestamptz`.

Telegram bot ищет seller по `telegram_id`.

При `DEMO_MODE=false` неизвестный seller не создаёт продажу.

## `owners`

Назначение: owner binding для WebApp.

Ключевые поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `telegram_id bigint`.
4. `name text`.
5. `is_active boolean`.
6. `created_at timestamptz`.
7. `updated_at timestamptz`.

Если seller отсутствует, но owner active, WebApp может создать seller только в owner shop.

## `voice_records`

Назначение: исходная voice-запись и результаты распознавания.

Ключевые поля:

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

Допустимые статусы:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

`cancelled` добавлен migration `20260630120000_add_cancelled_voice_sale_status.sql`.

## `sales`

Назначение: родительская продажа.

Ключевые поля:

1. `id uuid`.
2. `shop_id uuid`.
3. `seller_id uuid`.
4. `voice_record_id uuid`.
5. `raw_text text`.
6. `cleaned_text text`.
7. `total_amount numeric(12,2)`.
8. `status text`.
9. `created_at timestamptz`.

Допустимые статусы:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

`sales.total_amount` хранит агрегат активных processed items.

Для `needs_review`, `cancelled` и `failed` он не должен создавать выручку.

Отменённая запись хранится как `sales.status = cancelled`, а её active items исключаются soft delete.

## `sale_items`

Назначение: товарные позиции продажи.

Ключевые поля:

1. `id uuid`.
2. `sale_id uuid`.
3. `product_id uuid null`.
4. `product_name text`.
5. `quantity numeric(12,3)`.
6. `unit text`.
7. `price numeric(12,2) null`.
8. `total numeric(12,2) null`.
9. `confidence numeric(3,2)`.
10. `status text`.
11. `created_at timestamptz`.
12. `updated_at timestamptz`.
13. `deleted_at timestamptz null`.
14. `deleted_reason text null`.
15. `deleted_previous_status text null`.

Допустимые item statuses:

1. `processed`.
2. `needs_price` legacy.
3. `needs_review`.
4. `failed`.
5. `excluded`.

В проекте нет колонок:

1. `name`.
2. `unit_price`.
3. `total_price`.

Код использует:

1. `product_name`.
2. `quantity`.
3. `price`.
4. `total`.
5. `status`.
6. `deleted_at`.
7. `updated_at`.

## Soft delete

Удаление товара из активного отчёта:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
deleted_previous_status = <previous status>
updated_at = now()
```

Физический `DELETE` не используется.

`deleted_reason` допускает:

1. `manual` для legacy rows.
2. `excluded_by_owner`.
3. `day_reset`.

`deleted_previous_status` допускает previous item statuses без `excluded`.

## Save voice sale

Функция `public.save_voice_sale(...)`:

1. Проверяет, что seller active.
2. Проверяет принадлежность seller к shop.
3. Создаёт `voice_records`.
4. Создаёт `sales`.
5. Создаёт `sale_items`.
6. Возвращает `voice_record_id` и `sale_id`.

Bot после RPC выполняет read-back:

1. Читает созданную sale по id/shop/seller/voice.
2. Читает количество sale_items.
3. Сравнивает с ожидаемым количеством.
4. Только после этого отвечает success.

## Confirm voice sale

Telegram/WebApp confirm:

1. Читает sale по `sale_id`, `seller_id`, `shop_id`.
2. Читает active items.
3. Валидные items получает `status = processed`.
4. Items получает `confidence = 1`.
5. Sale получает `status = processed`.
6. Voice record получает `status = processed`.
7. `total_amount` становится суммой валидных items.

Callback/WebApp action не принимает `shop_id`.

## Cancel voice sale

Telegram/WebApp cancel:

1. Читает sale по `sale_id`, `seller_id`, `shop_id`.
2. Soft-delete active items.
3. Sale получает `status = cancelled`.
4. Voice record получает `status = cancelled`.
5. `total_amount = 0`.

Cancel сохраняет запись для аудита, но не добавляет её в активную выручку.

## WebApp item update

Update товара:

1. Проверяет item id.
2. Проверяет item не soft-deleted.
3. Проверяет sale -> shop.
4. Обновляет название, количество, цену и сумму.
5. Если родительская sale `processed`, item становится `processed`.
6. Если родительская sale `needs_review`, item остаётся `needs_review`.
7. Это не подтверждает голосовую запись.
8. После update sale пересчитывается.

## Report calculation

Report читает:

1. `sales` по `shop_id` и периоду.
2. `sale_items` по найденным sale IDs.

В выручку входят только:

1. `sale_items.status = processed`.
2. `deleted_at is null`.
3. `price is not null`.
4. `total is not null`.

Не входят:

1. `needs_review`.
2. `needs_price`.
3. `failed`.
4. `excluded`.
5. `deleted_at is not null`.
6. Parent sale `cancelled`.

## Миграции

Актуальные важные migrations:

1. `001_init.sql` — базовая схема.
2. `20260618082931_add_sale_item_soft_delete.sql` — soft-delete поля.
3. `20260619132225_align_sale_item_update_and_exclusion.sql` — `excluded`, `updated_at`.
4. `20260620135556_stabilize_sales_flow.sql` — owners, RPC, hardening.
5. `20260623221651_repair_complete_single_item_sales.sql` — repair старых single-item продаж.
6. `20260630120000_add_cancelled_voice_sale_status.sql` — `cancelled` для sale/voice statuses.
7. `20260630153000_ensure_sale_item_soft_delete_columns.sql` — idempotent гарантия `deleted_at`, `deleted_reason`, `deleted_previous_status`, `updated_at` и soft-delete constraints.

Миграции не должны удалять production data.

DDL должен быть идемпотентным там, где это возможно.

## Ошибки и edge cases

1. Несуществующая колонка должна ловиться build/live schema check.
2. Supabase update считается успехом только после `.select().single()`.
3. Чужой item не изменяется.
4. Чужая sale не подтверждается callback.
5. Repeat callback не создаёт дубли.
6. Sale с нулём active items остаётся валидной записью.
7. Audit log failure не отменяет основную мутацию.
8. Storage failure не отменяет voice sale.
9. Невалидный parser JSON создаёт review запись.

## Acceptance criteria

1. `cancelled` проходит constraints для `sales` и `voice_records`.
2. `sale_items.deleted_at` существует.
3. Delete использует soft delete.
4. Confirm переводит sale/voice в `processed`.
5. Cancel переводит sale/voice в `cancelled`.
6. Cancel soft-delete items.
7. Report игнорирует deleted/review/cancelled/failed данные.
8. WebApp update сохраняет реальные поля схемы.
9. Reload показывает состояние из БД.
10. Service role не доступен клиенту.

## Не входит в scope

1. Новые warehouse tables.
2. Платежи.
3. Клиентская база.
4. Физическое удаление продаж.
5. Reset production базы.
6. Прямая client-side Supabase мутация бизнес-таблиц.
