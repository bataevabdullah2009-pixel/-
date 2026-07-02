# Реализованные функции

## Telegram bot

- `/start` проверяет продавца и даёт WebApp доступ к отчёту.
- Voice messages проходят download, audio prepare, STT, parser, Supabase persistence.
- Уверенные продажи сохраняются как `processed`.
- Сомнительные продажи сохраняются как `needs_review`.
- Review-message содержит только `✅ Подтвердить` и `❌ Отмена`.
- Callback data короткие: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Legacy callback prefix принимается для старых сообщений.
- Confirm callback переводит sale/voice/items в `processed`.
- Cancel callback переводит sale/voice в `cancelled` и soft-delete active items.
- Failed voice сохраняет `voice_records.status = failed`, если sale ещё не persisted.

## WebApp

- Нижняя навигация: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- `Отчёт` показывает выручку, количество товаров, количество записей и review count.
- Период фильтруется по сегодня, вчера, неделя, месяц, год и выбранная дата.
- `Топ товаров` строится по active processed revenue.
- `Продажи за период` показывает active processed item cards.
- `Проверка` показывает active review items и даёт `Подтвердить`, `Отмена`, `Подтвердить всё`.
- `Записи` показывает voice-sale журнал с распознанным текстом, статусом, суммой, audio link и раскрытием товаров.
- `needs_review` запись помечается review badge и доступна на вкладке `Проверка`.
- `Продавцы` показывает активность, количество записей и выручку за выбранный период.
- `/debug-telegram` доступен только в development или при `DEBUG_TELEGRAM_WEBAPP=true`.

## Sale item management

- `✏️` открывает compact edit form.
- Edit сохраняет товар, количество и цену в Supabase.
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
- `needs_review`, `cancelled`, `failed`, `excluded` и deleted rows не входят.
- Processed-looking item внутри `needs_review` sale не входит в выручку.

## Tests

- Parser/status regression tests.
- Telegram keyboard regression tests.
- Confirm/cancel service tests.
- Report scope and shop isolation tests.
- Update/delete patch and totals tests.
- Telegram WebApp session tests.
