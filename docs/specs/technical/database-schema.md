# Схема БД

## Общая модель

Магазин владеет продавцами, товарами, записями и продажами. Одна голосовая запись логически создаёт одну продажу, а продажа содержит несколько позиций. БД пока не закрепляет уникальность `sales.voice_record_id`. Аудио находится в приватном Storage bucket, БД хранит путь.

## Таблица `shops`

- Поля: `id uuid PK`, `name text`, `created_at timestamptz`.
- Имя уникально без учёта регистра.
- Магазин по умолчанию создаётся сервисом по `DEFAULT_SHOP_NAME`.

## Таблица `sellers`

- Поля: `id`, `shop_id`, `telegram_id bigint unique`, `name`, `is_active`, `created_at`.
- Продавец автоматически регистрируется по Telegram sender.
- Глобальная уникальность `telegram_id` ограничивает продавца одним магазином в текущей модели.

## Таблица `products`

- Поля: `id`, `shop_id`, `name`, `default_price`, `unit`, `is_active`, `created_at`.
- Цена неотрицательна; имя уникально внутри магазина без учёта регистра.
- Цена используется как необязательная подстановка. Таблица не является учётом остатков.

## Таблица `voice_records`

- Поля: `id`, `shop_id`, `seller_id`, `telegram_message_id`, `audio_path`, `audio_url`, `raw_text`, `cleaned_text`, `parser_json`, `status`, `error_message`, `created_at`.
- Статусы: `pending`, `processed`, `needs_review`, `failed`.
- Исходный след не переписывается при ручной правке позиции.
- Уникального индекса по продавцу и `telegram_message_id` нет, поэтому повтор Telegram может создать дубликат.

## Таблица `sales`

- Поля: `id`, `shop_id`, необязательные `seller_id` и `voice_record_id`, `raw_text`, `cleaned_text`, `total_amount`, `status`, `created_at`.
- `total_amount` — производный кэш активных обработанных позиций.
- После мутации пересчитываются сумма и статус.
- Сброс дня не удаляет строку продажи.

## Таблица `sale_items`

- Поля: `id`, `sale_id`, необязательный `product_id`, `product_name`, `quantity`, `unit`, необязательные `price` и `total`, `confidence`, `status`, `created_at`, `updated_at`.
- Миграции мягкого удаления добавляют `deleted_at`, `deleted_reason` (`excluded_by_owner`, `day_reset`; `manual` разрешён только для прежних строк) и `deleted_previous_status`.
- Ограничения: `quantity > 0`, цена и итог неотрицательны, уверенность от 0 до 1, статус из допустимого списка.
- Статусы позиции: `processed`, `needs_price`, `needs_review`, `failed`, `excluded`.
- Правка меняет итоговую позицию и пишет состояние до и после в аудит.
- Ручная правка требует `quantity > 0` и `price > 0`, пересчитывает итог, ставит `processed`, `confidence = 1` и обновляет `updated_at`.
- Исключённая владельцем позиция остаётся в Postgres, получает `status = excluded` и доступна для восстановления.
- Частичный индекс `idx_sale_items_active (created_at, status) where deleted_at is null` ускоряет чтение активных позиций.

## Таблица `audit_logs`

- Поля: `id`, необязательные `shop_id` и `seller_id`, `action`, `details jsonb`, `created_at`.
- События обработки: `stt_raw_text_received`, `llm_parser_json_received`, `sale_items_created`, `sale.processed`, `voice.failed`.
- События владельца: `sale_item_updated`, `sale_item_deleted`, `sale_item_restored`, `daily_revenue_reset`.
- Аудит не является резервной копией и пока не хранит владельца-исполнителя.

## Безопасность и порядок развёртывания

RLS включён. Начальная миграция даёт `anon` чтение основных таблиц для демонстрации и service role — серверную запись. До реальных данных анонимные политики заменяются политиками владельца и магазина.

Миграции мягкого удаления и согласования update/exclude применяются до развёртывания зависимых чтений и мутаций. Запись нескольких таблиц и мутации сейчас не транзакционны; это обязательный технический долг.
