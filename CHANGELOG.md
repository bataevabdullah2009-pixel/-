# CHANGELOG

## 2026-07-03 - Idempotent confirm without false status error

### Root cause

- Confirm/update flow relied on mutation response shape and secondary `voice_records` updates. When the main `sales`/`sale_items` update had already applied, an empty returned `data` or secondary update/read-back problem could still surface to WebApp as `Не удалось обновить статус записи.`.
- Supabase `update()` does not return updated rows by default unless `.select()` is chained; code must not treat empty mutation data as failure when the final DB state can be read back as correct.

### Fix

- Telegram and WebApp confirm are idempotent: already confirmed records return `✅ Уже подтверждено`.
- Confirm now updates valid active items, refetches active items and parent sale, recalculates `total_amount`, and returns a normalized success response with `ok`, `recordId`, `confirmedItemsCount`, `totalAmount`, `status`, `message`.
- If incomplete items remain, the parent sale/voice record can stay `needs_review`; active `processed` items are still counted in revenue and incomplete items stay visible in `Проверка`.
- WebApp review and daily-report actions no longer turn a successful backend mutation into a user-facing error if route revalidation fails; they show a soft refresh message instead.
- Debug logs were added for confirm record id, found/valid item counts, item update results, sale update result, final sale read-back and returned response. Logs do not include tokens, initData or keys.

### Verification

- Added regression coverage for empty Supabase update `data` with no `error`, already-confirmed confirm, mixed valid+invalid confirm, no-valid-items confirm, cancel and WebApp-save-then-confirm behavior.
- Revenue scope now counts active `processed` items when parent sale is `needs_review`, while `cancelled`/`failed` parents and deleted/excluded items remain excluded.

## 2026-07-03 - Parser fallback restores multi-item sale_items

### Root cause

- Причина склейки товаров была в deterministic evidence fallback: он грубо делил по запятой, поэтому `Сникерс, 3 штуки по 200 рублей` распадался на `Сникерс` и `3 штуки...`, а complete item не создавался. Если LLM возвращал один длинный item, в `sale_items` уходила одна строка с полным текстом, `quantity = 1`, `price = null`, `total = null`.
- Read-only Supabase проверка последних записей подтвердила старые glued rows: последние multi-item voice sales имели один `sale_items.product_name` с полным текстом и `needs_review`/неполные цены.

### Parser and normalization

- Fallback parser теперь ищет complete item evidence по всей фразе без split по запятой между названием и количеством.
- Поддержаны формы `Сникерс 5 по 100`, `Пицца 1 штука 500 рублей`, `Хлеб 3 штуки по 50, шоколад 2 штуки по 100`, `Кола 2 бутылки по 150 рублей`.
- Неполные остатки вроде `Корзина продуктов` сохраняются отдельными `needs_review` items и не блокируют валидные позиции.
- Parser fallback используется также при invalid LLM JSON/parser fallback, чтобы recoverable parser failure не превращал всю продажу в одну строку.

### Confirm and WebApp save

- Telegram и WebApp confirm логируют найденные items, валидные items и причины невалидности по каждой позиции.
- Успешный confirm теперь отвечает `✅ Подтверждено: N позиций, сумма X ₽`.
- Ручное сохранение товара в WebApp обновляет `sale_items`, пересчитывает `total`, ставит item `processed` и revalidate затронутые report/review/records/sellers routes. Active `processed` item может входить в выручку, даже если parent sale остаётся `needs_review` из-за других неполных позиций.

### Verification

- Добавлены regression tests для точного сценария `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.`: 2 items, сумма `850`, оба valid.
- Добавлены tests для mixed valid+incomplete sale, text-only incomplete sale, bare quantity `5 по 100`, bottles и ручного WebApp save patch.
- Пройдены `npm.cmd run test` (8 files, 109 tests), `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run web:build`.
- Supabase smoke через реальный `save_voice_sale` RPC создал временную запись с двумя `sale_items` (`600 + 250 = 850`) и затем удалил созданные `sales`, `sale_items`, `voice_records`; cleanup check вернул нули.

## 2026-07-02 - Mixed cart confirmation and calm SaaS WebApp

### Confirm flow

- Исправлена причина ошибки `Перед подтверждением нужны товар, количество и цена хотя бы в одной позиции.`: confirm-flow требовал, чтобы все active `sale_items` были полными, и блокировал всю корзину при одной неполной позиции.
- Telegram `confirmVoiceSaleWithClient` и WebApp `confirmReviewSale` теперь подтверждают все валидные active items, переводят их в `processed`, пересчитывают `sales.total_amount`, а неполные active items оставляют в `needs_review`.
- Если нет ни одной полной позиции, confirm не меняет sale/items и возвращает `Не удалось подтвердить: нет ни одной полной позиции.`
- Валидная позиция: осмысленный `product_name`, положительное количество/вес и либо `price`, либо `total`, из которого можно вывести unit price.
- Поддержаны весовые единицы `кг` и `г`; `300 грамм по 200 рублей` считается как `0.3 * 200 = 60`.

### WebApp

- WebApp переведён на спокойный premium SaaS дизайн-сет: background `#0B1020`, surface `#12192B`, surface2 `#161F34`, accent `#5B8CFF`, warning `#F59E0B`, danger `#EF4444`.
- Оранжевый убран из основного интерфейсного акцента и оставлен только для review/warning состояний.
- KPI, фильтры, график, топ товаров, последние продажи, проверка, записи и продавцы получили компактные карточки, ровные hit areas и единый spacing.
- `SaleItemCard` показывает причины проверки (`нет цены`, `нет количества или веса`, `не удалось выделить отдельный товар`) и поддерживает редактирование единицы `шт`/`кг`/`г`.
- Быстрые периоды в UI: `Сегодня`, `Вчера`, `Неделя`, `Месяц` плюс выбор даты.
- Добавлена явная `favicon.svg` в новой палитре, чтобы WebApp не создавал 404 на browser smoke.

### Tests and docs

- Добавлены regression tests для полной корзины, mixed cart и корзины без валидных позиций.
- Добавлены parser/shared tests для граммов и total-only распознавания.
- Обновлены README, AGENTS, specs, features, architecture/rules/overview и планы под фактический код.

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
- Report UI получил первую compact SaaS-итерацию; актуальная палитра после текущего изменения описана выше и использует `#0B1020`, `#12192B`/`#161F34` и accent `#5B8CFF`.
- Аналитика получила bar chart с ограниченной шириной столбцов и подписями день + сумма; один столбец больше не растягивается на весь экран.
- Карточки товаров остаются компактными: обычный режим показывает только `✏️` edit и `🗑` delete, edit/delete открываются inline.

### Data and revenue

- Confirm переводит sale/voice/items в `processed`, пересчитывает `total_amount` и добавляет запись в выручку.
- Cancel переводит sale/voice в `cancelled`, items в `excluded` с `deleted_at`, и оставляет выручку нулевой.
- Report scope rule from this entry was superseded on 2026-07-03: current revenue counts active item `processed` when parent sale is not `cancelled`/`failed`.

### Tests

- Локально пройдены `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build` и `npm.cmd run web:build`.
- `npm.cmd run test`: 8 test files, 96 tests.
- Browser smoke через Playwright + системный Chrome проверил `/daily-report`, `/review`, `/records`, `/sellers` в demo mode: страницы рендерятся без Next error overlay, навигация содержит четыре раздела.
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
