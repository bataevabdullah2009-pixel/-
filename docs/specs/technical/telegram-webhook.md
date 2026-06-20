# Telegram webhook и Web App

Webhook: `POST https://<domain>/api/telegram/webhook`. Запрос допускается только при constant-time совпадении `x-telegram-bot-api-secret-token` с `TELEGRAM_WEBHOOK_SECRET`.

Настройка и проверка:

```bash
npm run telegram:set-webhook
npm run telegram:webhook-info
```

`NEXT_PUBLIC_APP_URL` задаёт одновременно текущий HTTPS Web App URL и базу webhook URL. Скрипт `setWebhook` передаёт `secret_token` и `/api/telegram/webhook`.

Бот показывает отчёт через `Markup.button.webApp('Открыть отчёт', NEXT_PUBLIC_APP_URL)`. Обычная `url`-кнопка запрещена, потому что при ней Telegram не формирует Web App initData. Frontend вызывает `ready()` и отправляет initData в `x-telegram-init-data`.

Voice webhook возвращает Telegram технический `{ ok }`, а полный результат pipeline сообщает пользователю бот. Ошибки пишутся как `voice_failed` с этапом; токены и ключи редактируются логгером.
