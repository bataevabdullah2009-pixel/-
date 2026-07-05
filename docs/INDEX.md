# Документация проекта

Главный вход в документацию `Голосового журнала продаж`.

## Где что лежит

1. `docs/specs/00-global.md` - главный системный документ проекта.
2. `docs/architecture/architecture.md` - каноническая архитектура.
3. `docs/specs/` - пронумерованные продуктовые, технические и data-спецификации в одном уровне папки.
4. `docs/features/` - реализованные и планируемые функции.
5. `docs/rules/` - краткие правила разработки, данных, безопасности и развертывания.
6. `docs/plans/` - активные и завершённые планы.
7. `docs/roadmap/` - дорожная карта.
8. `docs/overview/` - короткий обзор продукта со ссылками на канонические документы.

Если краткое описание повторяет смысл из глобальной спецификации, каноническим источником остаётся [docs/specs/00-global.md](./specs/00-global.md).

## Основные документы

1. [README](../README.md) - краткое описание проекта, запуск и команды.
2. [AGENTS](../AGENTS.md) - правила работы для агентов и разработчиков.
3. [CHANGELOG](../CHANGELOG.md) - журнал изменений.
4. [Глобальная спецификация](./specs/00-global.md) - назначение, роли, owner/fallback-доступ, серверные границы, сценарии, статусы, проверка, подтверждение, отмена, аналитика, ошибки, release gate и приёмка.
5. [Архитектура](./architecture/architecture.md) - устройство бота, WebApp, Supabase и границ безопасности.

## Спецификации

Общий вход: [docs/specs/index.md](./specs/index.md).

Spec-файлы имеют числовой префикс: `00` - главный контракт, `10-16` - продукт, `20-31` - техника, `40-42` - данные.

### Продуктовые

1. [Панель владельца](./specs/10-product-owner-dashboard.md).
2. [Роли и доступ](./specs/11-product-roles-and-access.md).
3. [Голосовой сценарий продавца](./specs/12-product-seller-voice-flow.md).
4. [Сценарий подтверждения Telegram](./specs/13-product-telegram-confirmation-flow.md).
5. [Редактирование позиции продажи](./specs/14-product-sale-item-editing.md).
6. [Отчёт WebApp](./specs/15-product-webapp-report.md).
7. [Готовность к production](./specs/16-product-production-readiness.md).

### Технические

1. [API](./specs/20-technical-api.md).
2. [API WebApp](./specs/21-technical-webapp-api.md).
3. [Telegram webhook](./specs/22-technical-telegram-webhook.md).
4. [Сессия Telegram WebApp](./specs/23-technical-telegram-webapp-session.md).
5. [Авторизация и изоляция магазина](./specs/24-technical-auth-and-shop-isolation.md).
6. [База данных](./specs/25-technical-database.md).
7. [Схема базы данных](./specs/26-technical-database-schema.md).
8. [Расчёт отчёта](./specs/27-technical-report-calculation.md).
9. [Обработка ошибок](./specs/28-technical-error-handling.md).
10. [Развертывание Vercel](./specs/29-technical-deployment-vercel.md).
11. [Стратегия тестирования](./specs/30-technical-testing-strategy.md).
12. [Техническая архитектура](./specs/31-technical-architecture.md) - короткая ссылка на каноническую архитектуру.

### Данные

1. [Модель данных](./specs/40-data-model.md).
2. [Жизненный цикл статусов](./specs/41-data-status-lifecycle.md).
3. [Мягкое удаление](./specs/42-data-soft-delete.md).

## Документы функций

Общий вход: [docs/features/index.md](./features/index.md).

1. [Реализованные функции](./features/implemented.md).
2. [Обработка голоса](./features/voice-processing.md).
3. [Отчёт продаж](./features/sales-report.md).
4. [Ручная проверка](./features/manual-review.md).
5. [Журнал записей](./features/records-journal.md).
6. [Продавцы](./features/sellers.md).
7. [Мобильный WebApp](./features/mobile-web-app.md).
8. [Запланировано](./features/planned.md).
9. [Матрица приёмки](./features/acceptance-matrix.md).

## Правила

Общий вход: [docs/rules/index.md](./rules/index.md).

1. [AI и парсер](./rules/ai.md).
2. [Данные](./rules/data.md).
3. [Развертывание](./rules/deployment.md).
4. [Инженерия](./rules/engineering.md).
5. [Безопасность](./rules/security.md).

## Планы и roadmap

1. [Планы](./plans/index.md).
2. [Активные планы](./plans/active/index.md).
3. [Завершённые планы](./plans/completed/index.md).
4. [Дорожная карта](./roadmap/roadmap.md).
5. [Индекс roadmap](./roadmap/index.md).

## Обзор

1. [Обзор продукта](./overview/index.md).
2. [Краткий продуктовый сценарий](./overview/product.md).

## Правила актуальности

1. Новые системные правила добавлять сначала в [глобальную спецификацию](./specs/00-global.md).
2. Архитектурные изменения фиксировать в [архитектуре](./architecture/architecture.md).
3. Feature-изменения фиксировать в `docs/features/`.
4. Исторические планы можно не переписывать, если они явно остаются историей.
5. Документация ведётся на русском языке.

## Что обновлять

1. Голос, parser, callback, webhook: `00-global`, `12-product-seller-voice-flow`, `13-product-telegram-confirmation-flow`, `22-technical-telegram-webhook`, feature-документ и `CHANGELOG.md`.
2. WebApp, отчёт, проверка, записи, продавцы: `00-global`, `10-product-owner-dashboard`, `15-product-webapp-report`, `21-technical-webapp-api`, feature-документ, acceptance matrix и `CHANGELOG.md`.
3. БД, статусы, soft delete, выручка: `00-global`, `25-technical-database`, `26-technical-database-schema`, `27-technical-report-calculation`, `40-data-model`, `41-data-status-lifecycle`, `42-data-soft-delete`, migrations и `CHANGELOG.md`.
4. Auth, owner, fallback, изоляция магазина: `00-global`, `11-product-roles-and-access`, `23-technical-telegram-webapp-session`, `24-technical-auth-and-shop-isolation`, security rules и `CHANGELOG.md`.
5. Deploy, env, release gate: `00-global`, `16-product-production-readiness`, `29-technical-deployment-vercel`, deployment rules, README и `CHANGELOG.md`.
