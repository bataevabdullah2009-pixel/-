# Спеки

Эта папка описывает фактический продукт и кодовую базу `Голосовой журнал продаж`.

## Продуктовые спеки

- [Отчёт WebApp](./product/webapp-report.md) - мобильный интерфейс, отчёт, проверка, записи, продавцы.
- [Сценарий подтверждения Telegram](./product/telegram-confirmation-flow.md) - `processed`, `needs_review`, `cancelled`, кнопки callback.
- [Редактирование позиции продажи](./product/sale-item-editing.md) - компактное редактирование, удаление, сохранение в Supabase, пересчёт.
- [Голосовой сценарий продавца](./product/seller-voice-flow.md) - голосовой сценарий продавца.
- [Роли и доступ](./product/roles-and-access.md) - роли и доступ.
- [Готовность к production](./product/production-readiness.md) - критерии handoff.

## Технические спеки

- [База данных](./technical/database.md) - таблицы, статусы, мягкое удаление, правила выручки.
- [Telegram webhook](./technical/telegram-webhook.md) - маршрут webhook, обработчики бота, callbacks.
- [Сессия Telegram WebApp](./technical/telegram-webapp-session.md) - initData, session cookie, owner/seller resolver.
- [API WebApp](./technical/webapp-api.md) - server components/actions.
- [Стратегия тестирования](./technical/testing-strategy.md) - обязательные проверки.
- [Развертывание Vercel](./technical/deployment-vercel.md) - заметки развертывания.

## Главные правила

- Raw Telegram initData проверяется через токен бота.
- Fallback auth включается только явно.
- `shop_id` не принимается от клиента как источник прав.
- Отчёт читает `sale_items` только через продажи текущего магазина.
- Уверенные голосовые продажи сразу входят в отчёт.
- Сомнительные голосовые записи решаются через Telegram `✅ Подтвердить` / `❌ Отмена` или WebApp `/review`.
- Действия проверки WebApp выполняются только через серверные действия и серверный контекст магазина.
- В сообщении проверки нет кнопки `Открыть отчёт`.
- Выручка считается из активной позиции `processed`, если родительская продажа не `cancelled` и не `failed`.
