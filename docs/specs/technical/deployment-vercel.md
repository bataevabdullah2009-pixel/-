# Деплой на Vercel

Статус: проект рассчитан на Vercel/Next.js App Router deployment с Telegram webhook route и Supabase backend.

## Команда сборки

```bash
npm run build
```

Для отдельной проверки WebApp:

```bash
npm run web:build
```

В PowerShell при заблокированном `npm.ps1`:

```bash
npm.cmd run build
npm.cmd run web:build
```

## Среда выполнения

1. WebApp работает на Next.js App Router.
2. Telegram webhook route использует Node.js runtime.
3. Webhook max duration: 60 seconds.
4. Bot update processor запускается внутри route handler.
5. Server Actions выполняются на сервере.
6. Supabase service role доступен только server-side.

## Обязательные env

Telegram:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
PUBLIC_WEBHOOK_URL=
```

Supabase:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=voice-records
```

STT:

```text
STT_API_KEY=
STT_API_URL=
STT_MODEL=whisper-large-v3-turbo
```

LLM:

```text
LLM_API_KEY=
LLM_API_URL=
LLM_MODEL=
```

Modes:

```text
DEMO_MODE=false
DEMO_OWNER_TELEGRAM_ID=
DEFAULT_SHOP_NAME=Демо-магазин
ALLOW_WEBAPP_FALLBACK=false
DEFAULT_SHOP_ID=
DEFAULT_SELLER_ID=
DEBUG_TELEGRAM_WEBAPP=false
```

Production fallback следует включать только намеренно. Если он включён, `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` должны быть заданы и совпадать в DB.

## Требования к URL

`NEXT_PUBLIC_APP_URL`:

1. Должен быть public HTTPS.
2. Должен быть canonical WebApp URL.
3. Используется для Telegram WebApp buttons.
4. Используется webhook scripts для построения default webhook URL.
5. Не должен указывать на localhost в production.

`PUBLIC_WEBHOOK_URL`:

1. Опционален.
2. Может быть отдельным HTTPS base URL.
3. Может быть полным URL `/api/telegram/webhook`.
4. Если не задан, webhook URL строится из `NEXT_PUBLIC_APP_URL`.

## Supabase перед деплоем

Перед деплоем кода, который ожидает текущую схему:

1. Применить все migrations.
2. Подтвердить, что таблица `owners` существует.
3. Подтвердить, что `sale_items.deleted_at` существует.
4. Подтвердить, что `sale_items.deleted_reason` существует.
5. Подтвердить, что `sale_items.deleted_previous_status` существует.
6. Подтвердить, что `sale_items.updated_at` существует.
7. Подтвердить, что `sales.status` разрешает `cancelled`.
8. Подтвердить, что `voice_records.status` разрешает `cancelled`.
9. Подтвердить, что RPC `save_voice_sale` существует.
10. Подтвердить, что execute на RPC выдан service role.
11. Подтвердить, что Storage bucket `voice-records` существует.
12. Подтвердить, что service role может управлять voice audio objects.

## RLS и grants

1. RLS должен оставаться включённым на business tables.
2. Business reads and writes во время выполнения используют server-side service role.
3. Public anon table access не требуется для WebApp business data.
4. `owners` не должен быть exposed to anon/authenticated clients.
5. New Supabase tables, которые должны быть видимы Data API, требуют explicit grants, но business tables всё равно должны быть защищены RLS и server-side access checks.

## Настройка Telegram webhook

Запустить после готовности production URL и env:

```bash
npm run telegram:set-webhook
```

Скрипт должен установить:

```json
["message", "callback_query"]
```

Затем проверить:

```bash
npm run telegram:webhook-info
```

Проверить:

1. URL совпадает с ожидаемым production webhook.
2. Secret token настроен.
3. `allowed_updates` включает `message`.
4. `allowed_updates` включает `callback_query`.
5. Нет unexpected pending update errors.

## Локальные проверки перед релизом

Запустить:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Ожидается:

1. ESLint проходит.
2. Vitest проходит.
3. Workspace build проходит.
4. Next build проходит.
5. Secret values не появляются в logs.

## Проверка production

После deploy:

1. Открыть WebApp через кнопку Telegram bot.
2. Подтвердить наличие Telegram SDK.
3. Подтвердить, что raw initData не пустой.
4. Подтвердить, что `/api/auth/telegram` возвращает success.
5. Подтвердить, что auth log показывает ожидаемый Telegram user id.
6. Подтвердить, что auth log показывает ожидаемые seller/shop.
7. Подтвердить, что `/daily-report` грузится без auth error.
8. Подтвердить, что report counts ненулевые, когда в DB есть rows.
9. Подтвердить, что `/review` открывается.
10. Подтвердить, что `/records` открывается.
11. Подтвердить, что `/sellers` открывается.
12. Подтвердить, что direct browser fallback работает только если намеренно включён.

## Проверка voice

Отправить уверенную продажу:

```text
Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей.
```

Ожидается:

1. Bot получает voice.
2. Bot отвечает processing message.
3. Bot отвечает success.
4. В Supabase есть одна row `voice_records`.
5. В Supabase есть одна row `sales`.
6. В Supabase есть две `sale_items`.
7. Items имеют `processed`.
8. Total равен `1100`.
9. Report revenue увеличивается.

Отправить review-продажу:

```text
Корзина продуктов.
```

Ожидается:

1. Bot сохраняет review row.
2. Bot показывает две review buttons.
3. В review message нет кнопки `Открыть отчёт`.
4. `/review` показывает active item.
5. Confirm без full item возвращает no-confirmable message.
6. Edit с product/quantity/unit/price может сделать item processed.
7. Cancel выполняет soft-delete active items и исключает sale из revenue.

## Проверка callback

1. Нажать `✅ Подтвердить`.
2. Подтвердить, что callback доставлен.
3. Logs показывают `has_callback_query = true`.
4. Sale/items переходят по mixed-cart rules.
5. Повторный confirm возвращает already confirmed/unchanged behavior.
6. Нажать `❌ Отмена` на другой review sale.
7. Sale/voice становятся `cancelled`.
8. Active items становятся `excluded` с `deleted_at`.

## Smoke-проверка mutation WebApp

1. Отредактировать price у processed item.
2. Проверить изменение total.
3. Перезагрузить page.
4. Проверить, что value сохраняется.
5. Удалить item.
6. Перезагрузить page.
7. Проверить, что item остаётся excluded.
8. Restore item из deleted panel.
9. Проверить, что report recalculates.
10. Reset one day.
11. Проверить, что excluded стали только active items выбранного дня.

## Диагностика

`DEBUG_TELEGRAM_WEBAPP`:

1. Должен отсутствовать или быть `false` в normal production.
2. Может временно устанавливаться в `true`.
3. Включает diagnostics button/page.
4. Должен быть выключен после debugging.

Diagnostics может показывать SDK/initData metadata, но не должен показывать raw initData или secrets.

## Обработка сбоев

Если WebApp показывает auth error:

1. Проверить `NEXT_PUBLIC_APP_URL`.
2. Проверить, что bot открывает тот же production URL.
3. Проверить `TELEGRAM_BOT_TOKEN`.
4. Проверить initData freshness.
5. Проверить seller/owner binding.
6. Проверить fallback env, если используется direct browser.

Если callback buttons ничего не делают:

1. Запустить `npm run telegram:webhook-info`.
2. Проверить `allowed_updates`.
3. Проверить webhook secret.
4. Проверить route logs.
5. Проверить callback data format.

Если report неожиданно пустой:

1. Проверить auth log seller/shop.
2. Проверить report log seller/shop.
3. Проверить sales для этого shop и period.
4. Проверить parent statuses.
5. Проверить item statuses.
6. Проверить `deleted_at`.
7. Проверить totals.

## Критерии приемки

1. Migrations применены перед code deploy.
2. Build проходит.
3. Telegram webhook установлен на production route.
4. Доставка `callback_query` включена.
5. WebApp открывается через Telegram с valid initData.
6. Fallback явный и проверенный, если используется.
7. Voice sale сохраняется через RPC.
8. Review confirm/cancel работает в Telegram.
9. Review confirm/cancel работает в WebApp.
10. Service role key не попадает в client assets.
