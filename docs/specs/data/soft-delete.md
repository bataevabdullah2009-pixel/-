# Soft delete

Физическое удаление позиции из UI не выполняется. Исключение владельцем задаёт:

```text
deleted_at = now()
deleted_reason = excluded_by_owner
status = excluded
updated_at = now()
```

`deleted_previous_status` хранится для восстановления. Reset дня использует причину `day_reset`. Любая строка с `deleted_at` не участвует в количестве и выручке.

Колонка `deleted_at` уже добавлена идемпотентными migrations `20260618082931_add_sale_item_soft_delete.sql`, `20260619132225_align_sale_item_update_and_exclusion.sql` и выровнена в `20260620135556_stabilize_sales_flow.sql`. Код не использует альтернативное физическое удаление.
