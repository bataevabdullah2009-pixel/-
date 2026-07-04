# Продуктовая спецификация: редактирование позиции продажи

## 1. Цель

1. Пользователь должен быстро исправить товар, количество или цену в WebApp.
2. Исправление должно сохраняться в Supabase.
3. Сумма позиции должна пересчитываться сразу после сохранения.
4. Общая выручка должна пересчитываться после update/delete.
5. Удаление товара должно исключать позицию из active отчёта без физического удаления.
6. Review voice-запись не должна подтверждаться через редактирование.

## 2. Роли

1. `seller` или `owner` открывает WebApp.
2. `system` проверяет Telegram WebApp session.
3. `Supabase` хранит sale item rows.
4. `report` пересчитывает выручку.

## 3. Область UI

1. Компонент: `SaleItemCard`.
2. Используется на странице отчёта.
3. Используется для active processed items.
4. Используется для review items в блоке `Нужно проверить`.
5. Не используется как поверхность подтверждения отдельной позиции.

## 4. Обычный режим карточки

1. Показывает название товара.
2. Показывает количество.
3. Показывает unit.
4. Показывает цену за единицу.
5. Показывает сумму.
6. Справа показывает `✏️`.
7. Справа показывает `🗑`.
8. Не содержит больших постоянных кнопок.
9. Не содержит `Подтвердить позицию`.
10. Не содержит текстовую ссылку `Исключить из отчёта`.

Пример:

```text
Сникерс
5 шт × 100 ₽
500 ₽                         ✏️ 🗑
```

## 5. Режим редактирования

1. Открывается только по `✏️`.
2. Повторное нажатие закрывает режим редактирования.
3. Панель удаления закрывается при открытии режима редактирования.
4. Режим редактирования компактный и не раскрыт по умолчанию.
5. Поля:
   - `Товар`;
   - `Количество`;
   - `Единица`;
   - `Цена, ₽`.
6. Кнопки:
   - `Сохранить`;
   - `Отмена`.
7. `Отмена` сбрасывает форму и закрывает режим редактирования.
8. Ошибка не очищает введённые данные.
9. Успех закрывает режим редактирования и вызывает `router.refresh()`.

## 6. Валидация

1. `itemId` обязателен.
2. `productName` обязателен.
3. `quantity` должна быть finite number.
4. `quantity` должна быть больше нуля.
5. `unit` должна быть одной из поддерживаемых единиц `шт`, `кг`, `г`.
6. `price` должна быть finite number.
7. `price` должна быть больше нуля.
7. Пустое название товара возвращает validation error.
8. Некорректная цена возвращает validation error.
9. Deleted item нельзя обновить без restore.

## 7. Поведение обновления

1. Client отправляет `updateSaleItemAction`.
2. Action вызывает `updateSaleItem`.
3. Server вызывает `requireOwner`.
4. Server получает Supabase admin client.
5. Server загружает текущий item.
6. Server проверяет, что item не deleted.
7. Server загружает sale context текущего магазина.
8. Server вызывает `requireShopAccess`.
9. Server строит patch через `buildManualSaleItemPatch`.
10. Server ищет product match в `products`.
11. Server обновляет `sale_items`.
12. Update фильтруется по `id`.
13. Update требует `deleted_at is null`.
14. Update возвращает updated row через `.select(...).single()`.
15. После update вызывается `recalculateSale`.
16. Audit log пишется best effort.

## 8. Статус после обновления

1. Если parent sale `processed`, item остаётся `processed`.
2. Если пользователь сохранил валидные `product_name`, `quantity`, `unit` и `price`, item получает `processed` даже внутри parent sale `needs_review`.
3. Редактирование не подтверждает review voice-запись и не переводит parent sale в `processed`.
4. Review sale может остаться `needs_review`, но сохранённый `processed` item пересчитывает revenue сразу.
5. Parent sale становится `processed`, только если после сохранения не осталось active review items.
6. Для `unit = г` сумма считается как `quantity / 1000 * price`; `price` трактуется как цена за кг.
7. Cancelled sale не должен получить revenue через update.
8. Failed sale не должен получить revenue через update.

## 9. Пересчёт

1. `recalculateSale` читает active items.
2. Active означает `deleted_at is null`.
3. Revenue total складывает только item `processed`.
4. Cancelled sale получает total `0`.
5. Failed sale получает total `0`.
6. Needs_review sale остаётся `needs_review`.
7. Processed sale остаётся `processed`, если active items удалены.
8. Voice record status обновляется вместе с sale status.
9. Отчёт после refresh читает новые totals.

## 10. Режим удаления

1. Открывается только по `🗑`.
2. Режим редактирования закрывается при открытии режима удаления.
3. Показывается confirm dialog/panel.
4. Текст: `Удалить товар из отчёта?`
5. Кнопки:
   - `Удалить`;
   - `Отмена`.
6. `Отмена` закрывает dialog/panel.
7. Ошибка удаления оставляет карточку видимой.
8. Успешное удаление скрывает карточку локально и обновляет route.

## 11. Поведение удаления

1. Client отправляет `excludeSaleItemAction`.
2. Action вызывает `excludeSaleItem`.
3. Server вызывает `requireOwner`.
4. Server получает Supabase admin client.
5. Server загружает item.
6. Server проверяет sale context текущего магазина.
7. Server вызывает `requireShopAccess`.
8. Server строит patch через `buildExcludedSaleItemPatch`.
9. Patch устанавливает `status = excluded`.
10. Patch устанавливает `deleted_at`.
11. Patch устанавливает `deleted_reason = excluded_by_owner`.
12. Patch устанавливает `deleted_previous_status`.
13. Update фильтруется по `id`.
14. Update требует `deleted_at is null`.
15. Update возвращает row через `.select(...).single()`.
16. После удаления вызывается `recalculateSale`.
17. Audit log пишется best effort.

## 12. Сохранение

1. Обновление сохраняется в Supabase.
2. Удаление сохраняется в Supabase.
3. Валидный update сохраняет `status = processed`, `confidence = 1` и пересчитанный `total`.
4. Перезагрузка страницы не возвращает deleted item в active list.
5. Перезагрузка страницы показывает updated product name.
6. Перезагрузка страницы показывает updated quantity.
7. Перезагрузка страницы показывает updated price.
8. Перезагрузка страницы показывает recalculated total.

## 13. Бизнес-логика

1. В active report входят только non-deleted items.
2. В revenue не входят parent sale `cancelled` и `failed`.
3. В revenue входят только item `processed`.
4. Item без price не входит в revenue.
5. Item без total не входит в revenue.
6. Deleted item не входит в quantity.
7. Deleted item не входит в revenue.
8. Review sale item может стать `processed` после редактирования и учитываться после refresh; parent sale остаётся `needs_review`, если есть другие неполные items.

## 14. API и серверная логика

1. `updateSaleItemAction` возвращает structured state.
2. `excludeSaleItemAction` возвращает structured state.
3. Structured state содержит `status`, `message`, optional `code`.
4. Успешное обновление включает updated item.
5. Успешное удаление включает item id.
6. Server actions revalidate `/daily-report`.
7. Server actions revalidate `/records`.
8. Server actions не раскрывают raw Supabase errors пользователям.

## 15. Поля базы данных

1. `sale_items.id`.
2. `sale_items.sale_id`.
3. `sale_items.product_id`.
4. `sale_items.product_name`.
5. `sale_items.quantity`.
6. `sale_items.unit`.
7. `sale_items.price`.
8. `sale_items.total`.
9. `sale_items.status`.
10. `sale_items.confidence`.
11. `sale_items.updated_at`.
12. `sale_items.deleted_at`.
13. `sale_items.deleted_reason`.
14. `sale_items.deleted_previous_status`.

## 16. Ошибки

1. Отсутствует item id -> validation error.
2. Некорректные data -> validation error.
3. Отсутствует admin client -> generic save/delete error.
4. Item not found -> понятное сообщение not found.
5. Sale not found -> понятное сообщение not found.
6. Unauthorized shop -> access denied.
7. Product lookup failure -> ошибка проверки каталога.
8. Recalculation failure -> mutation возвращает error.
9. Audit log failure логируется, но не ломает пользовательскую mutation.

## 17. Крайние случаи

1. Пользователь дважды нажимает save.
2. Пользователь удаляет item, пока ожидается другой refresh.
3. Item уже deleted.
4. Item принадлежит другому магазину.
5. У sale удалены все items.
6. Sale содержит смесь processed и review items.
7. Product name совпадает с каталогом в другом регистре.
8. Product unit берётся из каталога.
9. Price value с дробной частью.
10. Quantity value с дробной частью.

## 18. Критерии приемки

1. `✏️` открывает компактную форму редактирования.
2. Save обновляет Supabase.
3. Save пересчитывает item total.
4. Save пересчитывает report revenue для processed sale.
5. Save не подтверждает needs_review sale, но полностью сохранённый item становится `processed`.
6. Ошибка не очищает данные формы.
7. `🗑` открывает подтверждение удаления.
8. Delete выполняет soft-delete строки.
9. Deleted item исчезает из active report.
10. Deleted item не возвращается после reload.
11. Revenue и quantity пересчитываются после delete.
12. Под карточкой item не появляются постоянные большие кнопки.

## 19. Вне области

1. Физическое удаление.
2. Массовое редактирование.
3. UI управления каталогом товаров.
4. Telegram conversation для отдельной позиции.
5. Review confirm/cancel для отдельной позиции внутри обычной карточки sale item.
