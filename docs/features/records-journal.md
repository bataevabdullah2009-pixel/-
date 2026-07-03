# Records Journal

Журнал `Записи` показывает voice-sale историю текущего server-derived магазина. Он нужен для проверки исходного распознавания, аудио и состава товаров, но не является основным экраном review decision.

## Source

`getRecords(filters)`:

1. Вызывает `requireOwner()`.
2. Получает current shop на сервере.
3. Читает `sales` по shop и period.
4. Применяет optional seller filter.
5. Применяет text search по `raw_text` и `cleaned_text`.
6. Читает связанные `sale_items`.
7. Читает linked seller name.
8. Читает linked voice audio fields.
9. Создаёт signed audio URL, если есть `audio_path`.
10. Возвращает records и error отдельно.

Seller filter не расширяет shop boundary.

## Карточка записи

Карточка содержит:

1. Дату.
2. Время.
3. Продавца.
4. Распознанный текст.
5. Raw text fallback.
6. Пользовательский статус.
7. Сумму.
8. Audio link, если audio сохранено.
9. Раскрытие `Товары`.
10. Список sale items.

## Статусы

Internal enum не показываются напрямую.

Labels:

1. `processed` -> `Готово`.
2. `needs_review` -> `Нужно проверить`.
3. Legacy `needs_price` -> `Нужно проверить`.
4. `failed` -> `Нужно проверить`.
5. `pending` -> `Нужно проверить`.
6. `cancelled` -> `Исключено`.
7. `excluded` -> `Исключено`.

Для `needs_review` показывается badge `Нужно проверить`.

## Товары внутри записи

Раскрытие товаров показывает:

1. Product name.
2. Quantity.
3. Unit.
4. Price.
5. Total.
6. Item status.
7. Deleted state, если item исключён.

Журнал может показать items parent sale, включая review и deleted context, но active revenue всё равно считается на экране отчёта.

## Что журнал не делает

1. Не подтверждает review sale.
2. Не отменяет review sale.
3. Не принимает trusted `shop_id`.
4. Не пишет напрямую в Supabase из browser.
5. Не скрывает auth/DB error как empty state.

Confirm/cancel выполняются в Telegram callback или на вкладке `Проверка`.

## Audio

Audio:

1. Upload best-effort во время voice pipeline.
2. Отсутствие audio не ломает запись.
3. `audio_path` даёт signed URL через server.
4. `audio_url` используется как fallback.
5. Signed URL живёт ограниченное время.
6. Storage errors не раскрываются пользователю как raw Supabase error.

## Filters

Поддерживаются:

1. Period.
2. Custom date.
3. Seller.
4. Search.

Search ищет по:

1. `raw_text`.
2. `cleaned_text`.

## Empty and error states

1. Если записей нет и ошибки нет, показывается empty state.
2. Если auth error, показывается action notice.
3. Если DB error, показывается action notice.
4. Ошибка не должна выглядеть как `Записей нет`.

## Acceptance criteria

1. Records uses server-derived shop.
2. Seller filter cannot leak another shop.
3. Search cannot leak another shop.
4. Record card shows transcript context.
5. Audio link appears only when available.
6. Internal enum labels are translated.
7. Review decision is not duplicated in journal.
8. Auth/DB errors stay visible.
