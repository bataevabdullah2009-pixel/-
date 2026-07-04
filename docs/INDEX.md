# Документация проекта

Главный вход в документацию `Голосового журнала продаж`.

## Где что лежит

1. `docs/specs/global.md` - главный системный документ проекта.
2. `docs/architecture/architecture.md` - каноническая архитектура.
3. `docs/specs/` - продуктовые, технические и data-спецификации.
4. `docs/features/` - реализованные и планируемые функции.
5. `docs/rules/` - краткие правила разработки, данных, безопасности и развертывания.
6. `docs/plans/` - активные и завершённые планы.
7. `docs/roadmap/` - дорожная карта.
8. `docs/overview/` - короткий обзор продукта со ссылками на канонические документы.

Если краткое описание повторяет смысл из глобальной спецификации, каноническим источником остаётся [docs/specs/global.md](./specs/global.md).

## Основные документы

1. [README](../README.md) - краткое описание проекта, запуск и команды.
2. [AGENTS](../AGENTS.md) - правила работы для агентов и разработчиков.
3. [CHANGELOG](../CHANGELOG.md) - журнал изменений.
4. [Глобальная спецификация](./specs/global.md) - назначение, роли, сценарии, статусы, проверка, подтверждение, отмена, аналитика и приёмка.
5. [Архитектура](./architecture/architecture.md) - устройство бота, WebApp, Supabase и границ безопасности.

## Спецификации

Общий вход: [docs/specs/index.md](./specs/index.md).

### Продуктовые

1. [Панель владельца](./specs/product/owner-dashboard.md).
2. [Роли и доступ](./specs/product/roles-and-access.md).
3. [Голосовой сценарий продавца](./specs/product/seller-voice-flow.md).
4. [Сценарий подтверждения Telegram](./specs/product/telegram-confirmation-flow.md).
5. [Редактирование позиции продажи](./specs/product/sale-item-editing.md).
6. [Отчёт WebApp](./specs/product/webapp-report.md).
7. [Готовность к production](./specs/product/production-readiness.md).

### Технические

1. [API](./specs/technical/api-spec.md).
2. [Авторизация и изоляция магазина](./specs/technical/auth-and-shop-isolation.md).
3. [База данных](./specs/technical/database.md).
4. [Схема базы данных](./specs/technical/database-schema.md).
5. [Развертывание Vercel](./specs/technical/deployment-vercel.md).
6. [Обработка ошибок](./specs/technical/error-handling.md).
7. [Расчёт отчёта](./specs/technical/report-calculation.md).
8. [Telegram webhook](./specs/technical/telegram-webhook.md).
9. [Сессия Telegram WebApp](./specs/technical/telegram-webapp-session.md).
10. [Стратегия тестирования](./specs/technical/testing-strategy.md).
11. [API WebApp](./specs/technical/webapp-api.md).
12. [Техническая архитектура](./specs/technical/architecture.md) - короткая ссылка на каноническую архитектуру.

### Данные

1. [Модель данных](./specs/data/data-model.md).
2. [Мягкое удаление](./specs/data/soft-delete.md).
3. [Жизненный цикл статусов](./specs/data/status-lifecycle.md).

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

1. Новые системные правила добавлять сначала в [глобальную спецификацию](./specs/global.md).
2. Архитектурные изменения фиксировать в [архитектуре](./architecture/architecture.md).
3. Feature-изменения фиксировать в `docs/features/`.
4. Исторические планы можно не переписывать, если они явно остаются историей.
5. Документация ведётся на русском языке.
