# Спецификации

Канонические спецификации описывают текущее состояние MVP:

- [global](./global.md)
- [technical](./technical/architecture.md)
- [product](./product/seller-voice-flow.md)
- [data](./data/data-model.md)

Главные правила: raw Telegram initData проверяется через bot token, fallback auth включается явно, `shop_id` не принимается от клиента, report читает sale_items только через sales текущего shop, уверенные voice-продажи сразу входят в отчёт, спорные voice-записи решаются через Telegram `✅ Подтвердить` / `❌ Отмена`.

Ключевые спецификации WebApp:

- [Отчёт](./product/webapp-report.md)
- [Редактирование товара](./product/sale-item-editing.md)
- [Telegram confirmation flow](./product/telegram-confirmation-flow.md)
- [WebApp API](./technical/webapp-api.md)
- [База данных](./technical/database.md)
- [Telegram WebApp session](./technical/telegram-webapp-session.md)

Статусы и расчёт:

- [Status lifecycle](./data/status-lifecycle.md)
- [Report calculation](./technical/report-calculation.md)
