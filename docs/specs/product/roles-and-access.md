# Roles and Access

- `seller`: активная запись в `sellers`, отправляет voice-продажи.
- `owner`: active запись в `owners`; при отсутствии seller WebApp создаёт seller binding с тем же Telegram id и тем же shop.
- `fallback user`: server-side контекст из `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID`.

Доступ к данным ограничен `shop_id`, полученным на сервере. Клиентский `shop_id` игнорируется.

Неактивные seller/owner записи не дают доступ в Telegram mode. Пользователь без seller/owner binding получает `user_not_linked`. Fallback mode включается только отдельным env флагом.
