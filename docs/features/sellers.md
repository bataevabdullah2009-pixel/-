# Sellers

Страница продавцов показывает active/inactive sellers текущего server-derived магазина.

WebApp сначала ищет active seller по Telegram user id. Если seller отсутствует, но существует active owner с тем же Telegram id, WebApp создаёт seller в owner shop. Без seller/owner binding и без явного fallback пользователь получает ошибку `user_not_linked`.

Fallback Web App использует `DEFAULT_SELLER_ID` только как server-side context, не как client input.
