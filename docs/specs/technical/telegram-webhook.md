# Telegram webhook

Endpoint: `POST /api/telegram/webhook`.

Запрос принимается только при совпадении `x-telegram-bot-api-secret-token` с `TELEGRAM_WEBHOOK_SECRET`. Сравнение выполняется constant-time. Обработка делегируется существующему bot pipeline; секреты и содержимое аудио не возвращаются клиенту.

Настройка: `npm run telegram:set-webhook`. Диагностика: `npm run telegram:webhook-info`.
