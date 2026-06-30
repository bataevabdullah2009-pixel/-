# Soft Delete

Пользовательские действия не удаляют `sale_items` физически.

Исключение из отчёта:

```sql
deleted_at = now()
deleted_reason = 'excluded_by_owner'
deleted_previous_status = <previous status>
status = 'excluded'
```

Восстановление:

```sql
deleted_at = null
deleted_reason = null
deleted_previous_status = null
status = coalesce(previous_status, 'needs_review')
```

Reset дня использует `deleted_reason = 'day_reset'`. Любая строка с `deleted_at is not null` не участвует в количестве и выручке.

Колонка `deleted_at` добавлена идемпотентными migrations. Дополнительная migration `20260630153000_ensure_sale_item_soft_delete_columns.sql` повторно гарантирует soft-delete поля и constraints для live-схемы.
