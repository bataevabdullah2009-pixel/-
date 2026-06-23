# Report Calculation

Отчёт строится по `sale_items`, связанным с продажами выбранного `shop_id` и периода.

В выручку и количество входят только позиции:

- готовый status (`processed`; legacy `confirmed` совместим с расчётчиком);
- `deleted_at is null`;
- `price` и `total` не null.

`needs_review`, legacy `needs_price`, `failed` и soft-deleted позиции не входят в итог. Review-позиции показываются отдельно в блоке «Нужно проверить». Исключённые позиции показываются в отдельном expandable блоке и могут быть восстановлены.

После save/confirm/exclude/restore/reset сервер пересчитывает `sales.total_amount` и `sales.status`, затем инвалидирует `/daily-report` и `/records`.

Границы периода вычисляются в `Europe/Moscow`; начало включительно, конец не включительно.
