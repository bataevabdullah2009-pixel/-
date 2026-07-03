# Реализованные функции

## Telegram bot

- `/start` проверяет продавца и даёт WebApp доступ к отчёту.
- Voice messages проходят download, audio prepare, STT, parser, Supabase persistence.
- Deterministic fallback разделяет glued multi-item transcript на отдельные `sale_items` и сохраняет неполные остатки отдельными review rows.
- Уверенные продажи сохраняются как `processed`.
- Сомнительные продажи сохраняются как `needs_review`.
- Review-message содержит только `✅ Подтвердить` и `❌ Отмена`.
- Callback data короткие: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Legacy callback prefix принимается для старых сообщений.
- Confirm callback переводит sale/voice и валидные active items в `processed`; неполные active items mixed-корзины остаются `needs_review`.
- Cancel callback переводит sale/voice в `cancelled` и soft-delete active items.
- Failed voice сохраняет `voice_records.status = failed`, если sale ещё не persisted.

## WebApp

- Нижняя навигация: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- `Отчёт` показывает выручку, количество товаров, количество записей и review count.
- Период фильтруется по сегодня, вчера, неделя, месяц и выбранная дата.
- `Топ товаров` строится по active processed revenue.
- `Продажи за период` показывает active processed item cards.
- `Проверка` показывает active review items и даёт `Подтвердить`, `Отмена`, `Подтвердить всё`.
- `Записи` показывает voice-sale журнал с распознанным текстом, статусом, суммой, audio link и раскрытием товаров.
- `needs_review` запись помечается review badge и доступна на вкладке `Проверка`.
- `Продавцы` показывает активность, количество записей и выручку за выбранный период.
- `/debug-telegram` доступен только в development или при `DEBUG_TELEGRAM_WEBAPP=true`.

## Sale item management

- `✏️` открывает compact edit form.
- Валидное ручное сохранение обновляет `sale_items`, пересчитывает `total` и ставит item `processed`; parent `needs_review` sale всё равно не входит в выручку до confirm.
- Edit сохраняет товар, количество, единицу и цену в Supabase.
- Edit пересчитывает item total.
- Edit пересчитывает sale total и report totals.
- `🗑` открывает confirm dialog `Удалить товар из отчёта?`.
- Delete выполняет soft delete через `deleted_at`.
- Deleted item исчезает из active report.
- Deleted item не возвращается после page reload.
- Restore остаётся для исторически soft-deleted rows в отдельном details block.

## Revenue rules

- В выручку входит только parent sale `processed`.
- В выручку входит только item `processed`.
- Item с валидным `total` может войти в выручку даже если unit price был восстановлен из total.
- `needs_review`, `cancelled`, `failed`, `excluded` и deleted rows не входят.
- Processed-looking item внутри `needs_review` sale не входит в выручку.

## Tests

- Parser/status regression tests.
- Telegram keyboard regression tests.
- Confirm/cancel service tests.
- Report scope and shop isolation tests.
- Update/delete patch and totals tests.
- Telegram WebApp session tests.
