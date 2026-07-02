# Rules

Короткие правила разработки проекта.

## Voice pipeline

- Не переписывать STT/parser/webhook без прямой задачи.
- Не терять voice record при recoverable parser failure.
- Уверенная запись остаётся `processed`.
- Сомнительная запись остаётся `needs_review` до Telegram или WebApp review decision.

## Telegram

- Review-message содержит только `✅ Подтвердить` и `❌ Отмена`.
- Не добавлять `Открыть отчёт` в review-message.
- Callback data: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Callback должен быть идемпотентным.
- Webhook должен принимать `message` и `callback_query`.

## WebApp

- Навигация: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- `/review` показывает только active `needs_review` и подтверждает/отменяет через server actions.
- `needs_review` показывать как review state без смешивания с выручкой.
- Карточка товара компактная: display mode, `✏️`, `🗑`.

## Data

- Revenue только из parent sale `processed` и active item `processed`.
- Soft delete только через `deleted_at`.
- `shop_id` не брать от клиента как источник прав.

## Docs and checks

- После каждого изменения кода агент обязан обновить документацию, спеки, планы и changelog под фактическое состояние проекта. Запрещено оставлять устаревшие документы, которые противоречат коду.
- После БД обновлять migrations и database spec.
- После UI обновлять product specs.
- После Telegram flow обновлять telegram specs.
- После работы запускать lint/test/build.
