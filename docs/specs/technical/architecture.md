# Техническая архитектура

Статус: реализовано в монорепозитории npm workspaces.

## Рабочие области

1. `apps/bot` - Telegraf bot, voice pipeline, обработчики Telegram callback.
2. `apps/web` - Next.js App Router WebApp, route handlers, Server Actions.
3. `packages/shared` - типы, Zod-схемы, parser evidence rules, утилиты даты и отчёта.
4. `supabase/migrations` - Postgres schema, RLS/grants, RPC, soft delete.
5. `docs` - продуктовая, техническая, data, feature и rule documentation.
6. `scripts` - команды настройки webhook и webhook info.

## Обзор выполнения

```text
Telegram voice
  -> webhook route
  -> Telegraf update processor
  -> voice handler
  -> audio download
  -> audio preparation
  -> STT
  -> LLM cleanup/parser
  -> deterministic evidence layer
  -> Supabase RPC save_voice_sale
  -> read-back verification
  -> Telegram reply
  -> WebApp report/review/records/sellers
```

## Граница Telegram webhook

`apps/web/src/app/api/telegram/webhook/route.ts`:

1. Работает в Node.js runtime.
2. Читает `x-telegram-bot-api-secret-token`.
3. Сравнивает secret constant-time.
4. Парсит update JSON.
5. Логирует безопасную update metadata.
6. Вызывает `processTelegramUpdate(update)`.
7. Возвращает `{ ok: true }` или `{ ok: false }`.

Route должен получать updates `message` и `callback_query`.

## Модуль bot

`apps/bot/src/core/process-update.ts` создаёт один общий экземпляр Telegraf:

1. Загружает env через `getEnv()`.
2. Создаёт bot с `TELEGRAM_BOT_TOKEN`.
3. Регистрирует `/start`.
4. Регистрирует review callback handler.
5. Регистрирует voice handler.
6. Регистрирует text handler.
7. Регистрирует catch handler.

Bot может работать за Vercel webhook через route веб-приложения.

## Voice pipeline

`apps/bot/src/handlers/voice.handler.ts`:

1. Валидирует Telegram user id.
2. Резолвит seller.
3. Sends "Голосовое получено, обрабатываю."
4. Скачивает Telegram file.
5. Конвертирует audio в mp3, когда доступен ffmpeg.
6. Переключается на оригинальный OGG, когда конвертация недоступна или завершается ошибкой.
7. Загружает original audio best-effort.
8. Вызывает STT.
9. Логирует raw transcript через audit log best-effort.
10. Вызывает cleanup LLM.
11. Вызывает parser LLM.
12. Применяет deterministic transcript evidence.
13. Сохраняет sale через service layer.
14. Отвечает success или review message.

Pipeline failures размечаются через `VoiceFailureStage`, чтобы ошибки можно было диагностировать.

## Граница parser

`packages/shared/utils/sale-parser.ts` является deterministic guard между LLM output и persistence.

Он обрабатывает:

1. Number words.
2. Десятичную запятую.
3. Units `шт`, `кг`, `г`.
4. Bottle forms, нормализованные в `шт`.
5. Bare quantity before price: `5 по 100`.
6. Price markers `руб`, `рублей`, `₽`.
7. Multi-item split по sentence/segment evidence.
8. Склеенный single-item LLM output.
9. Неполные leftovers.
10. Снижение confidence для incomplete items.

Parser output затем проходит через `normalizeSaleItemFields()`.

## Граница persistence

`apps/bot/src/services/records.service.ts`:

1. Создаёт Supabase service role client server-side.
2. Резолвит продавца и магазин.
3. Нормализует products и units.
4. Резолвит optional product catalog match.
5. Строит RPC payload.
6. Вызывает `save_voice_sale`.
7. Проверяет returned identifiers.
8. Читает sale обратно.
9. Читает item count обратно.
10. Выбрасывает ошибку, если persisted count не совпадает с expected count.

False success запрещён. Если persistence завершается ошибкой, пользователь видит сообщение о неудачном сохранении.

## Схема Supabase

Core tables:

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
2. Audio upload best-effort.
3. Signed URLs создаются server-side для журнала записей.

RPC:

1. `save_voice_sale`.
2. `security invoker`.
3. Проверяет, что active seller принадлежит shop.
4. Вставляет voice, sale и items.
5. Execute выдан только service role.

## Модель статусов

Статусы parent:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

Статусы item:

1. `processed`.
2. `needs_review`.
3. `needs_price` legacy.
4. `failed`.
5. `excluded`.

Revenue управляется в первую очередь item status плюс исключением parent sale для `cancelled` и `failed`.

## Архитектура WebApp

`apps/web` использует Server Components для загрузки данных:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.
5. `/debug-telegram`.

Client components используются для:

1. Telegram auth bootstrap.
2. Sale item card edit/delete UI state.
3. Refresh button.
4. Confirm submit button.
5. Diagnostics component.

Client components не хранят доверенные полномочия магазина.

## Auth WebApp

`resolveRequestContext()` sources:

1. Header raw initData.
2. HttpOnly cookie с raw initData.
3. Explicit fallback env.
4. Demo mode.

Telegram mode:

1. Verify HMAC with bot token.
2. Проверяет auth date freshness.
3. Сначала резолвит продавца.
4. Резолвит владельца, если продавец отсутствует.
5. Владелец может создать seller binding в том же магазине.
6. Возвращает `OwnerContext`.

Fallback mode:

1. Requires `ALLOW_WEBAPP_FALLBACK=true`.
2. Requires `DEFAULT_SHOP_ID`.
3. Requires `DEFAULT_SELLER_ID`.
4. Загружает seller server-side.
5. Проверяет active seller.
6. Проверяет, что seller shop совпадает с fallback shop.

## Расчёт отчёта

`getReport(filters)`:

1. Считает date range в `Europe/Moscow`.
2. Резолвит owner context.
3. Читает sales по магазину и периоду.
4. Читает items по sale ids.
5. Ограничивает rows через `scopeReportRows()`.
6. Исключает parent `cancelled` и `failed`.
7. Оставляет parent `needs_review` items, чтобы processed siblings могли учитываться.
8. Разделяет active/deleted items.
9. Строит summary через `buildSalesReport()`.

## Мутации

Мутации WebApp являются Server Actions и service functions:

1. `updateSaleItem`.
2. `excludeSaleItem`.
3. `restoreSaleItem`.
4. `resetDay`.
5. `confirmReviewSale`.
6. `cancelReviewSale`.

Every mutation:

1. Резолвит current shop.
2. Читает parent row.
3. Проверяет shop access.
4. Выполняет mutation через admin client.
5. Проверяет affected row, когда нужно.
6. Recalculates sale.
7. Revalidate affected routes.

## Confirm/cancel проверки

Telegram и WebApp используют одни и те же domain rules:

1. Already processed -> unchanged success.
2. Already cancelled -> unchanged success.
3. Failed -> forbidden.
4. Нет confirmable active item -> readable error.
5. Mixed cart -> подтвердить valid items, оставить incomplete items в review.
6. Complete cart -> sale/voice processed.
7. Cancel -> sale/voice cancelled, active items soft-deleted.

## Модель безопасности

1. Service role остаётся server-side.
2. RLS остаётся включённым.
3. Business authorization enforced в application service layer.
4. `shop_id` никогда не приходит из client authority.
5. Telegram webhook secret защищает webhook route.
6. Telegram initData HMAC защищает WebApp session.
7. Diagnostics не раскрывает raw initData или tokens.
8. Debug route закрыт gate в production.

## Обработка ошибок

1. Ошибки voice pipeline включают stage.
2. Parser fallback превращает recoverable parser issues в review rows.
3. Ошибки Supabase persistence предотвращают false success.
4. Ошибки auth WebApp дают user-facing messages.
5. Ошибки загрузки DB не превращаются в empty states.
6. Ошибки audit log являются best-effort и non-blocking.
7. Revalidation failure после успешной mutation даёт soft refresh message.

## Граница тестирования

Тесты покрывают:

1. Parser split и evidence rules.
2. Расчёты даты/отчёта.
3. Парсинг Telegram callback и клавиатуру.
4. Переходы статусов confirm/cancel.
5. Область records/report.
6. Поведение logger.
7. Audio conversion fallback.
8. Telegram WebApp session.
9. WebApp mutation patches.

## Критерии приемки

1. Voice sale может быть сохранена только после seller/shop resolution.
2. RPC read-back проверяет sale и item count.
3. Review message содержит только две кнопки.
4. Callback delivery включает `callback_query`.
5. WebApp data приходит из server-derived shop.
6. Item-level revenue совпадает с кодом и спецификациями.
7. Soft delete является единственным delete path для sale items.
8. Auth и DB errors остаются видимыми.
9. Quality gate commands проходят перед release.
