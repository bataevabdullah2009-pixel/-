# Обзор продукта

`Голосовой журнал продаж` помогает магазину вести выручку через Telegram voice messages. Продавец не заполняет таблицу вручную: он говорит продажу, бот распознаёт товары и цены, Supabase хранит запись, WebApp показывает отчёт.

## Основной поток

1. Продавец открывает Telegram bot.
2. `/start` проверяет привязку к магазину и даёт доступ к WebApp.
3. Продавец отправляет voice message.
4. Бот скачивает audio file.
5. Audio подготавливается для STT.
6. STT возвращает русский transcript.
7. Parser/LLM выделяет товары, количество, единицы, цены, totals и confidence.
8. Supabase сохраняет `voice_records`, `sales`, `sale_items`.
9. Бот отвечает пользователю.
10. WebApp показывает обновлённые данные.

## Статусы

- `processed` - запись подтверждена и входит в выручку.
- `needs_review` - запись сохранена, но не входит в выручку.
- `cancelled` - пользователь отменил запись, она не входит в выручку.
- `failed` - voice pipeline не смог обработать запись.

## Уверенная запись

Уверенная запись имеет валидные товары, количество, цену, total и достаточную уверенность.

Результат:

- `sales.status = processed`;
- `voice_records.status = processed`;
- валидные `sale_items.status = processed`;
- `sales.total_amount` равен сумме active processed items;
- бот отвечает `✅ Запись сохранена: ...`;
- запись сразу видна в отчёте.

## Сомнительная запись

Сомнительная запись появляется, если не хватает товара, количества, цены, total, confidence низкий или parser fallback сработал.

Результат:

- `sales.status = needs_review`;
- `voice_records.status = needs_review`;
- active review items не входят в выручку; active `processed` items могут учитываться;
- бот отвечает предупреждением;
- под сообщением только `✅ Подтвердить` и `❌ Отмена`;
- WebApp показывает запись на вкладке `Проверка`.

## Confirm/cancel

`✅ Подтвердить`:

- переводит sale в `processed`;
- переводит voice record в `processed`;
- переводит все валидные active items в `processed`;
- оставляет неполные active items mixed-корзины в `needs_review`;
- пересчитывает `sales.total_amount`;
- добавляет товары в отчёт.

`❌ Отмена`:

- переводит sale в `cancelled`;
- переводит voice record в `cancelled`;
- soft-delete active items;
- сохраняет данные для аудита;
- не добавляет выручку.

## WebApp

WebApp содержит:

- `Отчёт`;
- `Проверка`;
- `Записи`;
- `Продавцы`.

WebApp использует спокойный premium SaaS стиль: `#0B1020` background, `#12192B`/`#161F34` surfaces и синий accent `#5B8CFF`; warning-оранжевый применяется только для review-состояний.

Сомнительные voice-записи подтверждаются или отменяются Telegram inline-кнопками под исходным сообщением либо на вкладке WebApp `Проверка`. Оба пути используют одинаковые status/revenue rules.

## Выручка

Выручка рассчитывается по active processed items только из processed sales. Это защищает отчёт от частично распознанных или отменённых voice-записей.

## Документация

Главные specs:

- `docs/specs/product/webapp-report.md`;
- `docs/specs/product/telegram-confirmation-flow.md`;
- `docs/specs/product/sale-item-editing.md`;
- `docs/specs/technical/database.md`;
- `docs/specs/technical/telegram-webhook.md`;
- `docs/specs/technical/telegram-webapp-session.md`.
