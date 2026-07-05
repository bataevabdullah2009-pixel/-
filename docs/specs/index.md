# Спецификации

Эта папка содержит спецификации проекта. Главный системный документ - [00-global.md](./00-global.md).

Все spec-файлы лежат в одном уровне `docs/specs/` и имеют числовой префикс. `index.md` остаётся навигатором и не считается spec-файлом.

## Главный документ

1. [Глобальная спецификация](./00-global.md) - назначение проекта, роли, owner/fallback-доступ, серверные границы, голосовой сценарий, поток Telegram-бота, поток WebApp, статусы, проверка, подтверждение, отмена, аналитика, ошибки, release gate, объём MVP, что не входит, критерии приёмки и тестовые сценарии.

## Продуктовые спеки

1. [Панель владельца](./10-product-owner-dashboard.md).
2. [Роли и доступ](./11-product-roles-and-access.md).
3. [Голосовой сценарий продавца](./12-product-seller-voice-flow.md).
4. [Сценарий подтверждения Telegram](./13-product-telegram-confirmation-flow.md).
5. [Редактирование позиции продажи](./14-product-sale-item-editing.md).
6. [Отчёт WebApp](./15-product-webapp-report.md).
7. [Готовность к production](./16-product-production-readiness.md).

## Технические спеки

1. [API](./20-technical-api.md).
2. [API WebApp](./21-technical-webapp-api.md).
3. [Telegram webhook](./22-technical-telegram-webhook.md).
4. [Сессия Telegram WebApp](./23-technical-telegram-webapp-session.md).
5. [Авторизация и изоляция магазина](./24-technical-auth-and-shop-isolation.md).
6. [База данных](./25-technical-database.md).
7. [Схема базы данных](./26-technical-database-schema.md).
8. [Расчёт отчёта](./27-technical-report-calculation.md).
9. [Обработка ошибок](./28-technical-error-handling.md).
10. [Развертывание Vercel](./29-technical-deployment-vercel.md).
11. [Стратегия тестирования](./30-technical-testing-strategy.md).
12. [Техническая архитектура](./31-technical-architecture.md) - не дублирует архитектуру, а ведёт к [каноническому документу](../architecture/architecture.md).

## Спеки данных

1. [Модель данных](./40-data-model.md).
2. [Жизненный цикл статусов](./41-data-status-lifecycle.md).
3. [Мягкое удаление](./42-data-soft-delete.md).

## Правило актуальности

Если отдельный spec повторяет системное правило статусов, проверки, подтверждения, отмены или выручки, каноническим источником остаётся [00-global.md](./00-global.md). Профильные specs должны ссылаться на него или уточнять детали своей области.
