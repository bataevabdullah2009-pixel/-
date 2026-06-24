# Mobile Web App

Web App оптимизирован для мобильного Telegram и прямого browser fallback открытия.

Auth modes:

- Telegram mode: bootstrap проверяет `window.Telegram.WebApp`, непустой raw `initData` и `initDataUnsafe.user.id`; `apiFetch` отправляет `x-app-mode: telegram` и raw строку в `x-telegram-init-data`.
- Fallback mode: initData нет, `apiFetch` отправляет `x-app-mode: fallback`, сервер загружает fallback seller и проверяет совпадение его `shop_id` с `DEFAULT_SHOP_ID`.

Во время bootstrap UI показывает состояние проверки. Ошибка Telegram или сервера отображается явно и не заменяется нулевым отчётом. Если raw initData валиден, production-блокировка «откройте через кнопку бота» не показывается.

Auth log содержит только безопасные признаки: `initDataLength`, Telegram user id, seller id, shop id и error reason. Raw initData, bot token и webhook secret не логируются.

Debug page и кнопка `/debug-telegram` доступны в production только при `DEBUG_TELEGRAM_WEBAPP=true`.

Навигация: отчёт, записи, продавцы.
