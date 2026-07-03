# Product Spec: Sale Item Editing

## 1. Цель

1. Пользователь должен быстро исправить товар, количество или цену в WebApp.
2. Исправление должно сохраняться в Supabase.
3. Сумма позиции должна пересчитываться сразу после сохранения.
4. Общая выручка должна пересчитываться после update/delete.
5. Удаление товара должно исключать позицию из active отчёта без физического удаления.
6. Review voice-запись не должна подтверждаться через edit.

## 2. Роли

1. `seller` или `owner` открывает WebApp.
2. `system` проверяет Telegram WebApp session.
3. `Supabase` хранит sale item rows.
4. `report` пересчитывает выручку.

## 3. Область UI

1. Компонент: `SaleItemCard`.
2. Используется на report page.
3. Используется для active processed items.
4. Используется для review items в блоке `Нужно проверить`.
5. Не используется как per-item confirmation surface.

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

## 5. Edit mode

1. Открывается только по `✏️`.
2. Повторное нажатие закрывает edit mode.
3. Delete panel закрывается при открытии edit mode.
4. Edit mode compact и не раскрыт по умолчанию.
5. Поля:
   - `Товар`;
   - `Количество`;
   - `Единица`;
   - `Цена, ₽`.
6. Кнопки:
   - `Сохранить`;
   - `Отмена`.
7. `Отмена` сбрасывает form и закрывает edit mode.
8. Ошибка не очищает введённые данные.
9. Успех закрывает edit mode и вызывает `router.refresh()`.

## 6. Validation

1. `itemId` обязателен.
2. `productName` обязателен.
3. `quantity` должна быть finite number.
4. `quantity` должна быть больше нуля.
5. `unit` должна быть одной из поддерживаемых единиц `шт`, `кг`, `г`.
6. `price` должна быть finite number.
7. `price` должна быть больше нуля.
7. Empty product name возвращает validation error.
8. Invalid price возвращает validation error.
9. Deleted item нельзя обновить без restore.

## 7. Update behavior

1. Client submits `updateSaleItemAction`.
2. Action вызывает `updateSaleItem`.
3. Server вызывает `requireOwner`.
4. Server получает Supabase admin client.
5. Server загружает текущий item.
6. Server проверяет, что item не deleted.
7. Server загружает sale context текущего shop.
8. Server вызывает `requireShopAccess`.
9. Server строит patch через `buildManualSaleItemPatch`.
10. Server ищет product match в `products`.
11. Server обновляет `sale_items`.
12. Update фильтруется по `id`.
13. Update требует `deleted_at is null`.
14. Update возвращает updated row через `.select(...).single()`.
15. После update вызывается `recalculateSale`.
16. Audit log пишется best effort.

## 8. Status after update

1. Если parent sale `processed`, item остаётся `processed`.
2. Если пользователь сохранил валидные `product_name`, `quantity`, `unit` и `price`, item получает `processed` даже внутри parent sale `needs_review`.
3. Edit не подтверждает review voice-запись и не переводит parent sale в `processed`.
4. Review sale начинает входить в выручку только после явного confirm.
5. Processed sale пересчитывает revenue сразу.
6. Для `unit = г` сумма считается как `quantity / 1000 * price`; `price` трактуется как цена за кг.
7. Cancelled sale не должен получить revenue через update.
8. Failed sale не должен получить revenue через update.

## 9. Recalculation

1. `recalculateSale` читает active items.
2. Active means `deleted_at is null`.
3. Revenue total складывает только item `processed`.
4. Cancelled sale получает total `0`.
5. Failed sale получает total `0`.
6. Needs_review sale остаётся `needs_review`.
7. Processed sale остаётся `processed`, если active items удалены.
8. Voice record status обновляется вместе с sale status.
9. Report after refresh читает новые totals.

## 10. Delete mode

1. Открывается только по `🗑`.
2. Edit mode закрывается при открытии delete mode.
3. Показывается confirm dialog/panel.
4. Текст: `Удалить товар из отчёта?`
5. Кнопки:
   - `Удалить`;
   - `Отмена`.
6. `Отмена` закрывает dialog/panel.
7. Delete error оставляет card visible.
8. Delete success скрывает card locally and refreshes route.

## 11. Delete behavior

1. Client submits `excludeSaleItemAction`.
2. Action вызывает `excludeSaleItem`.
3. Server вызывает `requireOwner`.
4. Server получает Supabase admin client.
5. Server загружает item.
6. Server проверяет sale context текущего shop.
7. Server вызывает `requireShopAccess`.
8. Server строит patch через `buildExcludedSaleItemPatch`.
9. Patch устанавливает `status = excluded`.
10. Patch устанавливает `deleted_at`.
11. Patch устанавливает `deleted_reason = excluded_by_owner`.
12. Patch устанавливает `deleted_previous_status`.
13. Update фильтруется по `id`.
14. Update требует `deleted_at is null`.
15. Update возвращает row через `.select(...).single()`.
16. После delete вызывается `recalculateSale`.
17. Audit log пишется best effort.

## 12. Persistence

1. Update persists in Supabase.
2. Delete persists in Supabase.
3. Валидный update сохраняет `status = processed`, `confidence = 1` и пересчитанный `total`.
4. Page reload не возвращает deleted item в active list.
5. Page reload показывает updated product name.
6. Page reload показывает updated quantity.
7. Page reload показывает updated price.
8. Page reload показывает recalculated total.

## 13. Business logic

1. В active report входят только non-deleted items.
2. В revenue входят только parent sale `processed`.
3. В revenue входят только item `processed`.
4. Item without price не входит в revenue.
5. Item without total не входит в revenue.
6. Deleted item не входит в quantity.
7. Deleted item не входит в revenue.
8. Review sale item может стать `processed` после edit, но не counted, пока parent sale не подтверждён.

## 14. API and server logic

1. `updateSaleItemAction` returns structured state.
2. `excludeSaleItemAction` returns structured state.
3. Structured state contains `status`, `message`, optional `code`.
4. Update success includes updated item.
5. Delete success includes item id.
6. Server actions revalidate `/daily-report`.
7. Server actions revalidate `/records`.
8. Server actions do not expose raw Supabase errors to users.

## 15. Database fields

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

## 16. Errors

1. Missing item id -> validation error.
2. Invalid data -> validation error.
3. Missing admin client -> generic save/delete error.
4. Item not found -> user-friendly not found message.
5. Sale not found -> user-friendly not found message.
6. Unauthorized shop -> access denied.
7. Product lookup failure -> catalog check error.
8. Recalculation failure -> mutation returns error.
9. Audit log failure is logged but does not fail user mutation.

## 17. Edge cases

1. User double-clicks save.
2. User deletes item while another refresh is pending.
3. Item already deleted.
4. Item belongs to another shop.
5. Sale has all items deleted.
6. Sale has mix of processed and review items.
7. Product name matches catalog with different casing.
8. Product unit comes from catalog.
9. Price value with decimal part.
10. Quantity value with decimal part.

## 18. Acceptance criteria

1. `✏️` opens compact edit form.
2. Save updates Supabase.
3. Save recalculates item total.
4. Save recalculates report revenue for processed sale.
5. Save does not confirm needs_review sale, but complete saved item becomes `processed`.
6. Error does not clear form data.
7. `🗑` opens delete confirmation.
8. Delete soft-deletes row.
9. Deleted item disappears from active report.
10. Deleted item does not return after reload.
11. Revenue and quantity recalculate after delete.
12. No permanent large buttons appear under item card.

## 19. Out of scope

1. Physical deletion.
2. Bulk editing.
3. Product catalog management UI.
4. Per-item Telegram conversation.
5. Per-item review confirm/cancel inside ordinary sale item card.
