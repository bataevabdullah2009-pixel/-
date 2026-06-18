# Telegram webhook

## Поток доставки

1. `setWebhook` регистрирует `${NEXT_PUBLIC_APP_URL}/api/telegram/webhook`.
2. Telegram отправляет `POST` с Update JSON и секретным заголовком.
3. Route сравнивает заголовок с `TELEGRAM_WEBHOOK_SECRET` через `timingSafeEqual`.
4. Допустимый update передаётся в `processTelegramUpdate`.
5. Telegraf вызывает обработчик `/start`, текста или голоса.

## Почему webhook и polling взаимоисключающие

Telegram Bot API использует либо `getUpdates`, либо webhook. Одновременный запуск создаёт конфликт получения update. `npm run bot:dev` предназначен только для локальной разработки, Vercel — только для webhook.

## Проверка

```bash
npm run telegram:webhook-info
```

Проверяются `url`, `pending_update_count` и `last_error_message`. Скрипт намеренно не печатает токен бота и секрет.

## Переустановка

1. Убедиться, что рабочее развёртывание доступно по HTTPS.
2. Заполнить локальный `.env.local` теми же URL, токеном и секретом.
3. Выполнить `npm run telegram:set-webhook`.
4. Повторно проверить сведения webhook.

Скрипт задаёт `allowed_updates: ["message"]` и `drop_pending_updates: true`. Последняя опция удаляет накопленные update и должна использоваться осознанно.

Текущая схема не обеспечивает идемпотентность сообщения. До публичного использования нужен уникальный ключ update и безопасный повтор.
