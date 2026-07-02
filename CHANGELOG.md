# CHANGELOG

## 2026-07-02 - Product handoff polish

### Telegram

- Review voice-message теперь содержит только две inline-кнопки: `✅ Подтвердить` и `❌ Отмена`.
- Кнопка `Открыть отчёт` удалена из сообщения сомнительной записи.
- `/start`, reply keyboard и menu button сохраняют доступ к WebApp отчёту.
- Callback data остаются короткими: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Legacy callback prefix `voice_sale_review:` остаётся совместимым для старых сообщений.
- Confirm/cancel callbacks остаются идемпотентными.

### WebApp

- Нижняя навигация приведена к трём разделам: `Отчёт`, `Записи`, `Продавцы`.
- Пользовательский `/review` больше не является экраном подтверждения; старый route перенаправляет на `/records`.
- Экран отчёта получил продуктовый заголовок `Голосовой журнал продаж` и подзаголовок `Сводка магазина`.
- Review-состояние в WebApp показывается как `Нужно подтвердить в Telegram`.
- Карточки товаров оставлены компактными: обычный режим + `✏️` edit + `🗑` delete.
- Delete wording изменён на `Удалить товар из отчёта?`, `Удалить`, `Отмена`.
- Фильтры периода уплотнены для мобильного интерфейса.
- Telegram diagnostics остаются только на `/debug-telegram` в development или при `DEBUG_TELEGRAM_WEBAPP=true`.

### Data and revenue

- Report scope больше не считает processed-looking items из parent sale со статусом `needs_review`.
- Revenue status predicate приведён к каноническому `processed`.
- Пересчёт продажи после update/delete больше не переводит processed sale в `needs_review`, если все active items удалены.
- `cancelled` и `failed` sale не получают выручку при пересчёте.

### Tests

- Обновлён regression test Telegram review keyboard: ровно две кнопки.
- Добавлен regression test, что `needs_review` sale не входит в выручку даже при валидных item fields.
- Локально пройден `npm.cmd run test`: 8 test files, 93 tests.

### Docs

- Обновлены README, AGENTS, overview, specs, features, plans, roadmap, architecture, rules и локальный Codex skill.
- Удалены актуальные противоречия про WebApp review-confirm и третью Telegram-кнопку в review-message.

## 2026-06-30 - Release stabilization, superseded details

- Ветка стабилизации добавляла короткие callback data, WebApp review screen и расширенные проверки update/delete.
- Текущий контракт от 2026-07-02 supersedes пользовательский `/review` screen и третью кнопку `Открыть отчёт` в review-message.
- Актуальные правила см. в `README.md`, `AGENTS.md` и `docs/specs`.

## 2026-06-25 - WebApp persistence hardening

- Укреплены update/delete server actions для sale items.
- Добавлен soft delete через `deleted_at`.
- Report начал отделять active и deleted items.
- Добавлены regression tests для report totals after update/delete.

## 2026-06-20 - Sales flow stabilization

- Уверенные voice-записи сохраняются как `processed`.
- Неполные или низкоуверенные распознавания сохраняются как `needs_review`.
- Добавлены audit logs для ключевых этапов обработки.
- Сохранение voice sale стало проверять read-back identifiers.

## 2026-06-18 - Soft delete foundation

- Добавлены `sale_items.deleted_at`, `deleted_reason`, `deleted_previous_status`.
- Исключённые товары перестали попадать в active report.
- Restore сохраняет previous status.

## 2026-06-17 - Parser diagnostics

- Добавлены parser JSON diagnostics.
- STT/LLM fallback переводит запись в review вместо тихого failure, если продажу можно сохранить для проверки.

## 2026-06-16 - Initial product baseline

- Создан Telegram bot voice pipeline.
- Созданы Supabase таблицы `shops`, `sellers`, `voice_records`, `sales`, `sale_items`, `products`, `audit_logs`.
- Добавлен Next.js WebApp с отчётом и журналом записей.
