# Telegram Webhook and Web App

Webhook endpoint: `POST /api/telegram/webhook`. Запрос допускается только при constant-time совпадении `x-telegram-bot-api-secret-token` с `TELEGRAM_WEBHOOK_SECRET`.

`/start` отправляет:

- reply `web_app` кнопку «Открыть отчёт»;
- inline `web_app` кнопку «Открыть отчёт»;
- `MenuButtonWebApp` с тем же Web App URL.

Frontend загружает официальный `telegram-web-app.js`, вызывает `ready()` и `expand()`, затем использует `getAppAuthContext()` и `apiFetch()`.

При `DEBUG_TELEGRAM_WEBAPP=true` inline keyboard дополнительно содержит «Диагностика Telegram», а route `/debug-telegram` показывает только безопасные признаки: `hasWindow`, `hasTelegram`, `hasWebApp`, `initDataLength`, наличие user id, platform/version. В production без флага кнопка скрыта, route возвращает 404.

Webhook secret проверяет только webhook header. WebApp initData HMAC использует `TELEGRAM_BOT_TOKEN`.
