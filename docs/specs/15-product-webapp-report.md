# Продуктовая спецификация: отчёт WebApp

## 1. Цель

1. WebApp должен быть мобильной панелью управления продажами магазина.
2. Главная задача WebApp - быстро показать выручку, товары, записи, проверки и продавцов.
3. WebApp является рабочей поверхностью владельца магазина, а не маркетинговой страницей.
4. Сомнительные `needs_review` voice-записи можно решить в Telegram callback или на вкладке `Проверка`.
5. Интерфейс должен быть чистым, компактным и пригодным для ежедневного использования на телефоне.
6. Визуальный стиль: premium SaaS dashboard на `#0B1020`, surfaces `#12192B`/`#161F34`, основной холодный accent `#5B8CFF`, warning `#F59E0B` только для review-состояний, красный только для ошибок/удаления, зелёный только для успешных действий.
7. Metadata icons используют `/favicon.svg` в той же цветовой системе, чтобы браузер не запрашивал отсутствующую иконку.

## 2. Роли

1. `seller` - продавец, который отправляет voice messages и смотрит WebApp.
2. `owner` - владелец магазина или старший пользователь с доступом к отчёту и review actions.
3. `bot` - Telegram bot, который создаёт записи и отправляет confirm/cancel buttons.
4. `system` - server-side code, который проверяет Telegram WebApp session и Supabase access.

## 3. Навигация

1. Нижняя мобильная навигация содержит четыре пункта.
2. Первый пункт: `Отчёт`.
3. Второй пункт: `Проверка`.
4. Третий пункт: `Записи`.
5. Четвёртый пункт: `Продавцы`.
6. `/review` является пользовательским экраном для active `needs_review`.
7. Desktop header содержит те же четыре раздела.
8. Диагностика Telegram не отображается в обычной навигации.

## 4. Экран `Отчёт`

1. Route: `/daily-report`.
2. Root `/` рендерит тот же report page.
3. Верхний заголовок экрана: `Голосовой журнал продаж`.
4. Подзаголовок: `Сводка магазина`.
5. Shop name показывается как контекст магазина.
6. Период показывается один раз без дублирования заголовков.
7. Ошибка загрузки показывается action notice без падения страницы.
8. Основные данные грузятся server-side через `getReport(filters)`.

## 5. Summary-карточки

1. Summary содержит четыре компактные карточки 2x2.
2. `Выручка` показывает `summary.totalRevenue`.
3. `Количество товаров` показывает `summary.totalQuantity`.
4. `Записей` показывает количество sales в выбранном периоде.
5. `Нужно проверить` показывает active review items.
6. Review card получает warning style, если count больше нуля.
7. Карточки не должны занимать половину мобильного экрана.
8. Значения форматируются через `formatCurrency` и `formatQuantity`.

## 6. Фильтры периода

1. Фильтры периода находятся ниже summary/action toolbar.
2. Доступные presets: `Сегодня`, `Вчера`, `Неделя`, `Месяц`.
3. Custom date выбирается через native `input type=date`.
4. Date submit button называется `Дата`.
5. Фильтры сохраняют существующие query params, кроме mutation notices.
6. На мобильном segmented controls могут горизонтально скроллиться.
7. Фильтры должны быть компактными.
8. Фильтры не должны визуально вытеснять содержимое отчёта.

## 7. Аналитика

1. Sparkline/bar chart строится по дневной выручке из processed active rows.
2. Один столбец не растягивается на всю ширину экрана.
3. Каждый столбец показывает день и сумму.
4. Если данных мало или нет, показывается аккуратный EmptyState.
5. График использует restrained accent, а не сплошную оранжевую заливку.

## 8. Топ товаров

1. Раздел называется `Топ товаров`.
2. Источник данных: `summary.rows`.
3. Показывается максимум 5 товаров.
4. Сортировка в UI берёт top rows по revenue desc.
5. Строка показывает название товара, quantity + unit и revenue.
6. Длинные названия обрезаются через line clamp до двух строк.
7. Review, cancelled, failed и deleted rows не попадают в топ.
8. Если данных нет, показывается EmptyState.

## 9. Продажи за период

1. Раздел называется `Продажи за период`.
2. Показывает active processed sale items.
3. Items сортируются от свежих к старым по `created_at`.
4. Для каждого item используется `SaleItemCard`.
5. В обычном состоянии справа доступны только `✏️` и `🗑`.
6. Если processed продаж нет, показывается EmptyState.
7. Review items не смешиваются с active revenue list.

## 10. Экран `Проверка`

1. Route: `/review`.
2. Экран показывает только active `needs_review` items из текущего shop и периода.
3. Каждая позиция показывается отдельной компактной карточкой.
4. Item можно отредактировать через `SaleItemCard`.
5. Item можно исключить через `status = excluded` и `deleted_at`.
6. Карточка review item показывает, что распознано и чего не хватает: цена, количество/вес или отдельный товар.
7. Для каждой parent sale доступны `Подтвердить` и `Отмена`.
8. Если есть несколько review sales, доступна `Подтвердить всё`.
9. `Подтвердить` вызывает `confirmReviewSaleAction`.
10. `Отмена` вызывает `cancelReviewSaleAction`.
11. Actions используют тот же service-layer contract, что Telegram callbacks.
12. После action revalidate выполняется для `/review`, `/daily-report`, `/records`, `/sellers`.
13. Если sale содержит валидные и неполные items, валидные items подтверждаются и входят в выручку, неполные остаются `needs_review`.
14. Отменённая запись не входит в выручку.

## 11. Удалённые items

1. Deleted/excluded items показываются в details panel там, где это уместно для аудита.
2. Panel не входит в active revenue.
3. Restore action оставлен для audit-safe восстановления soft-deleted rows.
4. Restored item получает previous status.
5. Если previous status был review, restored item остаётся review item и не входит в выручку, пока его не исправят или не подтвердят.

## 12. Экран `Записи`

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
11. `needs_review` запись получает понятный review badge.
12. Товары раскрываются компактно и не слипаются в длинные блоки.

## 13. Экран `Продавцы`

1. Route: `/sellers`.
2. Экран показывает продавцов текущего магазина.
3. Показывается имя продавца.
4. Показывается активность: `Активен` или `Отключён`.
5. Показывается последняя активность, если есть.
6. Показывается количество записей за период.
7. Показывается выручка за период.
8. Revenue считается только по active processed items.

## 14. Бизнес-логика

1. WebApp report не доверяет client-side `shop_id`.
2. Shop берётся из Telegram WebApp session.
3. `getReport` читает sales текущего shop.
4. `sale_items` читаются только через sale ids текущего shop.
5. `scopeReportRows` исключает cancelled/failed sales для report.
6. `scopeReportRows` исключает parent `cancelled`/`failed` и считает revenue по active item status.
7. Mixed sale может оставаться `needs_review`: `processed` items входят в revenue, `needs_review` items остаются видимыми в review list.
8. `buildSalesReport` агрегирует только `processed` items без `deleted_at` и с валидным `total`.
9. Item `needs_review` не входит в revenue.
10. Parent `cancelled` не входит в revenue.
11. Parent `failed` не входит в revenue.
12. `excluded` не входит в active list.

## 15. API и серверная логика

1. Страница отчёта вызывает `getReport(filters)`.
2. Страница проверки вызывает `getReviewItems(filters)`.
3. Страница записей вызывает `getRecords(filters)`.
4. Страница продавцов вызывает `getSellerStats(filters)`.
5. Date filters используют общий `getDateRange`.
6. Item update использует `updateSaleItemAction`.
7. Item delete использует `excludeSaleItemAction`.
8. Restore uses `restoreSaleItemAction`.
9. Reset day использует `resetDayRevenueAction`.
10. Review confirm использует `confirmReviewSaleAction`.
11. Review cancel использует `cancelReviewSaleAction`.
12. Bulk review confirm использует `confirmAllReviewSalesAction`.
13. Mutations делают revalidate affected routes.
14. Mutations возвращают structured action state или redirect с safe query params.

## 16. Таблицы базы данных

1. `sales` хранит parent sale.
2. `voice_records` хранит transcript/audio metadata.
3. `sale_items` хранит product rows.
4. `sellers` хранит Telegram sellers.
5. `shops` ограничивает data.
6. `products` может сопоставлять product names and units.
7. `audit_logs` хранит mutation audit entries.

## 17. Ошибки

1. Отсутствующая Telegram session показывает понятное сообщение WebApp session.
2. Некорректная Telegram session просит пользователя заново открыть WebApp.
3. Seller not linked показывает access error.
4. Supabase load failure показывает `Не удалось загрузить отчёт`.
5. Item update failure оставляет edit data видимыми.
6. Item delete failure оставляет карточку видимой.
7. Review action failure возвращает назад с readable message.
8. Audio signed URL failure переключается на stored audio URL или скрывает audio button.

## 18. Крайние случаи

1. Sale существует с нулём active items после delete.
2. Processed sale со всеми удалёнными items остаётся not review-required.
3. Needs_review sale с active item status `processed` учитывает этот item в revenue.
4. Legacy `needs_price` показывается как review.
5. Legacy `excluded` без `deleted_at` не считается active.
6. Deleted row с previous review status восстанавливается как review.
7. Empty report period показывает EmptyState, а не пустую страницу.
8. Date range использует границы московского календаря.
9. Повторное review action идемпотентно и не искажает revenue.

## 19. Критерии приемки

1. Нижняя навигация содержит ровно `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
2. `/daily-report` показывает один product title, контекст магазина, компактные summary cards и chart labels.
3. Фильтры периода компактны на mobile.
4. `/review` показывает только active review positions.
5. `/review` может confirm, cancel и bulk-confirm review sales через server actions.
6. Страница records показывает review state без дублирования report controls.
7. Страница seller показывает records count и revenue.
8. Processed sale items входят в revenue.
9. Needs_review sale items входят в revenue только когда сам item имеет `processed`.
10. Cancelled sale items не входят в revenue.
11. Deleted/excluded items не входят в revenue.
12. Debug UI не виден обычным пользователям.

## 20. Вне области

1. Desktop-only admin dashboard.
2. Inventory management.
3. Product catalog CRUD.
4. Full accounting export.
5. Физическое удаление sale data.
