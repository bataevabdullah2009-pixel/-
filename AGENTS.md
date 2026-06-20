# AGENTS.md

Voice Sales Log — реальный MVP-продукт: голосовой журнал продаж для магазина. Продавец отправляет voice message в Telegram, система выполняет STT и parsing, сохраняет продажу в Supabase, а владелец видит отчёт в Telegram Web App.

## Канонические источники

Перед изменением прочитать:

1. `docs/INDEX.md`.
2. `docs/specs/global.md`.
3. Профильную спецификацию из `docs/specs/product`, `docs/specs/technical` или `docs/specs/data`.
4. Последний завершённый план `docs/plans/completed/001-stabilize-sales-flow.md`.

Код нельзя менять без обновления затронутых документов. Если реализация и текст расходятся, задача не завершена.

## Неподвижные границы

- Не добавлять CRM, склад, кассу, оплаты и клиентскую базу.
- Не ломать Telegram bot, webhook, STT, LLM parser, Supabase и mobile UI.
- `shop_id` нельзя принимать от клиента. Он определяется только на сервере после валидации Telegram initData и чтения owner/seller из БД.
- `SUPABASE_SERVICE_ROLE_KEY` используется только сервером и никогда не передаётся клиенту.
- Unknown seller не сохраняется в случайный магазин при `DEMO_MODE=false`.
- Отчёт учитывает только `status = processed` и `deleted_at is null`.
- Исключение позиции выполняется только через soft delete.
- Кнопка отчёта в Telegram создаётся только как `web_app`, не как обычная URL-кнопка.
- Web App передаёт `Telegram.WebApp.initData` в `x-telegram-init-data`; production fallback без initData запрещён.
- Сбой Storage или невалидный LLM JSON не должен скрывать распознанную продажу: создаётся `needs_review`.
- Каждый voice request логирует именованные этапы и `voice_failed` с полем `stage`.

## Documentation sync is mandatory

После любого изменения кода агент обязан:

1. Проверить, какие docs затронуты.
2. Обновить specs, если изменилась логика.
3. Обновить database docs, если изменилась schema.
4. Обновить feature docs, если изменилась функция продукта.
5. Обновить plans, если задача завершена.
6. Обновить roadmap, если изменился статус продукта.
7. Обновить `CHANGELOG.md`.
8. Запустить `npm run test`.
9. Запустить `npm run build`.

Если документация не обновлена, задача считается незавершённой.

## Инженерные правила

- Миграции сохраняют существующие данные и используют идемпотентные DDL-операции, где это возможно.
- Server actions повторно выполняют authorization; middleware или UI не являются границей доступа.
- Технические ошибки логируются на сервере, UI получает стабильное русскоязычное сообщение.
- Новая логика сопровождается regression tests.
- Перед коммитом просмотреть `git diff` и не включать секреты или несвязанные изменения.
