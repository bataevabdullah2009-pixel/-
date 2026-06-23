# Roles and Access

- `seller`: активная запись в `sellers`, отправляет voice-продажи.
- `owner`: активная запись в `owners` либо совместимая active seller binding для Web App доступа.
- `fallback user`: server-side контекст из `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID`.

Доступ к данным ограничен `shop_id`, полученным на сервере. Клиентский `shop_id` игнорируется.

Неактивные seller/owner записи не дают доступ в Telegram mode. Fallback mode включается только отдельным env флагом.
