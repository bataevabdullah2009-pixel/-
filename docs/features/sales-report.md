# Sales Report

Экран `Отчёт` находится на `/daily-report` и является главным экраном WebApp. Он показывает состояние магазина за выбранный период и не скрывает ошибки авторизации или Supabase за пустыми метриками.

## Верхний блок

1. Название магазина берётся через `getCurrentShopName()`.
2. Заголовок экрана: `Сводка магазина`.
3. Подзаголовок показывает выбранный период.
4. `RefreshButton` даёт явное обновление.
5. DateFilter поддерживает сегодня, вчера, неделю, месяц и выбранную дату.
6. Для дня доступен action `Сбросить день`.
7. Сброс дня требует подтверждения.
8. Сброс дня soft-delete active items выбранного дня.
9. Сброс дня не удаляет `sales`.
10. Результат мутации показывается через `actionNotice`.

## Метрики

Основные карточки:

1. `Выручка`.
2. `Количество товаров`.
3. `Записей`.
4. `Нужно проверить`.

`Нужно проверить` подсвечивается только когда есть active review items. Review count не смешивается с revenue.

## Данные отчёта

`getReport(filters)`:

1. Вызывает `requireOwner()`.
2. Получает server-derived `shopId`.
3. Читает `sales` по `shop_id` и периоду.
4. Читает `sale_items` только по найденным sale IDs.
5. Проверяет, что каждая sale row принадлежит текущему shop.
6. Исключает parent sales со статусом `cancelled` или `failed`.
7. Передаёт items в `buildSalesReport()`.
8. Разделяет active и deleted items.
9. Возвращает error отдельно от пустого отчёта.

## Revenue rule

В итог входят только items, которые одновременно удовлетворяют условиям:

1. Parent sale принадлежит текущему shop.
2. Parent sale не `cancelled`.
3. Parent sale не `failed`.
4. Item status равен `processed`.
5. `deleted_at is null`.
6. `total` не `null`.
7. Количество или вес валидны.
8. Цена валидна или может быть восстановлена из `total / quantity`.

Не входят:

1. `needs_review`.
2. Legacy `needs_price`.
3. `failed`.
4. `excluded`.
5. Soft-deleted rows.
6. Parent `cancelled`.
7. Parent `failed`.

Parent sale со статусом `needs_review` не блокирует active `processed` items. Это важно для mixed cart: валидная позиция уже может входить в выручку, а неполная соседняя позиция остаётся в `Проверке`.

## Блоки экрана

1. `Продажи по дням` - compact bar chart по active processed items.
2. `Топ товаров` - до пяти товаров по выручке.
3. `Последние продажи` - active processed item cards, отсортированные по свежести.
4. `Нужно проверить` - active review items, если они есть.
5. `Исключённые товары` - details panel для soft-deleted rows.

## Топ товаров

1. Aggregation key использует `product_id`, если он есть.
2. Если `product_id` нет, key строится по нормализованному названию.
3. Product aliases нормализуют известные формы вроде `хлеба` -> `хлеб`.
4. Quantity суммируется до 3 знаков.
5. Revenue суммируется до 2 знаков.
6. Display name показывается в нормальном русском регистре.
7. Deleted и review rows не попадают в топ.

## Карточки товаров

1. Processed item показывает товар, количество, единицу, цену и total.
2. Review item показывает status badge.
3. Review item показывает причины: нет цены, нет количества/веса или не удалось выделить товар.
4. Edit открывается по карандашу.
5. Delete открывается по корзине.
6. Form state остаётся в карточке.
7. Ошибка сохранения отображается без очистки пользовательского ввода.
8. Успешное сохранение вызывает `router.refresh()`.

## Edit в отчёте

Processed item можно исправить карандашом. После сохранения:

1. `sale_items.product_name` обновляется.
2. `quantity` обновляется.
3. `unit` обновляется.
4. `price` обновляется.
5. `total` пересчитывается.
6. `confidence` становится `1`.
7. `status` становится `processed`.
8. Parent sale пересчитывается.
9. Report/review/records/sellers revalidate.

Review item тоже можно исправить карандашом. Если после edit item стал полным и `processed`, эта конкретная позиция может войти в выручку сразу после refresh. Parent sale остаётся `needs_review`, если в ней есть другие active неполные items.

## Delete и restore

Корзина не удаляет строку физически. Она выполняет soft delete:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
deleted_previous_status = previous status
```

Deleted item:

1. Исчезает из active report.
2. Не входит в выручку.
3. Не возвращается после reload.
4. Остаётся доступным в details panel, если страница показывает deleted items.
5. Может быть восстановлен action `restoreSaleItemAction`.

Restore очищает deleted metadata, возвращает previous status и пересчитывает parent sale.

## Сброс дня

`resetDayRevenueAction`:

1. Разрешён только для `today`, `yesterday` или `custom`.
2. Проверяет, что диапазон не больше одного дня.
3. Читает sales текущего shop за диапазон.
4. Soft-delete active items этих sales.
5. Ставит `deleted_reason = day_reset`.
6. Пересчитывает каждую parent sale.
7. Пишет audit log best-effort.
8. Возвращает readable message.

## Empty and error states

1. Нет данных за период - показывается empty state.
2. Ошибка auth - показывается action notice с причиной.
3. Ошибка Supabase - показывается action notice.
4. Error state не должен выглядеть как успешный нулевой отчёт.
5. Audio/storage failure не ломает сам отчёт.

## Acceptance criteria

1. Отчёт не принимает `shop_id` от клиента.
2. Отчёт показывает только данные текущего server-derived shop.
3. Parent `needs_review` sale может давать revenue через active `processed` item.
4. Parent `cancelled` и `failed` не дают revenue.
5. Soft-deleted item не виден как active.
6. Edit меняет Supabase row и сохраняется после reload.
7. Delete сохраняется после reload.
8. Restore возвращает item и пересчитывает итоги.
9. Сброс дня не удаляет sales физически.
10. Auth/DB error не превращается в empty state.
