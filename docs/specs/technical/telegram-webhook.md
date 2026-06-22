# Telegram webhook и Web App

Webhook: `POST https://<domain>/api/telegram/webhook`. Запрос допускается только при constant-time совпадении `x-telegram-bot-api-secret-token` с `TELEGRAM_WEBHOOK_SECRET`.

Настройка и проверка:

```bash
npm run telegram:set-webhook
npm run telegram:webhook-info
```

`NEXT_PUBLIC_APP_URL` задаёт текущий канонический HTTPS Web App URL и по умолчанию базу webhook URL. При необходимости webhook использует отдельный `PUBLIC_WEBHOOK_URL`, заданный как HTTPS база или полный `/api/telegram/webhook` URL. Общий validator не принимает пустой, непубличный или временный deployment URL. Скрипт `setWebhook` передаёт `secret_token` и `allowed_updates: ["message"]`.

Бот показывает отчёт через reply и inline `Markup.button.webApp('Открыть отчёт', NEXT_PUBLIC_APP_URL)` после `/start`, inline button после успешной продажи и `MenuButtonWebApp` с тем же URL. `/start` отправляет новую кнопку независимо от старых сообщений и Web App button диагностики. Обычная `url`-кнопка запрещена. Frontend не перенаправляет первый document request, вызывает `ready()`/`expand()` после hydration и отправляет initData в `x-telegram-init-data` через общий `apiFetch`.

`npm run telegram:webhook-info` выводит `current_webhook_url`, `pending_update_count`, `last_error`, `allowed_updates`, `configured_web_app_url`, `expected_webhook_url` и `webhook_matches_expected`. Расхождение URL завершает команду с ошибкой. Конкретный production URL не фиксируется в спецификации и проверяется перед каждым release.

Voice webhook возвращает Telegram технический `{ ok }`, а полный результат pipeline сообщает пользователю бот. Ошибки пишутся как `voice_failed` с этапом; токены и ключи редактируются логгером.
