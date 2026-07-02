# Rules

Короткие правила разработки проекта.

## Voice pipeline

- Не переписывать STT/parser/webhook без прямой задачи.
- Не терять voice record при recoverable parser failure.
- Уверенная запись остаётся `processed`.
- Сомнительная запись остаётся `needs_review` до Telegram decision.

## Telegram

- Review-message содержит только `✅ Подтвердить` и `❌ Отмена`.
- Не добавлять `Открыть отчёт` в review-message.
- Callback data: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Callback должен быть идемпотентным.

## WebApp

- Навигация: `Отчёт`, `Записи`, `Продавцы`.
- WebApp не подтверждает review voice-записи.
- `needs_review` показывать как `Нужно подтвердить в Telegram`.
- Карточка товара компактная: display mode, `✏️`, `🗑`.

## Data

- Revenue только из parent sale `processed` и active item `processed`.
- Soft delete только через `deleted_at`.
- `shop_id` не брать от клиента как источник прав.

## Docs and checks

- После кода обновлять docs.
- После БД обновлять migrations и database spec.
- После UI обновлять product specs.
- После Telegram flow обновлять telegram specs.
- После работы запускать lint/test/build.
