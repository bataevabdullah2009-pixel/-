# Редактирование и удаление товарной позиции

Статус: реализовано.

## Цель

Владелец должен быстро исправить товарную позицию без перехода на отдельную страницу.

Редактирование товара — это управление данными позиции.

Редактирование товара не является подтверждением сомнительной голосовой записи.

Review-запись начинает входить в выручку только после явного confirm в Telegram или во вкладке WebApp «Проверка».

## Роли

1. Владелец WebApp инициирует edit/delete.
2. Server Action принимает форму.
3. `requireOwner()` определяет server-derived магазин.
4. Records API проверяет item -> sale -> shop.
5. Supabase service role выполняет update.
6. UI показывает pending/error state.

## Обычная карточка

Карточка товара показывает:

1. Название товара.
2. Количество.
3. Единицу.
4. Цену за единицу.
5. Сумму позиции.
6. Иконку карандаша.
7. Иконку корзины.

Пример:

```text
Сникерс
5 шт × 100 ₽
500 ₽                         ✏️ 🗑
```

В обычном режиме нет:

1. Постоянной формы.
2. Большой кнопки «Сохранить».
3. Кнопки «Подтвердить позицию».
4. Текстовой ссылки «Исключить из отчёта».
5. Третьей кнопки для открытия отчёта.

## Edit mode

Открывается после нажатия карандаша.

Поля:

1. `Товар`.
2. `Количество`.
3. `Цена, ₽`.

Кнопки:

1. `Сохранить`.
2. `Отмена`.

Форма компактная.

На мобильном экране товар занимает всю ширину, количество и цена стоят рядом.

Кнопки имеют высоту не меньше 44 px.

## Поведение сохранения

1. UI отправляет `itemId`, `productName`, `quantity`, `price`.
2. Server Action валидирует наличие item id.
3. Server Action валидирует непустое название.
4. Server Action валидирует `quantity > 0`.
5. Server Action валидирует `price > 0`.
6. `updateSaleItem()` повторно получает owner context.
7. Сервер читает текущий `sale_items`.
8. Сервер запрещает edit soft-deleted rows.
9. Сервер читает родительскую sale.
10. Сервер проверяет `sale.shop_id`.
11. Сервер нормализует product name.
12. Сервер ищет product match в active catalog best-effort.
13. Сервер обновляет `product_name`.
14. Сервер обновляет `quantity`.
15. Сервер обновляет `unit`.
16. Сервер обновляет `price`.
17. Сервер пересчитывает `total`.
18. Сервер обновляет `updated_at`.
19. Сервер читает изменённую строку через `.select().single()`.
20. Сервер пересчитывает родительскую sale.

## Важное правило review

Если родительская `sales.status = processed`, сохранённая валидная позиция получает `status = processed` и входит в выручку.

Если родительская `sales.status = needs_review`, сохранённая позиция остаётся `status = needs_review`.

Такой edit сохраняет исправленные поля, но не делает голосовую запись подтверждённой.

Чтобы review-запись вошла в выручку, нужно нажать `✅ Подтвердить` в Telegram или `Подтвердить` во вкладке «Проверка».

Это правило защищает продукт от скрытого подтверждения обычным edit flow.

## Delete mode

Открывается после нажатия корзины.

Текст:

```text
Исключить товар из отчёта?
```

Кнопки:

1. `Исключить`.
2. `Отмена`.

Удаление не физическое.

Удаление всегда soft delete.

## Soft delete patch

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
deleted_previous_status = <previous status>
updated_at = now()
```

Физический `DELETE` не используется.

Soft-deleted row остаётся в БД.

После reload она не возвращается в активный отчёт.

## Restore

Восстановление доступно в блоке исключённых товаров.

Restore очищает:

1. `deleted_at`.
2. `deleted_reason`.
3. `deleted_previous_status`.

Статус возвращается из `deleted_previous_status`.

Если previous status был `needs_review`, позиция снова требует confirm.

## API и server actions

`updateSaleItemAction(previousState, formData)` возвращает:

```ts
{
  status: "success" | "error";
  message: string;
  item?: {
    id: string;
    sale_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    price: number | null;
    total: number | null;
    status: string;
    updated_at: string;
  };
}
```

`excludeSaleItemAction(previousState, formData)` возвращает:

```ts
{
  status: "success" | "error";
  message: string;
  itemId?: string;
}
```

После успеха actions вызывают revalidation для:

1. `/daily-report`.
2. `/records`.

Клиент выполняет `router.refresh()`.

## Ошибки

1. Пустое название отклоняется до Supabase.
2. Quantity `<= 0` отклоняется до Supabase.
3. Price `<= 0` отклоняется до Supabase.
4. Чужой item не меняется.
5. Soft-deleted item не редактируется.
6. Supabase error логируется на сервере.
7. Пользователь видит стабильное русское сообщение.
8. Ошибка не закрывает форму.
9. Ошибка не очищает ввод.
10. Audit log failure логируется отдельно.

## Edge cases

1. Product отсутствует в каталоге — сохраняется свободное название.
2. Legacy `excluded` без `deleted_at` не попадает в active UI.
3. Повторное удаление идемпотентно.
4. Sale без active items остаётся в БД.
5. Review sale после edit остаётся review.
6. Processed sale после edit пересчитывает выручку.

## Acceptance criteria

1. Карандаш открывает компактную форму.
2. Отмена сбрасывает несохранённый ввод.
3. Сохранение реально меняет Supabase row.
4. `total = quantity × price`.
5. Processed item меняет report total.
6. Review item не входит в report total до явного confirm.
7. Корзина показывает confirm dialog.
8. Delete soft-delete row.
9. Reload не возвращает deleted item в active list.
10. Ошибка не очищает форму.
11. Touch targets не меньше 44 px.
12. `npm run lint`, `npm run test`, `npm run build` проходят.

## Не входит в scope

1. Массовое редактирование.
2. Изменение даты продажи.
3. Изменение продавца продажи.
4. Редактирование audio/STT/parser данных.
5. Физическое удаление row.
