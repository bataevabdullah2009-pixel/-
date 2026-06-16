# Bot Spec

## Назначение

Telegram-бот принимает голосовые сообщения продавцов и запускает обработку продажи.

Production-вход работает через Telegram webhook на Vercel route `/api/telegram/webhook`.
Локальная разработка использует polling только через `npm run bot:dev`.

## Команды

| Команда | Поведение |
| --- | --- |
| `/start` | Создаёт или находит продавца, показывает короткое приветствие. |
| text message | Просит отправить голосовое сообщение. |
| voice message | Запускает полный pipeline обработки продажи. |

## Update processing

- Общая функция `processTelegramUpdate(update)` живёт в `apps/bot/src/core/process-update.ts`.
- Webhook route вызывает эту функцию после проверки Telegram secret header.
- Polling-бот вызывает те же Telegraf handlers через тот же processor.
- Неизвестные типы update игнорируются.
- На Vercel polling не запускается.

## Webhook

`apps/web/src/app/api/telegram/webhook/route.ts`:

- принимает только `POST`;
- читает update через `await request.json()`;
- проверяет `x-telegram-bot-api-secret-token`;
- сравнивает header с `TELEGRAM_WEBHOOK_SECRET`;
- при неверном secret возвращает `401`;
- при успехе вызывает `processTelegramUpdate(update)`;
- возвращает `{ ok: true }`;
- при ошибке логирует безопасное сообщение и возвращает `{ ok: false }`.

## Voice message flow

1. Проверить `telegram_id` отправителя.
2. Ответить: `Голосовое получено, обрабатываю.`
3. Получить ссылку на файл через Telegram Bot API.
4. Скачать аудио.
5. Загрузить аудио в Supabase Storage.
6. Конвертировать Telegram OGG/Opus в MP3 через ffmpeg.
7. Отправить MP3 в STT как `audio/mpeg` с filename `voice.mp3`.
8. Получить raw transcript.
9. Очистить текст через LLM.
10. Извлечь позиции продажи через LLM parser.
11. Сохранить данные в Supabase.
12. Ответить продавцу результатом.

Если `ffmpeg-static` недоступен на Vercel или конвертация завершилась ошибкой, бот должен продолжить pipeline с исходным Telegram OGG:

- STT файл: `voice.ogg`;
- MIME type: `audio/ogg`;
- fallback логируется вместе с `ffmpegStaticPath`, `ffmpegExists`, `usingConversion` и `fallbackToOriginalOgg`;
- запись становится `failed` только если fallback STT или более поздний шаг тоже завершился ошибкой.

## Успешный ответ

```text
✅ Запись сохранена:
Хлеб - 3 штуки по 40 рублей.

Статус: processed
```

## Ошибка

Если обработка упала:

```text
⚠️ Не удалось обработать голосовое. Попробуйте ещё раз.
```

При ошибке система должна:

- записать ошибку в лог;
- попытаться создать `voice_record` со статусом `failed`;
- записать событие в `audit_logs`;
- не раскрывать продавцу технические детали.

## Правила

- Бот не считает выручку сам, расчёт находится в сервисном слое.
- Бот не хранит токены в коде.
- Бот не использует browser env.
- Бот работает только с server-side service role.
- Telegram webhook должен быть установлен через `secret_token`.
- Production deployment не должен запускать polling.
