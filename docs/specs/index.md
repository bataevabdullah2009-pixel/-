# Спецификации

Эта папка содержит спецификации проекта. Главный системный документ - [global.md](./global.md).

## Главный документ

1. [Глобальная спецификация](./global.md) - назначение проекта, роли, голосовой сценарий, поток Telegram-бота, поток WebApp, статусы, проверка, подтверждение, отмена, аналитика, объём MVP, что не входит, критерии приёмки и тестовые сценарии.

## Продуктовые спеки

1. [Панель владельца](./product/owner-dashboard.md).
2. [Роли и доступ](./product/roles-and-access.md).
3. [Голосовой сценарий продавца](./product/seller-voice-flow.md).
4. [Сценарий подтверждения Telegram](./product/telegram-confirmation-flow.md).
5. [Редактирование позиции продажи](./product/sale-item-editing.md).
6. [Отчёт WebApp](./product/webapp-report.md).
7. [Готовность к production](./product/production-readiness.md).

## Технические спеки

1. [API](./technical/api-spec.md).
2. [Авторизация и изоляция магазина](./technical/auth-and-shop-isolation.md).
3. [База данных](./technical/database.md).
4. [Схема базы данных](./technical/database-schema.md).
5. [Развертывание Vercel](./technical/deployment-vercel.md).
6. [Обработка ошибок](./technical/error-handling.md).
7. [Расчёт отчёта](./technical/report-calculation.md).
8. [Telegram webhook](./technical/telegram-webhook.md).
9. [Сессия Telegram WebApp](./technical/telegram-webapp-session.md).
10. [Стратегия тестирования](./technical/testing-strategy.md).
11. [API WebApp](./technical/webapp-api.md).
12. [Техническая архитектура](./technical/architecture.md) - не дублирует архитектуру, а ведёт к [каноническому документу](../architecture/architecture.md).

## Спеки данных

1. [Модель данных](./data/data-model.md).
2. [Мягкое удаление](./data/soft-delete.md).
3. [Жизненный цикл статусов](./data/status-lifecycle.md).

## Правило актуальности

Если отдельный spec повторяет системное правило статусов, проверки, подтверждения, отмены или выручки, каноническим источником остаётся [global.md](./global.md). Профильные specs должны ссылаться на него или уточнять детали своей области.
