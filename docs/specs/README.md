# Спецификации

Канонические спецификации описывают текущее состояние MVP:

- [global](./global.md)
- [technical](./technical/architecture.md)
- [product](./product/seller-voice-flow.md)
- [data](./data/data-model.md)

Главные правила: Telegram и fallback auth поддерживаются явно, `shop_id` не принимается от клиента, уверенные voice-продажи сразу входят в отчёт, спорные позиции уходят в «Нужно проверить».
