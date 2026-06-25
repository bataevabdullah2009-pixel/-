# Документация «Голосового журнала продаж»

Voice Sales Log — MVP для малого бизнеса: Telegram voice превращается в структурированные продажи, Supabase хранит данные, а Web App показывает отчёт, записи, продавцов и корректировку товаров.

## Карта

- [Обзор](./overview/README.md)
- [Продукт](./overview/product.md)
- [Архитектура](./architecture/architecture.md)
- [Глобальная спецификация](./specs/global.md)
- [Технические спецификации](./specs/README.md)
- [WebApp report](./specs/product/webapp-report.md)
- [Sale item editing](./specs/product/sale-item-editing.md)
- [WebApp API](./specs/technical/webapp-api.md)
- [Database](./specs/technical/database.md)
- [Telegram WebApp session](./specs/technical/telegram-webapp-session.md)
- [Функции](./features/README.md)
- [Реализовано](./features/implemented.md)
- [Запланировано](./features/planned.md)
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
- Карточки товаров редактируются inline и обновляют отчёт без ручного reload.
- После изменения кода документация, планы и changelog обновляются в том же коммите.
