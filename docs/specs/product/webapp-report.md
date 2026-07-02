# Product Spec: WebApp Report

## 1. Цель

1. WebApp должен быть мобильной панелью управления продажами магазина.
2. Главная задача WebApp - быстро показать выручку, товары, записи и продавцов.
3. WebApp не является местом подтверждения сомнительных voice-записей.
4. Подтверждение `needs_review` выполняется только в Telegram под исходным bot message.
5. Интерфейс должен быть чистым, компактным и пригодным для ежедневного использования на телефоне.

## 2. Роли

1. `seller` - продавец, который отправляет voice messages и смотрит WebApp.
2. `owner` - владелец магазина или старший пользователь с доступом к отчёту.
3. `bot` - Telegram bot, который создаёт записи и отправляет confirm/cancel buttons.
4. `system` - server-side code, который проверяет Telegram WebApp session и Supabase access.

## 3. Навигация

1. Нижняя мобильная навигация содержит три пункта.
2. Первый пункт: `Отчёт`.
3. Второй пункт: `Записи`.
4. Третий пункт: `Продавцы`.
5. Пункт `Проверка` отсутствует.
6. `/review` не является пользовательским экраном и перенаправляет на `/records`.
7. Desktop header содержит те же три раздела.
8. Диагностика Telegram не отображается в навигации.

## 4. Экран `Отчёт`

1. Route: `/daily-report`.
2. Root `/` рендерит тот же report page.
3. Верхний заголовок экрана: `Голосовой журнал продаж`.
4. Подзаголовок: `Сводка магазина`.
5. Shop name показывается как eyebrow.
6. Ошибка загрузки показывается action notice без падения страницы.
7. После ошибки фильтр периода остаётся доступным.
8. Основные данные грузятся server-side через `getReport(filters)`.

## 5. Summary cards

1. Summary содержит четыре карточки.
2. `Выручка` показывает `summary.totalRevenue`.
3. `Количество товаров` показывает `summary.totalQuantity`.
4. `Записей` показывает количество sales в выбранном периоде.
5. `Нужно проверить` показывает active review items.
6. Review card получает warning style, если count больше нуля.
7. Карточки компактные и не должны занимать половину мобильного экрана.
8. Значения форматируются через `formatCurrency` и `formatQuantity`.

## 6. Period filters

1. Фильтры периода находятся ниже summary/action toolbar.
2. Доступные presets: `Сегодня`, `Вчера`, `Неделя`, `Месяц`, `Год`.
3. Custom date выбирается через native `input type=date`.
4. Date submit button называется `Дата`.
5. Фильтры сохраняют существующие query params, кроме mutation notices.
6. На мобильном segmented controls могут горизонтально скроллиться.
7. Фильтры должны быть компактными.
8. Фильтры не должны визуально вытеснять report content.

## 7. Top products

1. Раздел называется `Топ товаров`.
2. Источник данных: `summary.rows`.
3. Сортировка в UI берёт top rows по revenue desc.
4. Строка показывает название товара, quantity + unit и revenue.
5. Review, cancelled, failed и deleted rows не попадают в топ.
6. Если данных нет, показывается EmptyState.

## 8. Sales for period

1. Раздел называется `Продажи за период`.
2. Показывает active processed sale items.
3. Items сортируются от свежих к старым по `created_at`.
4. Для каждого item используется `SaleItemCard`.
5. Если processed продаж нет, показывается EmptyState.
6. Review items не смешиваются с active revenue list.

## 9. Needs review block

1. Блок `Нужно проверить` показывается, если есть active review items.
2. Review block не содержит confirm/cancel buttons.
3. Блок содержит текстовый status pill `Подтвердите в Telegram`.
4. Items можно показать через обычные sale item cards.
5. Edit review item сохраняет поля, но не делает запись `processed`.
6. Revenue не меняется до Telegram `✅ Подтвердить`.
7. Delete review item soft-delete позицию и исключает её из active review list.

## 10. Deleted items

1. Deleted/excluded items показываются в details panel.
2. Panel не входит в active revenue.
3. Restore action оставлен для audit-safe восстановления soft-deleted rows.
4. Restored item получает previous status.
5. Если previous status был review, restored item не входит в выручку до Telegram confirm.

## 11. Экран `Записи`

1. Route: `/records`.
2. Экран показывает список voice sales.
3. Каждая запись показывает дату и время.
4. Каждая запись показывает продавца.
5. Каждая запись показывает `cleaned_text`, fallback на `raw_text`.
6. Каждая запись показывает status label.
7. Каждая запись показывает сумму.
8. Если сохранено audio, показывается `Прослушать аудио`.
9. Если есть товары, показывается disclosure `Товары`.
10. Disclosure содержит product, quantity, unit price и total.
11. `needs_review` запись получает badge `Нужно подтвердить в Telegram`.
12. Экран не содержит confirm/cancel controls.

## 12. Экран `Продавцы`

1. Route: `/sellers`.
2. Экран показывает продавцов текущего магазина.
3. Показывается имя продавца.
4. Показывается активность: `Активен` или `Отключён`.
5. Показывается последняя активность, если есть.
6. Показывается количество записей за период.
7. Показывается выручка за период.
8. Revenue считается только по active processed items.

## 13. Business logic

1. WebApp report не доверяет client-side `shop_id`.
2. Shop берётся из Telegram WebApp session.
3. `getReport` читает sales текущего shop.
4. `sale_items` читаются только через sale ids текущего shop.
5. `scopeReportRows` исключает cancelled/failed sales для report.
6. `scopeReportRows` не даёт processed-looking item из `needs_review` sale войти в выручку.
7. `buildSalesReport` агрегирует только `processed` items без `deleted_at`.
8. `needs_review` не входит в revenue.
9. `cancelled` не входит в revenue.
10. `failed` не входит в revenue.
11. `excluded` не входит в active list.

## 14. API and server logic

1. Report page calls `getReport(filters)`.
2. Records page calls `getRecords(filters)`.
3. Sellers page calls `getSellerStats(filters)`.
4. Date filters use shared `getDateRange`.
5. Item update uses `updateSaleItemAction`.
6. Item delete uses `excludeSaleItemAction`.
7. Restore uses `restoreSaleItemAction`.
8. Reset day uses `resetDayRevenueAction`.
9. Mutations revalidate `/daily-report` and `/records`.
10. Mutations return structured action state for inline UI.

## 15. Database tables

1. `sales` stores parent sale.
2. `voice_records` stores transcript/audio metadata.
3. `sale_items` stores product rows.
4. `sellers` stores Telegram sellers.
5. `shops` scopes data.
6. `products` can match product names and units.
7. `audit_logs` stores mutation audit entries.

## 16. Errors

1. Missing Telegram session shows a clear WebApp session message.
2. Invalid Telegram session asks user to reopen WebApp.
3. Seller not linked shows access error.
4. Supabase load failure shows `Не удалось загрузить отчёт`.
5. Item update failure keeps edit data visible.
6. Item delete failure keeps card visible.
7. Audio signed URL failure falls back to stored audio URL or hides audio button.

## 17. Edge cases

1. Sale exists with zero active items after delete.
2. Processed sale with all items deleted remains not review-required.
3. Needs_review sale with item status `processed` is still excluded from revenue.
4. Legacy `needs_price` is shown as review.
5. Legacy `excluded` without `deleted_at` is not active.
6. Deleted row with previous review status restores as review.
7. Empty report period shows EmptyState, not a blank page.
8. Date range uses Moscow calendar boundaries.

## 18. Acceptance criteria

1. Bottom navigation has exactly `Отчёт`, `Записи`, `Продавцы`.
2. `/daily-report` shows product title and summary cards.
3. Period filters are compact on mobile.
4. Needs review data is visible but not confirmable in WebApp.
5. Records page shows `Нужно подтвердить в Telegram` for review records.
6. Seller page shows records count and revenue.
7. Processed sale items enter revenue.
8. Needs_review sale items do not enter revenue.
9. Cancelled sale items do not enter revenue.
10. Deleted items do not enter revenue.
11. Debug UI is not visible to ordinary users.

## 19. Out of scope

1. WebApp confirm/cancel for review voice records.
2. Desktop-only admin dashboard.
3. Inventory management.
4. Product catalog CRUD.
5. Full accounting export.
