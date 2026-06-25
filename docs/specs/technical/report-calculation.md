# Report Calculation

Отчёт сначала выбирает `sales` по server-derived `shop_id` и периоду, затем читает `sale_items` только по найденным sale IDs.

В выручку и количество входят только позиции:

- готовый status (`processed`; legacy `confirmed` совместим с расчётчиком);
- `deleted_at is null`;
- `price` и `total` не null.

`needs_review`, legacy `needs_price`, `failed` и soft-deleted позиции не входят в итог. Review-позиции показываются отдельно в блоке «Нужно проверить». Исключённые позиции показываются в отдельном expandable блоке и могут быть восстановлены.

После save/confirm/exclude/restore/reset сервер пересчитывает `sales.total_amount` и `sales.status`, затем инвалидирует `/daily-report` и `/records`.

Активный список WebApp дополнительно исключает defensive legacy rows с `status = excluded`, даже если `deleted_at` отсутствует. Если у `sale` нет активных items, она не удаляется; отчёт показывает нулевые итоги и штатное empty state.

Границы периода вычисляются в `Europe/Moscow`; начало включительно, конец не включительно.

Report log содержит `telegramUserId`, `sellerId`, `shopId`, число sales, число sale_items, date range и error reason. InitData и секреты не логируются.
