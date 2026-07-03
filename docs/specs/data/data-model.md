# Data Model

Data model построен вокруг одной voice-записи, parent sale и item-level строк. Выручка считается по `sale_items`, а parent sale status используется как lifecycle и как исключение для `cancelled`/`failed`.

## Создаваемые сущности

Одна Telegram voice запись создаёт:

1. `voice_records` - исходный/очищенный текст, parser JSON, статус pipeline, аудио metadata.
2. `sales` - parent sale record, seller/shop, текущий total amount.
3. Один или несколько `sale_items` - товарные позиции.
4. `audit_logs` - best-effort события pipeline и mutations.

Audio может быть сохранено в Supabase Storage bucket `voice-records`, но upload не является обязательным для продажи.

## `voice_records`

Хранит:

1. `shop_id`.
2. `seller_id`.
3. `telegram_message_id`.
4. `audio_path`.
5. `audio_url`.
6. `raw_text`.
7. `cleaned_text`.
8. `parser_json`.
9. `status`.
10. `error_message`.
11. `created_at`.

`voice_records.status` отражает итог pipeline или review decision.

## `sales`

Хранит:

1. `shop_id`.
2. `seller_id`.
3. `voice_record_id`.
4. `raw_text`.
5. `cleaned_text`.
6. `total_amount`.
7. `status`.
8. `created_at`.

`sales.total_amount` не является исходным parser total. Он пересчитывается по active processed items.

## `sale_items`

Хранит:

1. `sale_id`.
2. `product_id`.
3. `product_name`.
4. `quantity`.
5. `unit`.
6. `price`.
7. `total`.
8. `confidence`.
9. `status`.
10. `created_at`.
11. `updated_at`.
12. `deleted_at`.
13. `deleted_reason`.
14. `deleted_previous_status`.

`price` - unit price. `total` - итог по строке. `unit_price` и `total_price` в текущей схеме не используются.

## Parent statuses

`voice_records.status` и `sales.status`:

1. `pending` - техническое начальное состояние, не должно быть финальным состоянием текущего completed pipeline.
2. `processed` - запись готова; active processed items входят в отчёт.
3. `needs_review` - запись сохранена и содержит unresolved active items.
4. `cancelled` - запись отменена пользователем и не входит в отчёт.
5. `failed` - обработка завершилась ошибкой и не входит в отчёт.

## Item statuses

`sale_items.status`:

1. `processed` - позиция готова и может входить в отчёт.
2. `needs_review` - позицию нужно проверить.
3. `needs_price` - legacy состояние старых строк, в UI равно `Нужно проверить`.
4. `failed` - технически неудачная позиция, в UI равно `Нужно проверить`.
5. `excluded` - soft-deleted позиция.

Новые неполные позиции должны использовать `needs_review`, не `needs_price`.

## Readiness rule

Новая voice-позиция становится `processed`, если:

1. Товар осмысленный.
2. Количество или вес распознаны.
3. Цена распознана или есть total.
4. Total валиден.
5. `confidence >= 0.80`.

Иначе позиция сохраняется как `needs_review`.

## Units

Supported units:

1. `шт`.
2. `кг`.
3. `г`.

Normalization:

1. `бутылка`, `бутылки`, `бутылок` -> `шт`.
2. `килограмм`, `килограмма`, `килограммов` -> `кг`.
3. `грамм`, `грамма`, `граммов`, `гр` -> `г`.

Total:

1. `шт`: `quantity * price`.
2. `кг`: `quantity * price`.
3. `г`: `(quantity / 1000) * price`.

## Parser fallback

Deterministic parser fallback создаёт отдельную `sale_items` row для каждого товара, найденного по evidence в transcript.

Пример:

```text
Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.
```

Rows:

1. `Сникерс`, `3`, `шт`, `200`, `600`.
2. `Буханка хлеба`, `5`, `шт`, `50`, `250`.

Если часть фразы неполная, она сохраняется отдельной `needs_review` row, а не склеивается с валидным товаром.

## Mixed cart

Mixed cart - одна sale с готовыми и неполными items.

Правила:

1. Валидные items могут стать `processed`.
2. Неполные items остаются `needs_review`.
3. Parent sale может остаться `needs_review`.
4. Active processed items могут войти в revenue.
5. Неполные active items видны на вкладке `Проверка`.
6. Confirm не должен блокировать всю sale из-за одной плохой строки.

## Revenue rule

`sales.total_amount` равен сумме active processed items с валидным `total`.

Item входит в revenue, если:

1. Parent sale в текущем shop.
2. Parent sale не `cancelled`.
3. Parent sale не `failed`.
4. Item `status = processed`.
5. Item `deleted_at is null`.
6. Item `total` валиден.

Item не входит, если:

1. `needs_review`.
2. `needs_price`.
3. `failed`.
4. `excluded`.
5. Soft-deleted.
6. Parent sale cancelled.
7. Parent sale failed.

## WebApp edit

WebApp edit review item:

1. Сохраняет product name.
2. Сохраняет quantity.
3. Сохраняет unit.
4. Сохраняет price.
5. Пересчитывает total.
6. Ставит item `processed`.
7. Ставит confidence `1`.
8. Пересчитывает parent sale.

Такая позиция может войти в выручку сразу. Parent sale остаётся `needs_review`, если рядом ещё есть неполные active items.

## Cancel

Cancel review sale:

1. Переводит sale в `cancelled`.
2. Переводит voice record в `cancelled`.
3. Soft-delete active items.
4. Ставит `sales.total_amount = 0`.
5. Исключает всю voice-запись из revenue.

## Acceptance criteria

1. One voice can create multiple item rows.
2. Parser fallback preserves valid items and incomplete leftovers separately.
3. Parent `needs_review` does not block processed item revenue.
4. Cancelled and failed parents block revenue.
5. Soft-deleted rows never count.
6. Legacy `needs_price` remains readable but not used for new incomplete items.
