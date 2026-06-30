# Report Calculation

Статус: реализовано.

## Источник данных

Отчёт читает данные в два шага:

1. `sales` по server-derived `shop_id` и периоду.
2. `sale_items` только по найденным sale IDs.

Нельзя читать `sale_items` напрямую по client shop.

Нельзя принимать `shop_id` из query/body/header клиента.

## Период

Период считается по `Europe/Moscow`.

Граница периода — полуинтервал:

```text
[start, end)
```

Поддерживаются:

1. Сегодня.
2. Вчера.
3. Последние 7 дней.
4. Месяц.
5. Год.
6. Выбранная дата.

## Что входит в выручку

Позиция входит в выручку, если:

1. `sale_items.status = processed`.
2. `sale_items.deleted_at is null`.
3. `price is not null`.
4. `total is not null`.
5. `quantity > 0`.
6. Родительская sale не `cancelled`.
7. Родительская sale не `failed`.

Legacy `confirmed` поддерживается расчётчиком как processed-compatible статус.

## Что не входит

Не входят:

1. `needs_review`.
2. Legacy `needs_price`.
3. `failed`.
4. `excluded`.
5. Rows с `deleted_at`.
6. Parent sale `cancelled`.
7. Rows без цены.
8. Rows без total.

## Review items

Review items показываются отдельно.

Они не добавляются в `totalRevenue`.

Они не добавляются в `totalQuantity`.

Если WebApp edit сохранил поля review item, item остаётся review, пока Telegram callback не подтвердит sale.

## Confirm callback

После Telegram `✅ Подтвердить`:

1. Валидные items становятся `processed`.
2. Sale становится `processed`.
3. Voice record становится `processed`.
4. `sales.total_amount` пересчитывается.
5. Следующий report refresh включает items в выручку.

## Cancel callback

После Telegram `❌ Отмена`:

1. Sale становится `cancelled`.
2. Voice record становится `cancelled`.
3. Active items soft-deleted.
4. `sales.total_amount = 0`.
5. Report не показывает эти items активными.

## Update/delete/restore

После update/delete/restore/reset:

1. Сервер пересчитывает `sales.total_amount`.
2. Сервер пересчитывает `sales.status`.
3. Server Action делает revalidate `/daily-report`.
4. Server Action делает revalidate `/records`.
5. Client refresh показывает новые данные.

Processed item update меняет выручку.

Review item update сохраняет поля, но не меняет выручку до Telegram confirm.

Soft delete уменьшает выручку, если item входил в неё.

Restore возвращает previous status и влияет на выручку только если previous status был processed.

## Empty states

1. Нет sales за период — успешный пустой отчёт.
2. Есть sales, но нет active processed items — выручка 0.
3. Есть only review items — выручка 0 и блок «Нужно проверить».
4. Есть only deleted items — active list пуст, excluded block виден.
5. Auth/DB error — не empty state, а ошибка.

## Logs

Report log содержит:

1. Telegram user id.
2. Seller id.
3. Shop id.
4. Sales count.
5. Sale items count.
6. Date range.
7. Error reason.

Raw initData и секреты не логируются.

## Acceptance criteria

1. Processed active item входит в revenue.
2. Needs_review item не входит.
3. Cancelled sale не входит.
4. Deleted item не входит.
5. Delete пересчитывает totals.
6. Update processed item пересчитывает totals.
7. Update review item не добавляет revenue.
8. Confirm добавляет revenue.
9. Cancel сохраняет zero revenue.
10. Auth/DB error не выглядит как пустой отчёт.
