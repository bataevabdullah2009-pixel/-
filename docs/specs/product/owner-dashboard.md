# Owner Dashboard

Статус: реализовано в Telegram WebApp через Next.js App Router.

Owner dashboard - это пользовательский WebApp, который владелец или разрешённый продавец открывает из Telegram. Dashboard не является публичной аналитической страницей: все чтения и изменения проходят через server-side context, полученный из Telegram initData, owner/seller binding или явно включённого fallback.

## Цели экрана

1. Показать выручку магазина за выбранный период.
2. Показать количество проданных товаров.
3. Показать количество voice-sale записей.
4. Показать сколько позиций нужно проверить.
5. Дать владельцу быстрый доступ к review.
6. Дать владельцу журнал исходных голосовых записей.
7. Дать владельцу статистику продавцов.
8. Позволить исправить ошибочно распознанный товар.
9. Позволить исключить товар из активного отчёта без физического удаления.
10. Позволить восстановить soft-deleted товар.
11. Позволить сбросить выручку за один день через soft delete.
12. Не показывать чужой магазин даже при подмене query/form data.

## Навигация

Нижняя навигация содержит четыре пользовательских раздела:

1. `Отчёт` -> `/daily-report`.
2. `Проверка` -> `/review`.
3. `Записи` -> `/records`.
4. `Продавцы` -> `/sellers`.

Root `/` ведёт к отчёту. Diagnostics не входит в основную навигацию.

## Отчёт

Owner видит:

1. Название текущего магазина.
2. Период отчёта.
3. Метрику `Выручка`.
4. Метрику `Количество товаров`.
5. Метрику `Записей`.
6. Метрику `Нужно проверить`.
7. Фильтр периода.
8. Refresh action.
9. Мини-график продаж по дням.
10. Топ товаров.
11. Последние активные продажи.
12. Блок review items, если есть незавершённые позиции.
13. Блок исключённых товаров, если есть soft-deleted rows.

Фильтр периода поддерживает:

1. Сегодня.
2. Вчера.
3. Последние 7 дней.
4. Месяц.
5. Выбранную дату.

## Правила выручки

Dashboard считает revenue на item level:

1. Parent sale должен быть в текущем shop.
2. Parent sale не должен быть `cancelled`.
3. Parent sale не должен быть `failed`.
4. Item должен быть active.
5. Item `deleted_at` должен быть `null`.
6. Item `status` должен быть `processed`.
7. Item `total` должен быть валидным.
8. Quantity/weight должны быть валидными.

Parent sale со статусом `needs_review` может иметь уже processed sibling item. Такая позиция входит в выручку, пока неполные sibling items остаются в `Проверке`.

## Проверка

Вкладка `Проверка` показывает active review items:

1. Не `processed`.
2. Не `excluded`.
3. Не soft-deleted.
4. В parent sale текущего shop.
5. В периоде фильтра.

Owner может:

1. Подтвердить одну запись.
2. Отменить одну запись.
3. Подтвердить все видимые записи.
4. Отредактировать отдельную позицию.
5. Исключить отдельную позицию.

Confirm работает по active items. Если в mixed sale есть одна валидная позиция и одна неполная, confirm переводит валидную позицию в `processed`, пересчитывает `total_amount` и оставляет неполную позицию в `needs_review`.

Если нет ни одной полной позиции, confirm возвращает `Не удалось подтвердить: нет ни одной полной позиции.` и не меняет строки.

## Журнал записей

Вкладка `Записи` показывает:

1. Дату и время.
2. Продавца.
3. Распознанный текст.
4. Raw text fallback.
5. Пользовательский статус.
6. Total amount.
7. Audio link, если аудио сохранено.
8. Раскрываемый список товаров.

Журнал не подтверждает и не отменяет voice sale. Для review decision используется вкладка `Проверка` или Telegram callback.

## Продавцы

Вкладка `Продавцы` показывает:

1. Имя продавца.
2. Активность.
3. Последнюю активность за период.
4. Количество записей за период.
5. Выручку за период.

Выручка продавца считается по тем же item-level правилам, что dashboard report. Review, cancelled, failed и deleted rows не входят.

## Редактирование товара

Карандаш раскрывает compact form:

1. `Товар`.
2. `Количество`.
3. `Единица`.
4. `Цена, ₽`.

Сохранение:

1. Проверяет session.
2. Проверяет item exists.
3. Проверяет parent sale.
4. Проверяет shop access.
5. Валидирует product name.
6. Валидирует quantity.
7. Валидирует price.
8. Нормализует unit.
9. Пересчитывает `total`.
10. Ставит `status = processed`.
11. Ставит `confidence = 1`.
12. Обновляет `updated_at`.
13. Пересчитывает parent sale.
14. Revalidate `/daily-report`, `/review`, `/records`, `/sellers`.

Если parent sale ещё `needs_review`, обычный edit не подтверждает всю voice-запись. Он делает только исправленную item row готовой. Эта item row может войти в revenue, а соседние неполные rows остаются в review.

## Удаление и восстановление товара

Корзина раскрывает локальное подтверждение `Удалить товар из отчёта?`.

Delete:

1. Не удаляет row физически.
2. Ставит `status = excluded`.
3. Ставит `deleted_at`.
4. Ставит `deleted_reason = excluded_by_owner`.
5. Сохраняет `deleted_previous_status`.
6. Пересчитывает parent sale.
7. Пишет audit log best-effort.

Restore:

1. Доступен для soft-deleted rows в details panel.
2. Возвращает previous status.
3. Очищает deleted metadata.
4. Пересчитывает parent sale.
5. Обновляет экран через revalidation.

## Сброс дня

Owner может сбросить выручку за один день только для однодневного диапазона.

`resetDayRevenueAction`:

1. Принимает period/date из формы.
2. Разрешает только `today`, `yesterday`, `custom`.
3. Проверяет корректность custom даты.
4. Вычисляет диапазон в `Europe/Moscow`.
5. Ограничивает диапазон одним днём.
6. Находит sales текущего shop.
7. Soft-delete active items.
8. Ставит `deleted_reason = day_reset`.
9. Пересчитывает parent sales.
10. Пишет audit log.
11. Возвращает readable message.

## Ошибки

Dashboard должен показывать ошибки явно:

1. Missing Telegram initData -> открыть WebApp внутри Telegram.
2. Invalid initData -> закрыть и открыть отчёт заново.
3. Seller not linked -> нет доступа к магазину.
4. Seller inactive -> доступ отключён.
5. Shop not found -> магазин не найден.
6. Supabase admin missing -> серверная ошибка действия.
7. DB load failure -> сообщение об ошибке, не empty state.

## Security expectations

1. Client не передаёт доверенный `shop_id`.
2. Hidden form fields не являются authority.
3. Server Actions повторно проверяют ownership.
4. Supabase service role key не попадает в browser.
5. Raw initData не логируется.
6. Debug UI скрыт без `DEBUG_TELEGRAM_WEBAPP=true`.
7. Fallback mode требует server env.
8. Fallback seller должен совпасть с fallback shop.

## Acceptance criteria

1. Owner видит только один server-derived shop.
2. Report counts совпадают с item-level revenue rules.
3. Review count показывает active unresolved items.
4. Edit сохраняется после reload.
5. Delete сохраняется после reload.
6. Restore возвращает item в active/deleted состояние согласно previous status.
7. Reset day не удаляет sales физически.
8. Records journal показывает исходный voice context.
9. Sellers stats не включают cancelled/failed/deleted rows.
10. Auth/DB errors не маскируются как пустой успешный dashboard.

Подробные связанные specs: [`webapp-report.md`](./webapp-report.md), [`sale-item-editing.md`](./sale-item-editing.md), [`telegram-confirmation-flow.md`](./telegram-confirmation-flow.md), [`../technical/webapp-api.md`](../technical/webapp-api.md).
