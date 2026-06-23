# Telegram Webhook and Web App

Webhook endpoint: `POST /api/telegram/webhook`. Запрос допускается только при constant-time совпадении `x-telegram-bot-api-secret-token` с `TELEGRAM_WEBHOOK_SECRET`.

`/start` отправляет:

- reply `web_app` кнопку «Открыть отчёт»;
- inline `web_app` кнопку «Открыть отчёт»;
- inline `web_app` кнопку «Диагностика Telegram»;
- `MenuButtonWebApp` с тем же Web App URL.

Frontend загружает официальный `telegram-web-app.js`, вызывает `ready()` и `expand()`, затем использует `getAppAuthContext()` и `apiFetch()`.

Диагностика показывает только безопасные признаки: `hasWindow`, `hasTelegram`, `hasWebApp`, `initDataLength`, platform/version. Payload initData и токены не выводятся.
