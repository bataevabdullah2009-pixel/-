# Расчёт отчёта

В выручку и количество входит только позиция, для которой одновременно выполняется:

```sql
sale_items.status = 'processed'
and sale_items.deleted_at is null
and sales.shop_id = <server-derived owner shop_id>
```

Период применяется к `sales.created_at`. Выручка — сумма `sale_items.total`, количество — сумма `quantity`; группировка выполняется по product id либо нормализованному имени.

`needs_review` и `needs_price` не входят в итог, но обязательно возвращаются и отображаются в блоке «Нужно проверить». `excluded` и строки с `deleted_at` доступны только в блоке исключённых товаров.

Ошибка Telegram auth не преобразуется в пустой успешный отчёт: UI показывает понятное сообщение. После save/exclude/reset Server Action пересчитывает `sales.total_amount` и status, вызывает revalidation и возвращает обновлённую страницу без ручной перезагрузки.
