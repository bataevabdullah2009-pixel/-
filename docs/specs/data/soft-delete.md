# Soft Delete

Пользовательские действия не удаляют `sale_items` физически. Исключение товара, отмена review sale и сброс дня используют soft delete, чтобы сохранить аудит и возможность восстановления.

## Поля

`sale_items` содержит:

1. `status`.
2. `deleted_at`.
3. `deleted_reason`.
4. `deleted_previous_status`.
5. `updated_at`.

Active row:

```sql
deleted_at is null
deleted_reason is null
deleted_previous_status is null
status <> 'excluded'
```

Deleted row:

```sql
deleted_at is not null
deleted_reason is not null
deleted_previous_status is not null
status = 'excluded'
```

## Reasons

Allowed `deleted_reason`:

1. `excluded_by_owner` - пользователь нажал корзину или cancel soft-deleted item.
2. `day_reset` - пользователь сбросил выручку за день.
3. `manual` - legacy value retained for старые rows.

## Исключение товара

Patch:

```sql
deleted_at = now()
deleted_reason = 'excluded_by_owner'
deleted_previous_status = <previous status>
status = 'excluded'
updated_at = now()
```

Поведение:

1. Row остаётся в БД.
2. Row исчезает из active report.
3. Row не входит в revenue.
4. Parent sale пересчитывается.
5. Audit log пишется best-effort.
6. UI обновляет report/review/records/sellers.

## Cancel sale

Cancel review sale:

1. Загружает active items.
2. Soft-delete каждый active item.
3. Ставит sale `cancelled`.
4. Ставит voice record `cancelled`.
5. Ставит sale total `0`.

После cancel никакие items этой sale не входят в revenue.

## Reset day

Reset дня:

1. Разрешён только для одного дня.
2. Читает sales current shop в диапазоне.
3. Находит active items.
4. Soft-delete active items.
5. Ставит `deleted_reason = day_reset`.
6. Сохраняет previous item status.
7. Пересчитывает каждую sale.
8. Не удаляет parent sales.

## Восстановление

Restore patch:

```sql
deleted_at = null
deleted_reason = null
deleted_previous_status = null
status = coalesce(previous_status, 'needs_review')
updated_at = now()
```

Поведение:

1. Проверяет item exists.
2. Проверяет item -> sale -> shop.
3. Разрешает восстановление только deleted row.
4. Возвращает previous status.
5. Если previous status отсутствует, использует `needs_review`.
6. Пересчитывает parent sale.
7. Audit log пишется best-effort.

## Revenue effect

Deleted row не входит:

1. В total revenue.
2. В quantity.
3. В top products.
4. В review active list.
5. В seller revenue.

Legacy row со `status = excluded`, но без `deleted_at`, тоже не считается active.

## Migrations

Soft delete создан и стабилизирован migrations:

1. `20260618082931_add_sale_item_soft_delete.sql`.
2. `20260620135556_stabilize_sales_flow.sql`.
3. `20260630153000_ensure_sale_item_soft_delete_columns.sql`.

Последняя migration идемпотентно гарантирует:

1. `deleted_at`.
2. `deleted_reason`.
3. `deleted_previous_status`.
4. `updated_at`.
5. Status constraint with `excluded`.
6. Deleted reason constraint.
7. Deleted previous status constraint.
8. Deleted metadata consistency constraint.
9. Active item indexes.

## Acceptance criteria

1. Delete never physically removes item.
2. Deleted item does not return after reload.
3. Deleted item does not enter revenue.
4. Restore clears deleted metadata.
5. Restore recalculates parent sale.
6. Reset day soft-deletes only selected day active items.
7. Cancel soft-deletes active sale items and sets parent `cancelled`.
