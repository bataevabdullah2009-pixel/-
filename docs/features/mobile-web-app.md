# Mobile Web App

Web App оптимизирован для мобильного Telegram и прямого browser fallback открытия.

Auth modes:

- Telegram mode: SDK даёт initData, `apiFetch` отправляет `x-app-mode: telegram` и `x-telegram-init-data`.
- Fallback mode: initData нет, `apiFetch` отправляет `x-app-mode: fallback`, сервер использует fallback env.

Отсутствие initData не заменяет весь интерфейс красной ошибкой. Debug page `/debug-telegram` показывает безопасные признаки SDK и длину initData.

Навигация: отчёт, записи, продавцы.
