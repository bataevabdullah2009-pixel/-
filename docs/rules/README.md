# Rules

Короткие правила разработки проекта.

## Voice pipeline

- Не переписывать STT/parser/webhook без прямой задачи.
- Не терять voice record при recoverable parser failure.
- Parser fallback обязан разделять glued multi-item transcript на отдельные rows.
- Уверенная запись остаётся `processed`.
- Сомнительная запись остаётся `needs_review` до Telegram или WebApp review decision.

## Telegram

- Review-message содержит только `✅ Подтвердить` и `❌ Отмена`.
- Не добавлять `Открыть отчёт` в review-message.
- Callback data: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Callback должен быть идемпотентным.
- Confirm подтверждает валидные active items и не блокирует mixed cart из-за неполных items.
- Webhook должен принимать `message` и `callback_query`.

## WebApp

- Навигация: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- `/review` показывает только active `needs_review` и подтверждает/отменяет через server actions.
- `needs_review` показывать как review state без смешивания с выручкой.
- Карточка товара компактная: display mode, `✏️`, `🗑`.

## Data

- Revenue только из parent sale `processed` и active item `processed`.
- Revenue требует валидный `total`; unit price может быть сохранён или вычислен из total.
- Processed-looking item внутри parent `needs_review` sale не входит в revenue.
- Soft delete только через `deleted_at`.
- `shop_id` не брать от клиента как источник прав.

## Docs and checks

- После каждого изменения кода агент обязан обновлять документацию, changelog, активные планы и технические спецификации так, чтобы они соответствовали фактическому состоянию проекта. Запрещено оставлять документацию, противоречащую текущему коду.
- После БД обновлять migrations и database spec.
- После UI обновлять product specs.
- После Telegram flow обновлять telegram specs.
- После работы запускать lint/test/build.
