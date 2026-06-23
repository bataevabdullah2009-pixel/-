# Спецификации

Канонические спецификации описывают текущее состояние MVP:

- [global](./global.md)
- [technical](./technical/architecture.md)
- [product](./product/seller-voice-flow.md)
- [data](./data/data-model.md)

Главные правила: raw Telegram initData проверяется через bot token, fallback auth включается явно, `shop_id` не принимается от клиента, report читает sale_items только через sales seller shop, уверенные voice-продажи сразу входят в отчёт, спорные позиции уходят в «Нужно проверить».
