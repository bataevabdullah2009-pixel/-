# Расчёт отчёта

Активная позиция удовлетворяет двум условиям:

```sql
sale_items.status = 'processed'
and sale_items.deleted_at is null
```

Дополнительно запрос ограничивает `sales.shop_id = owner.shop_id` и выбранный интервал `sales.created_at`. Выручка равна сумме `sale_items.total`, количество — сумме `quantity`. `needs_review`, `needs_price`, `failed` и `excluded` в итог не входят.

После ручной правки или soft delete сервер пересчитывает `sales.total_amount` и status связанной продажи.
