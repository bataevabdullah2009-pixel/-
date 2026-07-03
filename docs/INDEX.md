# Документация «Голосового журнала продаж»

Статус на 2026-07-03: проект описан как рабочий коммерческий Telegram bot + Telegram WebApp для фиксации продаж голосом.

Эта страница - входная карта по документации и быстрый контроль актуальности. Если поведение кода и короткий документ расходятся, каноническими считаются `README.md`, `AGENTS.md`, подробные specs в `docs/specs` и фактический код.

## Что делает продукт

1. Продавец отправляет voice message в Telegram.
2. Bot скачивает аудио из Telegram.
3. Audio preparation приводит voice к формату, пригодному для STT.
4. STT возвращает русский transcript.
5. LLM очищает текст и пытается выделить товары.
6. Deterministic evidence layer сверяет результат с transcript.
7. Parser fallback разделяет склеенные multi-item фразы на отдельные `sale_items`.
8. Supabase RPC `save_voice_sale` атомарно создаёт `voice_records`, `sales` и `sale_items`.
9. Приложение читает sale и количество items обратно, чтобы не отправить ложный success.
10. Telegram отвечает обычным success для уверенной записи или review-кнопками для сомнительной.
11. WebApp показывает отчёт, проверку, журнал записей и продавцов.
12. Выручка считается по item-level правилам, а не только по parent sale status.

## Карта документации

### Основные документы

1. [README](../README.md) - пользовательский сценарий, запуск, env, smoke и backlog.
2. [AGENTS](../AGENTS.md) - правила работы с проектом и обязательные specs перед изменениями.
3. [Changelog](../CHANGELOG.md) - история изменений и фактические проверки.
4. [Обзор](./overview/README.md) - краткая продуктовая логика.
5. [Продукт](./overview/product.md) - пользовательские статусы и сценарии.
6. [Архитектура](./architecture/architecture.md) - подробная схема модулей.
7. [Глобальная спецификация](./specs/global.md) - сквозные инварианты.

### Product specs

1. [Owner dashboard](./specs/product/owner-dashboard.md) - что владелец видит и чем управляет.
2. [Roles and access](./specs/product/roles-and-access.md) - seller, owner, fallback user и ограничения доступа.
3. [Seller voice flow](./specs/product/seller-voice-flow.md) - путь продавца от voice до результата.
4. [Telegram confirmation flow](./specs/product/telegram-confirmation-flow.md) - confirm/cancel под сообщением бота.
5. [Sale item editing](./specs/product/sale-item-editing.md) - inline edit/delete/restore товара.
6. [WebApp report](./specs/product/webapp-report.md) - отчёт, записи, продавцы и UI-состояния.
7. [Production readiness](./specs/product/production-readiness.md) - release gate и production smoke.

### Technical specs

1. [Architecture](./specs/technical/architecture.md) - техническая карта runtime flow.
2. [API spec](./specs/technical/api-spec.md) - route handlers, Server Components и Server Actions.
3. [Auth and shop isolation](./specs/technical/auth-and-shop-isolation.md) - tenant boundary и session rules.
4. [Database](./specs/technical/database.md) - таблицы, статусы, revenue, soft delete и mutations.
5. [Database schema](./specs/technical/database-schema.md) - краткая итоговая схема.
6. [Deployment Vercel](./specs/technical/deployment-vercel.md) - env, migrations, webhook и smoke.
7. [Error handling](./specs/technical/error-handling.md) - пользовательские и технические ошибки.
8. [Report calculation](./specs/technical/report-calculation.md) - расчёт выручки и периодов.
9. [Telegram webhook](./specs/technical/telegram-webhook.md) - webhook secret, updates и callbacks.
10. [Telegram WebApp session](./specs/technical/telegram-webapp-session.md) - raw initData, cookie, fallback.
11. [Testing strategy](./specs/technical/testing-strategy.md) - регрессии и quality gate.
12. [WebApp API](./specs/technical/webapp-api.md) - подробный контракт чтений и мутаций WebApp.

### Data specs

1. [Data model](./specs/data/data-model.md) - доменная модель продаж и товаров.
2. [Soft delete](./specs/data/soft-delete.md) - исключение и восстановление товаров.
3. [Status lifecycle](./specs/data/status-lifecycle.md) - переходы `processed`, `needs_review`, `cancelled`, `failed`, `excluded`.

### Feature docs

1. [Features](./features/README.md) - список пользовательских возможностей.
2. [Implemented](./features/implemented.md) - реализованная функциональность.
3. [Voice processing](./features/voice-processing.md) - обработка голосовых продаж.
4. [Sales report](./features/sales-report.md) - экран отчёта.
5. [Manual review](./features/manual-review.md) - проверка сомнительных позиций.
6. [Records journal](./features/records-journal.md) - журнал продаж.
7. [Sellers](./features/sellers.md) - статистика продавцов.
8. [Mobile Web App](./features/mobile-web-app.md) - Telegram Mini App UX.
9. [Planned](./features/planned.md) - backlog.
10. [Acceptance matrix](./features/acceptance-matrix.md) - критерии приёмки.

### Rules, plans, roadmap

1. [Rules](./rules/README.md) - краткие правила разработки.
2. [AI rules](./rules/ai.md) - правила LLM/parser.
3. [Data rules](./rules/data.md) - правила данных и revenue.
4. [Deployment rules](./rules/deployment.md) - правила выкладки.
5. [Engineering rules](./rules/engineering.md) - инженерные ограничения.
6. [Security rules](./rules/security.md) - безопасность auth, secrets и RLS.
7. [Plans](./plans/README.md) - активные и завершённые планы.
8. [Roadmap](./roadmap/roadmap.md) - дальнейшие продуктовые задачи.

## Актуальные инварианты

1. `shop_id` не принимается от клиента как источник прав.
2. WebApp выводит shop из Telegram initData, seller/owner binding или явно разрешённого fallback.
3. Fallback доступен только при `ALLOW_WEBAPP_FALLBACK=true`.
4. Fallback требует `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID`.
5. Server проверяет совпадение `DEFAULT_SELLER_ID.shop_id` с `DEFAULT_SHOP_ID`.
6. Browser client не получает `SUPABASE_SERVICE_ROLE_KEY`.
7. Business reads и mutations в WebApp выполняются server-side.
8. Route handlers и Server Actions повторно проверяют доступ.
9. UI не является security boundary.
10. Auth/DB ошибка не маскируется пустым отчётом.
11. Diagnostics не логируют raw initData, bot token, service role key, STT/LLM keys.
12. `/debug-telegram` в production доступен только при `DEBUG_TELEGRAM_WEBAPP=true`.

## Voice pipeline

1. `/start` ставит Telegram WebApp menu/reply/inline entry points для отчёта.
2. Voice handler сначала резолвит seller по Telegram user id.
3. Неактивный seller не может сохранять продажи.
4. В demo mode отсутствующий seller может быть создан в default shop.
5. Audio upload в Supabase Storage работает best-effort и не блокирует продажу.
6. STT failure сохраняется как диагностируемый `failed`, если sale ещё не persisted.
7. LLM cleanup failure не должен терять запись.
8. Invalid LLM JSON переводит запись в review через deterministic fallback.
9. Полная уверенная позиция получает `processed`.
10. Неполная, низкоуверенная или странная позиция получает `needs_review`.
11. Legacy `needs_price` поддерживается в чтении, но новые неполные items используют `needs_review`.
12. `save_voice_sale` должен создать хотя бы одну item row.
13. False success после неудачной записи в Supabase запрещён.

## Telegram review

1. Review-message содержит только `✅ Подтвердить` и `❌ Отмена`.
2. В review-message нет кнопки `Открыть отчёт`.
3. `Открыть отчёт` разрешён в `/start`, reply keyboard и menu button.
4. Новые callback data: `confirm:<sale_id>` и `cancel:<sale_id>`.
5. Legacy `voice_sale_review:<action>:<sale_id>` принимается только для старых сообщений.
6. Webhook должен быть установлен с `allowed_updates: ["message", "callback_query"]`.
7. Webhook route проверяет `x-telegram-bot-api-secret-token` constant-time сравнением.
8. Confirm идемпотентен.
9. Cancel идемпотентен.
10. Confirm запрещён, если нет ни одной полной позиции.
11. Confirm mixed-cart подтверждает валидные active items.
12. Неполные active items остаются `needs_review`.
13. Cancel переводит sale/voice в `cancelled`.
14. Cancel soft-delete все active items этой sale.

## Revenue rules

1. Revenue считается по active `sale_items`.
2. Item входит в выручку только при `status = processed`.
3. Parent sale не должен быть `cancelled`.
4. Parent sale не должен быть `failed`.
5. `deleted_at` должен быть `null`.
6. `total` должен быть валидным положительным числом.
7. Количество или вес должны быть валидными.
8. Unit price может быть сохранён в `price`.
9. Unit price может быть выведен из `total / quantity`.
10. Parent `needs_review` не блокирует уже processed sibling item.
11. Неполные sibling items остаются в `Проверке`.
12. `needs_review`, `needs_price`, `failed`, `excluded` не входят в выручку.
13. Soft-deleted rows не входят в active report.
14. Сброс дня soft-delete active items, но не удаляет sales.
15. Restore возвращает предыдущий item status и пересчитывает parent sale.

## WebApp screens

1. `/daily-report` показывает сводку магазина.
2. `/review` показывает active review items.
3. `/records` показывает журнал voice-sale записей.
4. `/sellers` показывает продавцов и статистику за период.
5. `/` ведёт к отчёту.
6. Нижняя навигация содержит `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
7. DateFilter поддерживает сегодня, вчера, неделю, месяц и custom дату.
8. Report показывает выручку, количество товаров, записи и review count.
9. Report показывает топ товаров, динамику по дням и последние продажи.
10. Review показывает отдельные карточки позиций, а не одну большую запись.
11. Records раскрывает товары и может показать signed audio URL.
12. Sellers считает recordsCount и revenue по выбранному периоду.

## Sale item management

1. Карточка товара компактная.
2. Edit открывается только по icon button с карандашом.
3. Delete открывается только по icon button с корзиной.
4. Edit форма содержит товар, количество, единицу и цену.
5. Единицы в UI: `шт`, `кг`, `г`.
6. Для `г` total считается как доля килограмма от цены за кг.
7. Валидный edit ставит item `processed`.
8. Валидный edit ставит `confidence = 1`.
9. Валидный edit пересчитывает `sale_items.total`.
10. Валидный edit пересчитывает `sales.total_amount`.
11. Валидный edit может добавить item в revenue даже если parent sale остаётся `needs_review`.
12. Delete выполняет только soft delete.
13. Delete сохраняет `deleted_previous_status`.
14. Restore очищает `deleted_at`, `deleted_reason`, `deleted_previous_status`.
15. Audit log failure не должен ломать пользовательскую мутацию.

## Quality gate

Перед заявлением о готовности должны быть запущены:

1. `npm.cmd run lint`.
2. `npm.cmd run test`.
3. `npm.cmd run build`.
4. `npm.cmd run web:build`.
5. При production release - реальный Telegram smoke через кнопку бота.
6. При webhook изменениях - `npm.cmd run telegram:webhook-info`.
7. При Supabase изменениях - миграции должны быть применены до кода.
8. При WebApp auth изменениях - проверить fallback и Telegram initData paths.
9. При revenue изменениях - проверить processed/review/cancelled/deleted cases.
10. При parser изменениях - проверить multi-item split и incomplete fallback.

## Что считать устаревшей документацией

1. Документ обещает UI, которого нет в коде.
2. Документ описывает старые callback data как основной формат.
3. Документ говорит, что parent `needs_review` полностью блокирует processed items.
4. Документ говорит, что review item после валидного edit ждёт confirm для попадания в revenue.
5. Документ говорит, что client может передать доверенный `shop_id`.
6. Документ описывает физическое удаление sale items вместо soft delete.
7. Документ допускает service role key в client bundle.
8. Документ маскирует auth/DB errors как empty state.
9. Документ не упоминает `cancelled` для отменённых voice sales.
10. Документ не упоминает `allowed_updates` с `callback_query` для production webhook.

## Обновление документации

1. После изменения voice pipeline обновлять `README.md`, `AGENTS.md`, `seller-voice-flow`, `telegram-webhook`, `testing-strategy`.
2. После изменения Telegram confirm/cancel обновлять `telegram-confirmation-flow`, `telegram-webhook`, `status-lifecycle`.
3. После изменения WebApp UI обновлять `webapp-report`, `sale-item-editing`, feature docs и acceptance matrix.
4. После изменения WebApp auth обновлять `telegram-webapp-session`, `auth-and-shop-isolation`, `roles-and-access`.
5. После изменения БД обновлять `database`, `database-schema`, `data-model`, migrations и changelog.
6. После изменения revenue logic обновлять `report-calculation`, `database`, `webapp-report`, `features/sales-report`.
7. После изменения deploy/webhook обновлять `deployment-vercel`, `deployment rules`, README deploy и scripts notes.
8. Исторические completed plans можно не переписывать, если они явно остаются историей.
9. Новые superseded детали фиксировать в changelog или актуальных specs.
10. Документы должны описывать реальную систему, а не желаемую.
