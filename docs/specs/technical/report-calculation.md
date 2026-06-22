# Расчёт отчёта

В выручку и количество входит только позиция, для которой одновременно выполняется:

```sql
sale_items.status = 'processed'
and sale_items.deleted_at is null
and sales.shop_id = <server-derived owner shop_id>
```

Период применяется к `sales.created_at`. Выручка — сумма `sale_items.total`, количество — сумма `quantity`; группировка выполняется по product id либо нормализованному имени.

Каждая новая voice-позиция начинает в `needs_review` либо `needs_price` и не входит в итог. Сохранение изменённых полей сохраняет review state; отдельное подтверждение переводит позицию в `processed`, который UI показывает как «Подтверждено». `excluded` и строки с `deleted_at` доступны только в блоке исключённых товаров.

Ошибка Telegram auth не преобразуется в пустой успешный отчёт: UI показывает понятное сообщение. После save/confirm/exclude/restore/reset Server Action пересчитывает `sales.total_amount` и status, вызывает revalidation и выполняет клиентскую RSC-навигацию без полной перезагрузки документа.
