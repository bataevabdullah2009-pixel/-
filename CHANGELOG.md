# CHANGELOG

## 2026-07-02 - Callback delivery, parser split and premium review dashboard

### Telegram

- Root cause callback-кнопок найден и подтверждён live `getWebhookInfo`: production URL был верный, но webhook был установлен с `allowed_updates: ["message"]`, поэтому Telegram не доставлял `callback_query`.
- `scripts/set-telegram-webhook.ts` теперь устанавливает `allowed_updates: ["message", "callback_query"]`; live webhook-info подтверждает оба типа update.
- Webhook route логирует безопасный `telegram_update_received` с `has_message`, `has_voice`, `has_callback_query`, `callback_query_id`, `callback_data`, `callback_from_id`, `callback_message_id`.
- Review callback data остаются короткими: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Legacy callback prefix `voice_sale_review:` остаётся совместимым для старых сообщений.
- Повторное нажатие получает `answerCallbackQuery` с текстом `Эта запись уже обработана`.
- Неправильный callback format получает понятный ответ `Некорректная кнопка.`.

### Parser

- `enforceTranscriptEvidence` разбивает один склеенный LLM item на несколько sale_items, если transcript содержит несколько товарных сегментов через точку, запятую или союз.
- Поддержан порядок `3 штуки Сникерса по 200 рублей`, где количество стоит перед названием товара.
- Регрессия покрывает фразы `Буханка хлеба 5 штук по 100 рублей. 3 штуки Сникерса по 200 рублей.` и `Шоколад 5 штук по 100 рублей, хлеб 4 штуки по 50 рублей`.

### WebApp

- Нижняя навигация приведена к четырём разделам: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- `/review` снова является пользовательским экраном: показывает только active `needs_review` позиции, отдельные карточки товаров, `Подтвердить`, `Отмена` и `Подтвердить всё`.
- WebApp review actions используют server-side shop/session checks, переводят parent sale/voice/items в те же статусы, что Telegram callback, и пересчитывают выручку.
- Report UI переведён в premium graphite SaaS style: `#070A0F`, compact 2x2 KPI, умеренный amber accent, тёмные surface-карточки, line-clamp длинных товаров.
- Аналитика получила bar chart с ограниченной шириной столбцов и подписями день + сумма; один столбец больше не растягивается на весь экран.
- Карточки товаров остаются компактными: обычный режим показывает только `✏️` edit и `🗑` delete, edit/delete открываются inline.

### Data and revenue

- Confirm переводит sale/voice/items в `processed`, пересчитывает `total_amount` и добавляет запись в выручку.
- Cancel переводит sale/voice в `cancelled`, items в `excluded` с `deleted_at`, и оставляет выручку нулевой.
- Report scope считает только parent sale `processed` + item `processed` + active non-deleted rows.

### Tests

- Локально пройдены `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build` и `npm.cmd run web:build`.
- `npm.cmd run test`: 8 test files, 96 tests.
- Browser smoke через Playwright + системный Chrome проверил `/daily-report`, `/review`, `/records`, `/sellers` в demo mode: страницы рендерятся без Next error overlay, навигация содержит четыре раздела, CSS-переменные graphite/gold применяются.
- Без demo/fallback локальный browser получает ожидаемое auth-сообщение `Telegram не передал данные сессии...`; это не проверяет реальный Telegram initData.

### Docs

- Обновлены README, AGENTS, overview, specs, features, plans, roadmap, architecture, rules и локальный Codex skill под фактический `/review` и callback delivery.

## 2026-06-30 - Release stabilization, superseded details

- Ветка стабилизации добавляла короткие callback data, WebApp review screen и расширенные проверки update/delete.
- Текущий контракт от 2026-07-02 оставляет две Telegram-кнопки без `Открыть отчёт` и использует `/review` как пользовательский экран проверки.
- Актуальные правила см. в `README.md`, `AGENTS.md` и `docs/specs`.

## 2026-06-25 - WebApp persistence hardening

- Укреплены update/delete server actions для sale items.
- Добавлен soft delete через `deleted_at`.
- Report начал отделять active и deleted items.
- Добавлены regression tests для report totals after update/delete.

## 2026-06-20 - Sales flow stabilization

- Уверенные voice-записи сохраняются как `processed`.
- Неполные или низкоуверенные распознавания сохраняются как `needs_review`.
- Добавлены audit logs для ключевых этапов обработки.
- Сохранение voice sale стало проверять read-back identifiers.

## 2026-06-18 - Soft delete foundation

- Добавлены `sale_items.deleted_at`, `deleted_reason`, `deleted_previous_status`.
- Исключённые товары перестали попадать в active report.
- Restore сохраняет previous status.

## 2026-06-17 - Parser diagnostics

- Добавлены parser JSON diagnostics.
- STT/LLM fallback переводит запись в review вместо тихого failure, если продажу можно сохранить для проверки.

## 2026-06-16 - Initial product baseline

- Создан Telegram bot voice pipeline.
- Созданы Supabase таблицы `shops`, `sellers`, `voice_records`, `sales`, `sale_items`, `products`, `audit_logs`.
- Добавлен Next.js WebApp с отчётом и журналом записей.
