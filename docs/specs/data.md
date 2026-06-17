# Data Spec

## Сущности

| Entity | Table | Назначение |
| --- | --- | --- |
| Shop | `shops` | Магазин. |
| Seller | `sellers` | Продавец из Telegram. |
| Product | `products` | Простая цена по умолчанию. |
| VoiceRecord | `voice_records` | Исходная голосовая запись и текст. |
| Sale | `sales` | Продажа, собранная из одного голосового сообщения. |
| SaleItem | `sale_items` | Позиция продажи. |
| AuditLog | `audit_logs` | Ошибки и важные события. |

## Основные связи

- `sellers.shop_id -> shops.id`
- `products.shop_id -> shops.id`
- `voice_records.shop_id -> shops.id`
- `voice_records.seller_id -> sellers.id`
- `sales.shop_id -> shops.id`
- `sales.seller_id -> sellers.id`
- `sales.voice_record_id -> voice_records.id`
- `sale_items.sale_id -> sales.id`
- `sale_items.product_id -> products.id`
- `audit_logs.shop_id -> shops.id`
- `audit_logs.seller_id -> sellers.id`

## Статусы voice_records и sales

| Status | Значение |
| --- | --- |
| `pending` | Обработка началась, но не завершилась. |
| `processed` | Текст и позиции обработаны нормально. |
| `needs_review` | Нужна ручная проверка. |
| `failed` | Обработка завершилась ошибкой. |

## Статусы sale_items

| Status | Значение |
| --- | --- |
| `processed` | Можно включать в отчёт и выручку. |
| `needs_price` | Товар есть, цены нет. |
| `needs_review` | Низкая уверенность или спорная позиция. |
| `failed` | Позиция не обработалась. |

## Правила хранения

- Все таблицы имеют `created_at`.
- `voice_records` хранит `raw_text`, `cleaned_text`, полный исходный `parser_json`, итоговый `status` и `error_message`.
- `audit_logs.action` фиксирует этапы `stt_raw_text_received`, `llm_parser_json_received` и `sale_items_created`.
- Ошибки пишутся в `audit_logs`.
- API keys, bearer tokens и secrets редактируются перед выводом в application logs.
- Записи не удаляются физически.
- Service role используется только на сервере.
- RLS включён на таблицах `public`.
