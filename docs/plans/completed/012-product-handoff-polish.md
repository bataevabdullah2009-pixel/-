# 012 - Product handoff polish

Дата: 2026-07-02

## Цель

Довести Telegram bot + WebApp `Голосовой журнал продаж` до аккуратного продуктового состояния перед сдачей: Telegram review decision через две кнопки, корректная выручка, чистый mobile UX, актуальная документация.

## Изменено

### Telegram

- Review keyboard теперь содержит только:
  - `✅ Подтвердить`;
  - `❌ Отмена`.
- `Открыть отчёт` удалён из сообщения сомнительной записи.
- `/start`, reply keyboard и menu button сохраняют доступ к отчёту.
- Callback data остаются `confirm:<sale_id>` и `cancel:<sale_id>`.
- Legacy prefix `voice_sale_review:` остаётся для уже отправленных старых сообщений.

### WebApp

- Нижняя навигация на момент 012: `Отчёт`, `Записи`, `Продавцы`.
- Примечание 2026-07-02: этот пункт superseded планом 013; текущее состояние имеет `Отчёт`, `Проверка`, `Записи`, `Продавцы`, а `/review` является рабочим экраном.
- Report title: `Голосовой журнал продаж`.
- Report subtitle: `Сводка магазина`.
- Review items на момент 012 показывались без WebApp confirm/cancel controls.
- Примечание 2026-07-02: актуальный WebApp подтверждает/отменяет review на вкладке `Проверка`.
- Delete wording в карточке товара приведён к `Удалить товар из отчёта?`.
- Date filters уплотнены.

### Data

- Superseded 2026-07-03: current report scope counts active `processed` items inside parent sale `needs_review`; only incomplete sibling items stay in review.
- Revenue status predicate принимает только `processed`.
- Recalculate после delete не переводит processed sale в review, если все active items удалены.
- Cancelled/failed sale получают zero revenue при recalculation.

### Tests

- Обновлён keyboard regression.
- Superseded 2026-07-03: test expectation changed to count processed item inside needs_review sale while keeping incomplete item in review.
- Пройден `npm.cmd run test`: 8 files, 93 tests.

## Backlog

- Production smoke с реальным Telegram bot.
- Проверка deployed logs после release.
- Ручная проверка audio playback.
- Возможный отдельный audit screen для restore soft-deleted items.

## Риски

- Реальный Telegram callback flow требует smoke после deploy, потому что локальные тесты покрывают service и keyboard contract, но не Telegram API editMessage delivery.
- Supabase production schema должна иметь migrations с `deleted_at`, `deleted_reason`, `deleted_previous_status`.
