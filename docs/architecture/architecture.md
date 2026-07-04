# Архитектура

Канонический архитектурный документ проекта `Голосовой журнал продаж`.

Бизнес-правила продукта, статусов, проверки, подтверждения, отмены и расчёта выручки описаны в [../specs/global.md](../specs/global.md). Этот документ описывает границы модулей и поток данных.

## Граница системы

Проект состоит из пяти основных частей:

1. `apps/bot` - Telegram-бот, голосовой конвейер и обработчики callback.
2. `apps/web` - Next.js Telegram WebApp, route handlers, Server Components и Server Actions.
3. `packages/shared` - общие типы, схемы, deterministic parser/evidence rules и утилиты отчёта.
4. `supabase/migrations` - Postgres schema, RLS/grants, RPC, soft delete и индексы.
5. `scripts` - служебные команды Telegram webhook.

## Общий поток

```text
Telegram voice
  -> webhook route
  -> Telegraf update processor
  -> voice handler
  -> audio download and preparation
  -> STT
  -> LLM cleanup/parser
  -> deterministic evidence layer
  -> Supabase RPC save_voice_sale
  -> read-back verification
  -> Telegram reply or review callback
  -> WebApp report/review/records/sellers
```

## Telegram webhook

`apps/web/src/app/api/telegram/webhook/route.ts`:

1. Работает в Node.js runtime.
2. Проверяет `x-telegram-bot-api-secret-token`.
3. Парсит Telegram update.
4. Логирует только безопасную metadata.
5. Передаёт update в `processTelegramUpdate(update)`.
6. Возвращает JSON-ответ Telegram.

Webhook должен получать `message` и `callback_query`.

## Модуль бота

`apps/bot/src/core/process-update.ts` создаёт общий экземпляр Telegraf и регистрирует:

1. `/start`.
2. Voice handler.
3. Text handler.
4. Review callback handler.
5. Catch handler.

Ключевые модули:

1. `handlers/start.handler.ts` - стартовый сценарий и вход в WebApp.
2. `handlers/voice.handler.ts` - orchestration голосового конвейера.
3. `handlers/review.handler.ts` - callback подтверждения и отмены.
4. `services/transcription.service.ts` - STT.
5. `services/cleanup-text.service.ts` - LLM cleanup/parser.
6. `services/records.service.ts` - сохранение, read-back и доменные операции с продажами.
7. `services/storage.service.ts` - best-effort архивирование аудио.
8. `services/telegram.service.ts` - сообщения и клавиатуры Telegram.

## Голосовой конвейер

`voice.handler.ts` отвечает за порядок выполнения:

1. Проверить Telegram user id.
2. Определить активного продавца и магазин.
3. Скачать Telegram file.
4. Подготовить аудио для STT.
5. Загрузить аудио в Storage best effort.
6. Получить расшифровку.
7. Очистить и распарсить текст.
8. Применить deterministic evidence layer из `packages/shared`.
9. Сохранить продажу через service layer.
10. Проверить сохранение read-back чтением.
11. Отправить пользователю успех или сообщение проверки.

Ошибки конвейера размечаются стадиями, чтобы их можно было диагностировать без раскрытия секретов.

## Граница парсера

`packages/shared/utils/sale-parser.ts` - детерминированная защита между LLM output и сохранением.

Он отвечает за:

1. Нормализацию чисел и единиц.
2. Поддержку `шт`, `кг`, `г` и бутылок как штук.
3. Распознавание цены и суммы.
4. Разделение нескольких позиций в одной фразе.
5. Обработку склеенного single-item LLM output.
6. Сохранение неполных остатков как отдельных позиций проверки.
7. Снижение confidence для неполных или неоднозначных позиций.

## Граница сохранения

`apps/bot/src/services/records.service.ts`:

1. Создаёт server-side Supabase client.
2. Резолвит продавца и магазин.
3. Нормализует позиции продажи.
4. Вызывает RPC `save_voice_sale`.
5. Проверяет возвращённые идентификаторы.
6. Читает продажу обратно.
7. Читает количество сохранённых позиций.
8. Запрещает ложный успех при ошибке или неполном сохранении.

## Supabase

Основные таблицы:

1. `shops`.
2. `owners`.
3. `sellers`.
4. `products`.
5. `voice_records`.
6. `sales`.
7. `sale_items`.
8. `audit_logs`.

Хранилище:

1. Bucket `voice-records`.
2. Audio upload выполняется best effort.
3. Signed URLs для журнала создаются server-side.

RPC:

1. `save_voice_sale`.
2. Проверяет принадлежность active seller к shop.
3. Вставляет voice record, sale и items.
4. Доступен через server-side service role.

## WebApp

`apps/web` использует Server Components для чтения данных:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.
5. `/debug-telegram`.

Client components используются для локального UI-состояния:

1. Telegram auth bootstrap.
2. Sale item edit/delete controls.
3. Refresh button.
4. Confirm submit button.
5. Diagnostics component.

Client components не хранят доверенные полномочия магазина.

## Авторизация WebApp

Серверный request context может быть получен из:

1. Telegram raw initData.
2. HttpOnly cookie с raw initData.
3. Явно разрешённого fallback env.
4. Demo mode.

Правила:

1. Telegram initData проверяется HMAC через bot token.
2. Сервер определяет principal продавца или владельца.
3. Fallback доступен только при `ALLOW_WEBAPP_FALLBACK=true`.
4. `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` должны согласовываться на сервере.
5. `shop_id` из клиентской формы не является источником прав.

## Граница отчёта

Отчёт строится так:

1. Резолвится текущий магазин.
2. Выбираются продажи текущего магазина за период.
3. Позиции выбираются только по этим `sale_id`.
4. `scopeReportRows()` проверяет границу магазина.
5. Aggregation использует правила выручки из [глобальной спецификации](../specs/global.md#17-правила-выручки).

## Мутации WebApp

Мутации выполняются как Server Actions и service functions:

1. `updateSaleItem`.
2. `excludeSaleItem`.
3. `restoreSaleItem`.
4. `resetDay`.
5. `confirmReviewSale`.
6. `cancelReviewSale`.

Каждая мутация:

1. Резолвит текущий магазин.
2. Читает parent row.
3. Проверяет shop access.
4. Выполняет update через server-side Supabase client.
5. Проверяет изменённую строку, когда это важно.
6. Пересчитывает sale.
7. Revalidate затронутые маршруты.

## Безопасность

1. Service role остаётся только на сервере.
2. RLS остаётся включённым.
3. Бизнес-авторизация повторяется в service layer.
4. Telegram webhook secret защищает webhook route.
5. Telegram initData HMAC защищает WebApp session.
6. Диагностика не раскрывает raw initData, tokens и API keys.
7. Debug route закрыт gate в production.

## Ошибки

1. Ошибки voice pipeline содержат stage.
2. Recoverable parser issues превращаются в review rows.
3. Ошибки persistence запрещают false success.
4. Ошибки auth WebApp показываются пользователю.
5. Ошибки БД не маскируются empty state.
6. Ошибки audit log являются best effort и не блокируют пользовательскую мутацию.

## Тестовая граница

Архитектурно чувствительные тесты:

1. `tests/sale-parser.test.ts`.
2. `tests/transcript.test.ts`.
3. `tests/stabilization.test.ts`.
4. `tests/telegram-web-app.test.ts`.
5. `tests/records.test.ts`.
6. `tests/bot.test.ts`.
7. `tests/audio-conversion.test.ts`.

Качество перед релизом:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```
