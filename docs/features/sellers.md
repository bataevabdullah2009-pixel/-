# Sellers

Страница `Продавцы` показывает статистику продавцов текущего server-derived магазина за выбранный период.

## Data source

`getSellerStats(filters)`:

1. Вызывает `requireOwner()`.
2. Получает current shop на сервере.
3. Читает sellers текущего shop.
4. Читает sales текущего shop за период.
5. Считает records count по seller.
6. Читает sale_items по sale ids.
7. Scope rows through `scopeReportRows()`.
8. Считает revenue по active processed items.
9. Возвращает sellers и error отдельно.

Страница не принимает client `shop_id`.

## Карточка продавца

Для каждого продавца выводится:

1. Имя.
2. Active/inactive state.
3. Last activity за выбранный период.
4. Количество записей.
5. Выручка.

Если активности за период нет, показывается `нет активности`.

## Период

DateFilter совпадает с отчётом:

1. Сегодня.
2. Вчера.
3. Неделя.
4. Месяц.
5. Выбранная дата.

Период влияет:

1. На records count.
2. На last activity.
3. На revenue.

## Revenue

Выручка продавца считается по тем же правилам, что report:

1. Parent sale должен быть в текущем shop.
2. Parent sale не `cancelled`.
3. Parent sale не `failed`.
4. Item `status = processed`.
5. Item `deleted_at is null`.
6. Item `total` валиден.

Не входят:

1. Review items.
2. Legacy `needs_price`.
3. Failed items.
4. Excluded items.
5. Soft-deleted rows.
6. Parent cancelled sales.
7. Parent failed sales.

Parent `needs_review` sale может дать revenue через active processed item.

## Access

WebApp resolver:

1. Сначала ищет active seller по Telegram user id.
2. Если seller найден, seller shop становится current shop.
3. Если seller отсутствует, resolver может использовать active owner binding.
4. Owner binding создаёт seller только в owner shop.
5. Fallback использует `DEFAULT_SELLER_ID` только server-side.
6. Fallback seller должен совпасть с `DEFAULT_SHOP_ID`.

Inactive seller/owner не получает доступ.

## Empty and error states

1. Нет sellers и нет ошибки -> empty state.
2. Auth error -> visible action notice.
3. Supabase error -> visible action notice.
4. Error state не должен выглядеть как `Продавцов нет`.

## Acceptance criteria

1. Sellers page uses server-derived shop.
2. Seller stats cannot leak another shop.
3. Revenue matches report calculation.
4. Cancelled/failed/deleted rows are excluded.
5. Parent `needs_review` with processed item can contribute revenue.
6. Inactive seller is shown as inactive if present in current shop list.
7. Missing seller list with error shows error, not empty success.
