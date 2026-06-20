# Серверный API

- `POST /api/telegram/webhook` — вход Telegram updates с webhook secret.
- `POST /api/auth/telegram` — валидация Mini App initData из `x-telegram-init-data` и установка HttpOnly cookie.
- `getReport(filters)` — отчёт активных позиций магазина владельца.
- `getRecords(filters)` — журнал продаж магазина.
- `getReviewItems(filters)` — позиции, требующие ручного действия.
- `getSellers()` — продавцы магазина.
- `updateSaleItem(input)` — ручная правка и пересчёт.
- `excludeSaleItem(id)` — soft delete позиции.
- `restoreSaleItem(id)` — восстановление позиции.
- `resetDay(range)` — soft delete активных позиций одного дня и одного магазина.

Ни одна функция не принимает `shop_id` от клиента.
