# Авторизация и изоляция магазина

Telegram Web App открывается только кнопкой типа `web_app`. После загрузки frontend вызывает `Telegram.WebApp.ready()` и отправляет `Telegram.WebApp.initData` в header `x-telegram-init-data` на `POST /api/auth/telegram`.

Сервер:

1. строит Telegram data-check-string;
2. проверяет HMAC-SHA-256 с `TELEGRAM_BOT_TOKEN`;
3. отклоняет initData старше 24 часов;
4. извлекает Telegram user id;
5. ищет активного `owners`, затем совместимую активную `sellers`-привязку периода migration rollout;
6. получает `shop_id` только из найденной строки БД.

После успешной проверки сервер устанавливает HttpOnly cookie для Server Components и Server Actions. Header остаётся обязательной точкой входа bootstrap; `DEMO_MODE=true` — единственный разрешённый fallback без initData. В production отсутствие initData даёт «Откройте Web App через кнопку в Telegram-боте», отсутствие привязки — «Ваш Telegram не привязан к магазину».

`requireOwner()` повторно валидирует сохранённый initData. `requireShopAccess()` и все service-role queries ограничивают чтение/мутации `owner.shopId`. Клиентский `shop_id` не принимается. Service role используется только в server-only модулях.
