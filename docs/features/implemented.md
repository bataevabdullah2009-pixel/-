# Реализованные функции

Актуально на 30 июня 2026.

- Telegram voice сохраняется как `voice_records`, `sales`, `sale_items` через существующий pipeline.
- Bot отвечает success только после Supabase RPC и read-back проверки sale/items.
- Уверенные позиции сразу получают `processed` и входят в отчёт.
- Сомнительные voice-записи получают `needs_review` и Telegram inline-кнопки `✅ Подтвердить` / `❌ Отмена` / `Открыть отчёт`.
- Callback data короткие: `confirm:<record_id>` и `cancel:<record_id>`.
- Confirm callback переводит sale/voice в `processed` и добавляет валидные items в выручку.
- Cancel callback переводит sale/voice в `cancelled` и soft-delete active items.
- Callback flow идемпотентный: повторное нажатие не ломает данные.
- WebApp поддерживает Telegram session и явно настроенный browser fallback.
- Отчёт фильтруется по периоду и server-derived магазину.
- Summary отчёта показывает выручку, количество товаров, записи и «Нужно проверить».
- Отчёт показывает топ товаров, продажи за период и review-блок.
- WebApp имеет вкладку «Проверка» для review-записей с parsed text, товарами, edit/delete и confirm/cancel.
- Журнал записей показывает дату/время, продавца, текст, статус, сумму, аудио и раскрытие товаров.
- Страница продавцов показывает активность, последнюю запись, количество записей и выручку за период.
- Карточки товаров показывают название, количество, цену за единицу и сумму.
- Inline-редактирование сохраняет `product_name`, `quantity`, `price` и пересчитывает `total`.
- Edit processed item пересчитывает выручку.
- Edit review item сохраняет поля, но не подтверждает voice-запись.
- Soft delete выполняется через иконку корзины и локальное подтверждение.
- Исключённые товары не показываются активными и могут быть восстановлены.
- Пустой период и продажа без active items отображаются штатным empty state.
- Нижняя навигация: «Отчёт», «Записи», «Проверка», «Продавцы».
- Telegram diagnostics доступна только при `DEBUG_TELEGRAM_WEBAPP=true`.
