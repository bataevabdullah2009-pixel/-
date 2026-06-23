# Mobile Web App

Web App оптимизирован для мобильного Telegram и прямого browser fallback открытия.

Auth modes:

- Telegram mode: bootstrap ждёт непустой initData, `apiFetch` отправляет `x-app-mode: telegram` и `x-telegram-init-data`.
- Fallback mode: initData нет, `apiFetch` отправляет `x-app-mode: fallback`, сервер загружает fallback seller и проверяет совпадение его `shop_id` с `DEFAULT_SHOP_ID`.

Отсутствие initData не заменяет весь интерфейс красной ошибкой. Debug page `/debug-telegram` показывает безопасные признаки SDK и длину initData.

Навигация: отчёт, записи, продавцы.
