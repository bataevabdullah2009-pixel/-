# Серверный API

- `POST /api/telegram/webhook` — вход Telegram updates с webhook secret.
- `POST /api/auth/telegram` — валидация Mini App initData из `x-telegram-init-data`, owner/seller/shop lookup и установка HttpOnly cookie.
- `getReport(filters)` — отчёт активных позиций магазина владельца.
- `getRecords(filters)` — журнал продаж магазина.
- `getReviewItems(filters)` — позиции, требующие ручного действия.
- `getSellers()` — продавцы магазина.
- `updateSaleItem(input)` — ручная правка и пересчёт.
- `confirmSaleItem(id)` — отдельное подтверждение сохранённой позиции; запись становится подтверждённой после подтверждения всех активных позиций.
- `excludeSaleItem(id)` — soft delete позиции.
- `restoreSaleItem(id)` — восстановление позиции.
- `resetDay(range)` — soft delete активных позиций одного дня и одного магазина.

Ни одна функция не принимает `shop_id` от клиента.

Все явные browser `fetch` проходят через `apiFetch()` и получают header `x-telegram-init-data`. В текущем приложении browser API endpoint только `POST /api/auth/telegram`; отчёт, записи и продавцы рендерятся Server Components, а save/confirm/exclude/restore/reset выполняются Server Actions: они не доверяют browser-параметрам и повторно валидируют HttpOnly initData cookie. Клиентских `shop_id` нет.

Auth errors:

- `401 TELEGRAM_INIT_DATA_MISSING`;
- `401 TELEGRAM_INIT_DATA_INVALID`;
- `403 SELLER_NOT_LINKED`;
- `403 SELLER_INACTIVE`;
- `403 SHOP_NOT_FOUND`.
