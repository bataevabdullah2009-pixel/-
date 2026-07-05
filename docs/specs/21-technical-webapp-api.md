# WebApp API и Server Actions

Статус: реализовано.

## Цель

Зафиксировать серверный контракт WebApp для чтения отчёта, проверки, журнала, продавцов и мутаций `sale_items`.

Telegram confirm/cancel остаётся быстрым flow под сообщением бота. WebApp `/review` использует те же service-layer правила для владельца/продавца, прошедшего Telegram WebApp session.

## Доверенная граница

1. Клиент не передаёт доверенный `shop_id`.
2. Server Components вызывают `requireOwner()`.
3. Server Actions вызывают `requireOwner()`.
4. Records API проверяет item -> sale -> shop.
5. Review actions проверяют sale -> shop через текущий server-derived context.
6. Supabase service role доступен только server-side.
7. UI не является security boundary.

## `getReport(filters)`

Вход:

1. `period`.
2. `date` для custom периода.

Возвращает:

```ts
{
  range: DateRange;
  salesCount: number;
  summary: ReportSummary;
  items: SaleItem[];
  deletedItems: SaleItem[];
  error: string | null;
}
```

Поведение:

1. Читает owner context.
2. Читает `sales` по shop и period.
3. Читает `sale_items` по найденным sale IDs.
4. Проверяет scope rows.
5. Разделяет active/deleted items.
6. Считает summary только по active processed items.
7. Возвращает error, если auth или DB не прошли.

`error` имеет приоритет над пустыми данными.

## `getReviewItems(filters)`

Вход:

1. `period`.
2. `date`.

Возвращает:

```ts
{
  range: DateRange;
  items: SaleItem[];
  sales: Array<{
    id: string;
    seller_id: string | null;
    status: string;
    total_amount: number | null;
    created_at: string;
  }>;
  error: string | null;
}
```

Поведение:

1. Читает текущий shop через session.
2. Берёт только sales со статусом `needs_review`.
3. Берёт только active sale_items этих sales.
4. Legacy `needs_price` отображается как review.
5. Deleted/excluded items не попадают в active review list.
6. Данные не смешиваются с processed revenue list.

## `getRecords(filters)`

Вход:

1. `period`.
2. `date`.
3. `sellerId`.
4. `search`.

Возвращает:

```ts
{
  records: RecordListItem[];
  error: string | null;
}
```

`RecordListItem` содержит:

1. sale id.
2. created_at.
3. sellerName.
4. cleaned/raw text.
5. Источник пользовательского статуса.
6. total_amount.
7. Подписанный audio URL, если audio сохранено.
8. sale items для раскрытия `Товары`.

Records не показывает пустое состояние при auth/DB error.

## `getSellers()`

Возвращает список продавцов текущего server-derived shop.

Используется для фильтра записей.

## `getSellerStats(filters)`

Возвращает:

```ts
{
  sellers: Array<{
    id: string;
    name: string;
    is_active: boolean;
    recordsCount: number;
    revenue: number;
  }>;
  error: string | null;
}
```

Расчёт:

1. Читает sellers текущего shop.
2. Читает sales за период.
3. Читает sale_items по sale IDs.
4. Считает recordsCount по seller.
5. Считает revenue только по active processed items.

## `updateSaleItemAction(previousState, formData)`

Вход:

1. `itemId`.
2. `productName`.
3. `quantity`.
4. `price`.

Ответ:

```ts
{
  status: "idle" | "success" | "error";
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

Правила:

1. Пустой item id отклоняется.
2. Пустой product name отклоняется.
3. Quantity `<= 0` отклоняется.
4. Price `<= 0` отклоняется.
5. Soft-deleted item не редактируется.
6. Чужой item не редактируется.
7. Изменённая строка читается через `.select().single()`.
8. Валидный save сохраняет item как `processed` и `confidence = 1`.
9. Review sale может остаться parent `needs_review`, если есть неполные active items.
10. Review edit с полными данными может сделать item `processed`; такая позиция входит в выручку после refresh.

После успеха:

1. Revalidate `/daily-report`.
2. Revalidate `/review`.
3. Revalidate `/records`.
4. Revalidate `/sellers`.
5. Client вызывает `router.refresh()`.

## `excludeSaleItemAction(previousState, formData)`

Вход:

1. `itemId`.

Ответ:

```ts
{
  status: "idle" | "success" | "error";
  message: string;
  itemId?: string;
}
```

Поведение:

1. Читает item.
2. Проверяет sale -> shop.
3. Если already deleted, возвращает success.
4. Устанавливает `status = excluded`.
5. Устанавливает `deleted_at`.
6. Сохраняет `deleted_previous_status`.
7. Пересчитывает sale.
8. Выполняет revalidate affected routes.

## Redirect-based actions для item

`restoreSaleItemAction`:

1. Восстанавливает soft-deleted item.
2. Возвращает previous status.
3. Пересчитывает sale.
4. Делает safe redirect.

`resetDayRevenueAction`:

1. Разрешён только для одного дня.
2. Выполняет soft-delete active items выбранного дня.
3. Не удаляет sales.
4. Делает safe redirect.

`confirmSaleItemAction` больше не используется и не является частью WebApp contract.

## Actions решения review

`confirmReviewSaleAction`:

1. Принимает `saleId`.
2. Проверяет текущий WebApp session.
3. Находит sale текущего shop.
4. Вызывает `confirmReviewSale`.
5. Валидирует active items по product, quantity/weight и price-or-total.
6. Если есть хотя бы один валидный item, переводит sale/voice и confirmable items в `processed`.
7. Неполные active items остаются `needs_review` и не входят в выручку.
8. Если нет ни одного confirmable item, возвращает `Не удалось подтвердить: нет ни одной полной позиции.`
9. Пересчитывает `total_amount` по confirmable items.
10. Revalidate `/review`, `/daily-report`, `/records`, `/sellers`.
11. Возвращает назад на `/review` с safe mutation state.

`cancelReviewSaleAction`:

1. Принимает `saleId`.
2. Проверяет текущий WebApp session.
3. Находит sale текущего shop.
4. Вызывает `cancelReviewSale`.
5. Переводит sale/voice в `cancelled`.
6. Переводит active items в `excluded`/deleted.
7. Выполняет revalidate affected routes.
8. Возвращает назад на `/review` с safe mutation state.

`confirmAllReviewSalesAction`:

1. Принимает список `saleIds`.
2. Убирает пустые и повторяющиеся ids.
3. Последовательно подтверждает доступные review sales.
4. Для невалидных sales возвращает readable summary.
5. Не подтверждает чужие sales.

## Контракт ошибок

1. Server logs получает technical reason.
2. UI получает стабильное русскоязычное сообщение.
3. Internal Supabase message не отдаётся напрямую для update/delete actions.
4. Mutations возвращают `statusCode`/`code`: 401 session, 403 access, 404 not found, 422 invalid data, 500 server error.
5. Auth errors отображаются отдельно.
6. DB loading error не превращается в empty state.
7. Ошибка review action не меняет unrelated rows.

## Таблицы

1. `sales` — scope и агрегат.
2. `sale_items` — update/delete/restore/review visibility.
3. `voice_records` — пересчёт статуса через sale.
4. `sellers` — filters/stats.
5. `products` — optional name/unit matching.
6. `audit_logs` — best-effort mutation audit.

## Крайние случаи

1. Нет sales за период — успешный пустой отчёт.
2. Есть sale, но все items deleted — sale остаётся, active list пуст.
3. Legacy `excluded` без `deleted_at` не показывается active.
4. Product match отсутствует — свободное название сохраняется.
5. Audit log failure не отменяет update/delete.
6. Review sale item после edit может быть сохранён как `processed` и учитываться в revenue; parent `needs_review` означает только, что остались unresolved sibling items.
7. Повторный review confirm/cancel идемпотентен.
8. Неверный sale id возвращает readable error.

## Критерии приемки

1. Все чтения используют server-derived shop.
2. Все мутации повторно проверяют shop.
3. Update возвращает фактически сохранённую строку.
4. Delete — только soft delete/status excluded.
5. Review edit не подтверждает voice sale, даже если item row становится `processed`.
6. `/review` подтверждает и отменяет parent sale только через server action.
7. Records раскрывает товары без отдельного client-side Supabase доступа.
8. Sellers показывает recordsCount и revenue за период.
9. Ошибки не маскируются пустыми данными.
10. Revalidation выполняется для report, review, records и sellers.

## Вне области

1. Public REST endpoint для item edit.
2. Client-side service role.
3. GraphQL.
4. Client-side подтверждение voice-записи без server action.
5. Физическое удаление sale rows.
