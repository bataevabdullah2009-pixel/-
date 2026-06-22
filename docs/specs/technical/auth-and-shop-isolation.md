# Авторизация и изоляция магазина

Telegram Web App открывается только кнопкой типа `web_app`: reply и inline после `/start`, inline после успешной продажи или `MenuButtonWebApp`. Все варианты используют один `NEXT_PUBLIC_APP_URL`; debug button добавляет только путь `/debug-telegram`. Корневой URL возвращает `200` без server redirect. После client-side render frontend ждёт официальный SDK, вызывает `Telegram.WebApp.ready()` и `expand()`, затем общий `apiFetch` отправляет `Telegram.WebApp.initData` в header `x-telegram-init-data` на `POST /api/auth/telegram`. Ошибка отсутствующего initData появляется только после завершения ожидания SDK.

Сервер:

1. строит Telegram data-check-string;
2. проверяет HMAC-SHA-256 с `TELEGRAM_BOT_TOKEN`;
3. отклоняет initData старше 24 часов;
4. извлекает Telegram user id;
5. ищет `owners`, затем совместимую `sellers`-привязку периода migration rollout;
6. возвращает `SELLER_INACTIVE`, если найденная привязка выключена;
7. получает `shop_id` только из найденной строки БД;
8. отдельно проверяет, что shop существует.

После успешной проверки сервер устанавливает HttpOnly cookie для Server Components и Server Actions. Header остаётся обязательной точкой входа bootstrap и каждого явного browser API fetch; текущие чтения и мутации реализованы Server Components/Server Actions и повторно валидируют cookie. Эндпоинтов `/api/report`, `/api/records`, `/api/sellers`, `/api/sale-items/*`, `/api/reset-day` и `/api/refresh` в текущей архитектуре нет. `DEMO_MODE=true` — единственный разрешённый fallback без initData. В production отсутствие или невалидность initData дают «Откройте отчёт через кнопку в Telegram-боте», отсутствие привязки — «Ваш Telegram не привязан к магазину», inactive binding — «Доступ к магазину отключён», отсутствие shop — «Магазин не найден».

`requireOwner()` повторно валидирует сохранённый initData. `requireShopAccess()` и все service-role queries ограничивают чтение/мутации `owner.shopId`. Клиентский `shop_id` не принимается. Service role используется только в server-only модулях. `webapp auth` log не содержит payload: только наличие/длина initData, наличие user id, результат principal lookup и `shopId`.
