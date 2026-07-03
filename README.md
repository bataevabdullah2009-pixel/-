# Голосовой журнал продаж

Telegram bot + Telegram WebApp для магазина, где продавец надиктовывает продажи голосом, а система сохраняет распознанные товары, цены, количество и выручку в Supabase.

## Текущая модель продукта

```text
Продавец -> Telegram voice
  -> bot downloads audio
  -> audio is prepared for STT
  -> STT returns Russian transcript
  -> LLM/parser returns sale items
  -> deterministic fallback splits glued or partially parsed items
  -> Supabase saves voice_records, sales, sale_items
  -> Telegram sends success or review decision buttons
  -> WebApp shows report, records and sellers
```

Уверенная запись получает `processed`, сразу входит в выручку и получает обычный ответ бота без inline-кнопок.

Сомнительная запись получает `needs_review` и подтверждается Telegram inline-кнопками `✅ Подтвердить` / `❌ Отмена` либо вкладкой WebApp `Проверка`. Неполные позиции не входят в выручку; активные `processed` позиции учитываются даже если parent sale остаётся `needs_review` из-за других неполных строк. В сообщении сомнительной записи нет кнопки `Открыть отчёт`.

Confirm работает на уровне `sale_items`: если в корзине есть хотя бы одна полная позиция, она переводится в `processed`, попадает в `sales.total_amount` и начинает входить в выручку. Неполные позиции той же записи остаются active `needs_review` и продолжают отображаться во вкладке `Проверка`. Если нет ни одной полной позиции, confirm не выполняется и пользователь видит сообщение `Не удалось подтвердить: нет ни одной полной позиции.` При успехе Telegram/WebApp показывают `✅ Подтверждено: N позиций, сумма X ₽`.

Parser fallback поддерживает фразы с точкой, запятой после названия, союзом `и`, новой строкой и несколькими товарами подряд. Если LLM вернул один длинный item вроде `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.`, fallback создаёт две строки `sale_items`. Неполные остатки, например `Корзина продуктов`, сохраняются отдельной review-позицией и не блокируют валидные товары.

Отмена переводит запись в `cancelled`, soft-delete active items и оставляет запись вне выручки. `failed` используется для voice pipeline failures и не входит в отчёт.

## WebApp

Нижняя навигация содержит четыре раздела:

- `Отчёт`;
- `Проверка`;
- `Записи`;
- `Продавцы`.

Экран `Отчёт` использует спокойный premium SaaS dashboard:

- background `#0B1020`;
- surfaces `#12192B` и `#161F34`;
- основной accent `#5B8CFF`;
- warning `#F59E0B` только для review-состояний;
- danger `#EF4444` только для удаления и ошибок.

Экран показывает:

- один заголовок `Сводка магазина`;
- название магазина и выбранный период;
- карточки `Выручка`, `Количество товаров`, `Записей`, `Нужно проверить`;
- компактную аналитику по дням с суммами;
- компактный выбор периода: сегодня, вчера, неделя, месяц и дата;
- топ товаров;
- продажи за период;
- блок `Нужно проверить`, если есть active `needs_review` данные, без смешивания с выручкой.

Экран `Проверка` показывает только active `needs_review` позиции. Каждая позиция остаётся отдельной карточкой, может быть отредактирована или исключена, а кнопки `Подтвердить`, `Отмена` и `Подтвердить всё` вызывают server actions для parent sale. Эти действия синхронизируются с теми же статусами и выручкой, что Telegram callback.

Экран `Записи` показывает voice-sale журнал: дата, продавец, распознанный текст, статус, сумма, аудио при наличии и раскрытие товаров. Для `needs_review` показывается бейдж `Нужно подтвердить в Telegram`.

Экран `Продавцы` показывает имя, активность, количество записей и выручку за выбранный период.

## Редактирование товаров

Карточка товара в WebApp имеет компактный обычный режим:

```text
Сникерс
5 шт × 100 ₽
500 ₽                         ✏️ 🗑
```

Карандаш открывает compact edit mode с полями `Товар`, `Количество`, `Единица`, `Цена, ₽`, кнопками `Сохранить` и `Отмена`. Единица поддерживает `шт`, `кг` и `г`; parser также нормализует `бутылка/бутылки/бутылок` в `шт`. Для граммов сумма считается как доля килограмма от цены за кг.

Сохранение вручную реально обновляет строку `sale_items`, пересчитывает `total`, ставит item в `processed` и убирает ошибку цены. Если parent sale ещё `needs_review`, эта позиция уже может войти в выручку; неполные соседние позиции остаются в `Проверке`.

Корзина открывает локальный confirm dialog `Удалить товар из отчёта?` с действиями `Удалить` и `Отмена`.

Сохранение и удаление выполняются через server actions, которые используют Supabase admin client, проверяют shop access через Telegram WebApp session и пересчитывают `sales.total_amount`.

## Выручка

В выручку входят только позиции, которые одновременно удовлетворяют условиям:

- `sale_items.status = processed`;
- parent `sales.status` не `cancelled` и не `failed`;
- `sale_items.deleted_at is null`;
- `sale_items.total is not null`;
- количество/вес валидны;
- `sale_items.price` валиден либо может быть восстановлен из `total / quantity`.

Не входят:

- `needs_review`;
- parent sale `cancelled`;
- parent sale `failed`;
- `excluded`;
- soft-deleted rows;
- active items со статусами `needs_review`, `needs_price` или `failed`.

## Telegram bot

Основные команды и сценарии:

- `/start` регистрирует или проверяет продавца, выдаёт WebApp кнопку отчёта и persistent menu button;
- voice message запускает pipeline распознавания;
- уверенная запись отвечает `✅ Запись сохранена: ...`;
- сомнительная запись отвечает `⚠️ Запись сохранена, но нужно подтвердить товары и цены. Распознано: ...`;
- `✅ Подтвердить` переводит sale/voice и валидные active items в `processed`;
- успешный confirm отвечает `✅ Подтверждено: N позиций, сумма X ₽`;
- неполные active items той же записи остаются `needs_review` и не входят в выручку;
- `❌ Отмена` переводит sale/voice в `cancelled` и soft-delete active items;
- webhook должен быть установлен с `allowed_updates: ["message", "callback_query"]`.

Callback data:

```text
confirm:<sale_id>
cancel:<sale_id>
```

Legacy callback prefix `voice_sale_review:` принимается для уже отправленных старых сообщений, но новые сообщения используют короткий формат.

## Diagnostics

Telegram diagnostics доступны только через `/debug-telegram` в development или при `DEBUG_TELEGRAM_WEBAPP=true` в production. Основной пользовательский сценарий не показывает диагностические кнопки.

## Команды

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run web:build
npm run telegram:set-webhook
npm run telegram:webhook-info
```

В PowerShell на машине с заблокированным `npm.ps1` используйте `npm.cmd`:

```bash
npm.cmd run test
```

## Env

Локальная разработка использует `.env.local`; шаблон лежит в `.env.example`.

- `TELEGRAM_BOT_TOKEN` - токен Telegram bot.
- `TELEGRAM_WEBHOOK_SECRET` - секрет webhook route.
- `NEXT_PUBLIC_APP_URL` - публичный URL WebApp.
- `PUBLIC_WEBHOOK_URL` - опциональный отдельный URL webhook или полный `/api/telegram/webhook`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase project keys; service role используется только server-side.
- `SUPABASE_STORAGE_BUCKET` - bucket для voice audio, по умолчанию `voice-records`.
- `STT_API_KEY`, `STT_API_URL`, `STT_MODEL` - speech-to-text.
- `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` - parser/cleanup LLM.
- `DEMO_MODE`, `DEMO_OWNER_TELEGRAM_ID`, `DEFAULT_SHOP_NAME` - demo/bootstrap режим.
- `ALLOW_WEBAPP_FALLBACK`, `DEFAULT_SHOP_ID`, `DEFAULT_SELLER_ID` - локальный fallback WebApp без Telegram initData.
- `DEBUG_TELEGRAM_WEBAPP` - диагностический экран Telegram WebApp.

## Локальный запуск

1. Установить зависимости: `npm install`.
2. Заполнить `.env.local`.
3. Запустить bot + WebApp: `npm run dev`.
4. Для отдельного WebApp: `npm run web:dev`.
5. Если нужен Telegram webhook, задать публичный HTTPS URL и выполнить `npm run telegram:set-webhook`.

## Deploy

WebApp и webhook рассчитаны на Vercel/Next.js App Router. Перед deploy проверить env vars, Supabase migrations, Storage bucket, webhook URL и `allowed_updates: ["message", "callback_query"]`. После deploy выполнить `npm run telegram:webhook-info`, отправить тестовый voice message и проверить Vercel/Supabase logs без секретов.

## Тестирование

Минимальный quality gate:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

`npm run build` запускает workspace builds, включая TypeScript check для bot и Next.js build/typecheck для WebApp.

## Структура

- `apps/bot` - Telegram bot, voice pipeline, callback handlers.
- `apps/web` - Next.js WebApp, report, records, sellers, server actions.
- `packages/shared` - общие типы, parser/report utilities, date range.
- `supabase/migrations` - schema migrations.
- `docs/specs` - product/technical specs.
- `codex/skills/voice-sales-log/SKILL.md` - локальные правила работы агента с проектом.

## Документация

Перед изменениями читать:

- [AGENTS.md](./AGENTS.md)
- [docs/specs/product/telegram-confirmation-flow.md](./docs/specs/product/telegram-confirmation-flow.md)
- [docs/specs/product/webapp-report.md](./docs/specs/product/webapp-report.md)
- [docs/specs/product/sale-item-editing.md](./docs/specs/product/sale-item-editing.md)
- [docs/specs/technical/database.md](./docs/specs/technical/database.md)
- [docs/specs/technical/telegram-webhook.md](./docs/specs/technical/telegram-webhook.md)
- [docs/specs/technical/telegram-webapp-session.md](./docs/specs/technical/telegram-webapp-session.md)

## Product smoke

Проверять перед сдачей:

1. `Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей.` создаёт 2 позиции, сумма `1100 ₽`, status `processed`, без confirm error.
2. `Буханка хлеба, 6 штук по 200 рублей. Масса сливочная, 1 штука по 100 рублей.` попадает в `Проверка`, если confidence требует проверки; confirm не показывает ложную ошибку, валидные позиции входят в выручку.
3. `Корзина продуктов.` не подтверждается и возвращает `Не удалось подтвердить: нет ни одной полной позиции.`
4. Повторный `✅ Подтвердить` по уже подтверждённой записи возвращает `✅ Уже подтверждено`, без дублей и ошибок.
5. `❌ Отмена` переводит запись в `cancelled`, soft-delete active items, исключает их из выручки и обновляет WebApp.
6. `✏️` редактирует товар, сохраняет Supabase row, пересчитывает item total и report totals.
7. `🗑` soft-delete товар, он исчезает из active отчёта и не возвращается после reload.

## Backlog

- Production smoke с реальным Telegram bot после deploy.
- Проверка аудио из Supabase Storage на production URL.
- Экспорт отчёта в CSV/XLSX.
- Улучшенный экран восстановления soft-deleted items.
- Расширенная аналитика parser confidence и STT failures.
