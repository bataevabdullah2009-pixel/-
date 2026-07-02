# WebApp API и Server Actions

Статус: реализовано.

## Цель

Зафиксировать серверный контракт WebApp для чтения отчёта, журнала, продавцов и мутаций `sale_items`.

WebApp не подтверждает и не отменяет сомнительную voice-запись. Review decision выполняется Telegram callback flow.

Telegram confirm/cancel остаётся быстрым flow под сообщением бота.

## Доверенная граница

1. Клиент не передаёт доверенный `shop_id`.
2. Server Components вызывают `requireOwner()`.
3. Server Actions вызывают `requireOwner()`.
4. Records API проверяет item -> sale -> shop.
5. Supabase service role доступен только server-side.
6. UI не является security boundary.
7. Review visibility не является доверенной границей; любые решения выполняются в Telegram callback.

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
5. user-facing status source.
6. total_amount.
7. signed audio URL, если audio сохранено.
8. sale items для раскрытия «Товары».

Records не показывает пустое состояние при auth/DB error.

## Review visibility

Report и records показывают review state через данные `getReport(filters)` и `getRecords(filters)`:

1. `sales.status = needs_review`;
2. records с `sale_items.status = needs_review`;
3. legacy `needs_price`.

WebApp не предоставляет confirm/cancel controls и не принимает `shop_id`.

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
8. Processed sale сохраняет item как `processed`.
9. Review sale сохраняет item как `needs_review`.
10. Review edit не добавляет выручку до явного confirm.

После успеха:

1. Revalidate `/daily-report`.
2. Revalidate `/records`.
3. Client вызывает `router.refresh()`.

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
4. Выполняет soft delete.
5. Пересчитывает sale.
6. Revalidate report/records.

## Redirect-based actions

`restoreSaleItemAction`:

1. Восстанавливает soft-deleted item.
2. Возвращает previous status.
3. Пересчитывает sale.
4. Делает safe redirect.

`resetDayRevenueAction`:

1. Разрешён только для одного дня.
2. Soft-delete active items выбранного дня.
3. Не удаляет sales.
4. Делает safe redirect.

`confirmSaleItemAction` больше не используется и не является частью WebApp contract.

## Review decision actions

WebApp review decision actions are not part of the current public contract.

1. Telegram `confirm:<sale_id>` confirms review voice sale.
2. Telegram `cancel:<sale_id>` cancels review voice sale.
3. WebApp updates its state after refresh/revalidation.
4. `/review` redirects to `/records` for old links.

## Error contract

1. Server logs получает technical reason.
2. UI получает стабильное русскоязычное сообщение.
3. Internal Supabase message не отдаётся напрямую для update/delete actions.
4. Mutations возвращают `statusCode`/`code`: 401 session, 403 access, 404 not found, 422 invalid data, 500 server error.
5. Auth errors отображаются отдельно.
6. DB loading error не превращается в empty state.

## Таблицы

1. `sales` — scope и агрегат.
2. `sale_items` — update/delete/restore.
3. `voice_records` — пересчёт статуса через sale.
4. `sellers` — filters/stats.
5. `products` — optional name/unit matching.
6. `audit_logs` — best-effort mutation audit.

## Edge cases

1. Нет sales за период — успешный пустой отчёт.
2. Есть sale, но все items deleted — sale остаётся, active list пуст.
3. Legacy `excluded` без `deleted_at` не показывается active.
4. Product match отсутствует — свободное название сохраняется.
5. Audit log failure не отменяет update/delete.
6. Review item after edit остаётся review.

## Acceptance criteria

1. Все чтения используют server-derived shop.
2. Все мутации повторно проверяют shop.
3. Update возвращает фактически сохранённую строку.
4. Delete — только soft delete.
5. Review edit не подтверждает voice sale.
6. Records раскрывает товары без отдельного client-side Supabase доступа.
7. Sellers показывает recordsCount и revenue за период.
8. Errors не маскируются пустыми данными.
9. Revalidation выполняется для report и records.

## Не входит в scope

1. Public REST endpoint для item edit.
2. Client-side service role.
3. GraphQL.
4. Массовые операции.
5. Client-side подтверждение voice-записи без server action.
