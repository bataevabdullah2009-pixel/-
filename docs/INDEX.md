# Документация Voice Sales Log

Voice Sales Log — MVP для малого бизнеса: Telegram voice превращается в структурированные продажи, Supabase хранит данные, а Web App показывает отчёт, записи, продавцов и корректировку товаров.

## Карта

- [Обзор](./overview/README.md)
- [Продукт](./overview/product.md)
- [Архитектура](./architecture/architecture.md)
- [Глобальная спецификация](./specs/global.md)
- [Технические спецификации](./specs/README.md)
- [Функции](./features/README.md)
- [Правила](./rules/README.md)
- [Планы](./plans/README.md)
- [Roadmap](./roadmap/roadmap.md)
- [Changelog](../CHANGELOG.md)

## Актуальные инварианты

- Web App валидирует raw Telegram initData и работает в browser fallback mode только при явной server-side конфигурации.
- Report/records используют server-derived seller shop и не маскируют auth/DB ошибки пустыми данными.
- `shop_id` не принимается от клиента.
- Уверенные voice-позиции сразу входят в отчёт.
- Bot success возможен только после подтверждённой записи sale и sale_items.
- Спорные позиции идут в «Нужно проверить».
- Исключение товара выполняется через soft delete.
- После изменения кода документация, планы и changelog обновляются в том же коммите.
