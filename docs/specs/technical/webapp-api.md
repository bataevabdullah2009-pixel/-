# WebApp API и Server Actions

Статус: реализовано.

## Цель

Зафиксировать серверный контракт WebApp для чтения отчёта и мутаций `sale_items`.

## Пользовательские сценарии

- Загрузка отчёта за период.
- Inline update товара.
- Soft delete товара.
- Восстановление исключённого товара.
- Сброс активных позиций одного дня.

## Роли и доверенная граница

Клиент не передаёт доверенный `shop_id`. Server Components и Server Actions вызывают `requireOwner()`, затем ограничивают запросы найденным `owner.shopId`. `SUPABASE_SERVICE_ROLE_KEY` используется только сервером.

## Контракты

### `getReport(filters)`

Возвращает:

- `range`;
- `summary`;
- `items` — только активные строки;
- `deletedItems` — soft-deleted/excluded строки;
- `error`.

При ошибке `summary/items/deletedItems` не должны интерпретироваться UI как успешный пустой результат: поле `error` имеет приоритет.

### `updateSaleItemAction(previousState, formData)`

Вход: `itemId`, `productName`, `quantity`, `price`.

Ответ:

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

### `excludeSaleItemAction(previousState, formData)`

Вход: `itemId`.

Успех возвращает `itemId`; клиент скрывает карточку и обновляет Server Components.

### Redirect-based actions

`restoreSaleItemAction` и `resetDayRevenueAction` используют безопасный `returnTo`, revalidation и redirect с пользовательским notice. Параметры `mutation/message` не переносятся в новые ссылки фильтра периода.

## Серверная логика

Supabase update всегда содержит фильтр по `id`, а для активных операций также `deleted_at is null`. Изменённая строка читается через `.select()`, поскольку Supabase JavaScript update по умолчанию не возвращает row.

## Таблицы БД

- `sales` — проверка магазина и сохранение агрегированного итога.
- `sale_items` — основная мутация.
- `voice_records` — синхронизация статуса родительской записи существующей логикой пересчёта.
- `products` — необязательное сопоставление с активным каталогом по нормализованному имени.
- `audit_logs` — журнал ручных действий.

## Ошибки и edge cases

- Результат Supabase `error` логируется с operation/itemId.
- Internal message не передаётся напрямую пользователю.
- Ошибка загрузки не показывает пустой отчёт.
- Нулевая активная коллекция при существующей `sale` является штатным состоянием.
- Пустой products match не блокирует свободное название товара.

## Acceptance criteria

- Все мутации повторно проверяют доступ к магазину.
- Update возвращает фактически сохранённую строку.
- Delete реализован только как soft delete.
- Revalidation выполняется для `/daily-report` и `/records`.
- Клиент показывает pending и error state локально.

## Не входит в scope

Публичный REST endpoint для редактирования, client-side Supabase service role, GraphQL, массовые мутации, изменение Telegram webhook API.
