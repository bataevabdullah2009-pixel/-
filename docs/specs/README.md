# Specs

Эта папка описывает фактический продукт и кодовую базу `Голосовой журнал продаж`.

## Product specs

- [WebApp report](./product/webapp-report.md) - мобильный интерфейс, отчёт, проверка, записи, продавцы.
- [Telegram confirmation flow](./product/telegram-confirmation-flow.md) - `processed`, `needs_review`, `cancelled`, callback buttons.
- [Sale item editing](./product/sale-item-editing.md) - compact edit, delete, Supabase persistence, recalculation.
- [Seller voice flow](./product/seller-voice-flow.md) - voice сценарий продавца.
- [Roles and access](./product/roles-and-access.md) - роли и доступ.
- [Production readiness](./product/production-readiness.md) - handoff критерии.

## Technical specs

- [Database](./technical/database.md) - таблицы, статусы, soft delete, revenue rules.
- [Telegram webhook](./technical/telegram-webhook.md) - webhook route, bot handlers, callbacks.
- [Telegram WebApp session](./technical/telegram-webapp-session.md) - initData, session cookie, owner/seller resolver.
- [WebApp API](./technical/webapp-api.md) - server components/actions.
- [Testing strategy](./technical/testing-strategy.md) - обязательные проверки.
- [Deployment Vercel](./technical/deployment-vercel.md) - deployment notes.

## Главные правила

- Raw Telegram initData проверяется через bot token.
- Fallback auth включается только явно.
- `shop_id` не принимается от клиента как источник прав.
- Report читает sale_items только через sales текущего shop.
- Уверенные voice-продажи сразу входят в отчёт.
- Сомнительные voice-записи решаются Telegram `✅ Подтвердить` / `❌ Отмена` или WebApp `/review`.
- WebApp review actions выполняются только через server actions и server-derived shop context.
- В review-message нет кнопки `Открыть отчёт`.
- Выручка считается только из parent sale `processed` и active item `processed`.
