# Авторизация и изоляция магазина

`/api/auth/telegram` принимает только Telegram `initData`. Сервер строит data-check-string, сверяет HMAC-SHA-256 с bot token, проверяет `auth_date` не старше 24 часов и извлекает Telegram user id. После этого активный owner находится в таблице `owners`.

`requireOwner()` выполняется в `getReport`, `getRecords`, `getReviewItems`, `getSellers`, `updateSaleItem`, `excludeSaleItem`, `restoreSaleItem` и `resetDay`. `requireShopAccess()` защищает мутации после загрузки связи позиции с продажей.

Все запросы добавляют `.eq("shop_id", owner.shopId)`. Service role обходит RLS, поэтому прикладной shop filter обязателен. Анонимное чтение таблиц отозвано migration.
