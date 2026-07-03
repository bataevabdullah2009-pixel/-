# Manual Review

Manual review нужен для записей, где система не уверена в товаре, количестве, весе, цене, сумме или parser confidence. Review сохраняет данные, но не включает сомнительные позиции в выручку до исправления или подтверждения.

## Где выполняется review

1. В Telegram под сообщением сомнительной voice-записи.
2. В WebApp на вкладке `Проверка`.
3. Через WebApp edit внутри карточки товара.
4. Через bulk action `Подтвердить всё` на `/review`.

Telegram callback и WebApp review actions используют одинаковые item-level правила confirm/cancel, но разные источники авторизации. Telegram callback резолвит seller по `ctx.from.id`, WebApp actions резолвят shop через Telegram WebApp session или server fallback.

## Telegram message

Под сообщением бота есть только:

1. `✅ Подтвердить`.
2. `❌ Отмена`.

В review-message нет кнопки `Открыть отчёт`. Открытие отчёта остаётся в `/start`, reply keyboard и menu button.

Callback data:

```text
confirm:<sale_id>
cancel:<sale_id>
```

Legacy формат принимается для старых сообщений:

```text
voice_sale_review:confirm:<sale_id>
voice_sale_review:cancel:<sale_id>
```

## WebApp Проверка

`/review` показывает только active review items:

1. `deleted_at is null`.
2. `status` не `processed`.
3. `status` не `excluded`.
4. Parent sale входит в текущий shop scope.
5. Parent sale не `cancelled` и не `failed`.

Экран показывает:

1. Название магазина.
2. Количество позиций.
3. Количество parent sales.
4. Потенциальную сумму по review items, если total уже есть.
5. DateFilter.
6. Карточки позиций.
7. Action `Подтвердить`.
8. Action `Отмена`.
9. Bulk action `Подтвердить всё`.

## Карточка review item

Карточка показывает:

1. Название товара или `Без названия`.
2. Количество и единицу.
3. Цену или сообщение `цена не указана`.
4. Total или `Не входит в выручку`.
5. Badge `Нужно проверить`.
6. Причины review.
7. Карандаш для edit.
8. Корзину для soft delete.

Причины review:

1. Нет отдельного товара.
2. Нет количества или веса.
3. Нет цены.
4. Нет суммы.
5. Низкая confidence.

## Edit во время review

Карандаш открывает поля:

1. `Товар`.
2. `Количество`.
3. `Единица`.
4. `Цена, ₽`.

`Сохранить`:

1. Валидирует item id.
2. Валидирует product name.
3. Валидирует quantity `> 0`.
4. Валидирует price `> 0`.
5. Проверяет item -> sale -> shop на сервере.
6. Обновляет Supabase row.
7. Пересчитывает `total`.
8. Ставит item `processed`.
9. Ставит confidence `1`.
10. Пересчитывает parent sale.
11. Revalidate report, review, records и sellers.

Если parent sale остаётся `needs_review`, это не мешает исправленной item row войти в revenue. Другие неполные active items той же sale остаются на вкладке `Проверка`.

`Отмена` в edit form сбрасывает несохранённый ввод и закрывает форму. Ошибка сохранения показывает message внутри карточки и не очищает поля.

## Confirm

Confirm работает на уровне active `sale_items`, а не только на уровне parent sale.

Алгоритм:

1. Найти sale в текущем shop.
2. Если sale уже `processed`, вернуть `✅ Уже подтверждено`.
3. Если sale уже `cancelled`, вернуть unchanged success.
4. Если sale `failed`, вернуть ошибку.
5. Загрузить active items с `deleted_at is null`.
6. Исключить `status = excluded`.
7. Проверить каждый item отдельно.
8. Confirmable item должен иметь осмысленный товар.
9. Confirmable item должен иметь положительное количество или вес.
10. Confirmable item должен иметь цену или total, из которого можно вывести цену.
11. Если нет ни одного confirmable item, вернуть `Не удалось подтвердить: нет ни одной полной позиции.`
12. Все confirmable items обновить до `processed`.
13. Confidence confirmable items поставить `1`.
14. Пересчитать total.
15. Если неполных active items больше нет, parent sale/voice становятся `processed`.
16. Если неполные active items остались, parent sale/voice остаются `needs_review`.
17. `sales.total_amount` становится суммой active processed items.

Mixed cart подтверждается частично: хорошая позиция входит в выручку, плохая остаётся в review.

## Cancel

Cancel означает отмену всей voice-записи.

Алгоритм:

1. Найти sale в текущем shop.
2. Если sale уже `cancelled`, вернуть unchanged success.
3. Если sale уже `processed`, вернуть unchanged success и не менять выручку.
4. Если sale `failed`, вернуть ошибку в WebApp flow.
5. Загрузить active items.
6. Для каждого active item выполнить soft delete.
7. Parent sale перевести в `cancelled`.
8. Parent `total_amount` поставить `0`.
9. Voice record перевести в `cancelled`.
10. Revalidate affected routes.

После успешной отмены никакие active items этой sale не входят в выручку, включая те, которые до отмены были `processed`.

## Soft delete товара

Удаление отдельного товара через корзину не равно отмене всей voice-записи.

Patch:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
deleted_previous_status = previous status
updated_at = now()
```

Такой item:

1. Не входит в active report.
2. Не входит в review list.
3. Не входит в revenue.
4. Может быть восстановлен.
5. Не удаляет parent sale.

## Restore

Восстановление:

1. Доступно для soft-deleted item.
2. Проверяет item -> sale -> shop.
3. Возвращает `deleted_previous_status`.
4. Если previous status неизвестен, возвращает `needs_review`.
5. Очищает deleted metadata.
6. Пересчитывает parent sale.
7. Пишет audit log best-effort.

## Acceptance criteria

1. Review-message содержит только две кнопки.
2. Callback data короткие.
3. Legacy callback format не ломает старые сообщения.
4. WebApp `/review` не показывает processed active items.
5. WebApp `/review` не показывает deleted/excluded items.
6. Confirm mixed-cart не блокируется одной неполной позицией.
7. Confirm без полной позиции не меняет данные.
8. Cancel всей sale soft-delete active items.
9. Edit review item может сделать конкретную позицию revenue-ready.
10. Parent `needs_review` сохраняется, пока есть unresolved sibling items.
