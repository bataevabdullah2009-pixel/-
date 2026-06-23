# P0 WebApp session и shop resolver — завершено 2026-06-24

## Причина

Production API получал непустой Telegram `initData` длиной 586 символов, но возвращал `401 TELEGRAM_INIT_DATA_INVALID` до извлечения user id. Валидатор исключал из data-check-string поле `signature`, хотя актуальная Telegram HMAC-схема исключает только `hash`.

Из-за отсутствующей session cookie Server Components не могли получить seller/shop context. Report возвращал нулевой результат с auth error, а records маскировал ту же ошибку состоянием «Записей нет». В Supabase при этом существовали продажи и позиции в active seller shop.

## Исправлено

- raw `initData` передаётся через `x-telegram-init-data`;
- клиент проверяет WebApp, initData и `initDataUnsafe.user.id`;
- HMAC использует только `TELEGRAM_BOT_TOKEN`, включает `signature` и исключает только `hash`;
- причины auth failure логируются без initData и токенов;
- seller определяется по Telegram user id; owner binding создаёт seller только в том же shop;
- report читает sales по seller shop и items по sale IDs;
- report log содержит user/seller/shop/counts/date range/error reason;
- report и records не показывают ложные пустые состояния при ошибке;
- diagnostics скрыта без `DEBUG_TELEGRAM_WEBAPP=true`;
- voice/STT/parser/save pipeline не изменялся.

## Проверка

- valid initData с полем `signature` создаёт session context;
- invalid hash даёт 401 mapping;
- expired auth date и missing bot token имеют отдельные reason;
- Telegram user разрешается в seller и shop;
- отсутствующий seller создаётся из active owner binding;
- cross-shop sale rows отклоняются;
- существующие sales/sale_items дают ненулевой report;
- production Supabase read-only check подтверждает строки sales и sale_items в active seller shop.
- `npm run lint` — passed;
- `npm run test` — 8 files, 79 tests passed;
- `npm run build` — bot/web/shared passed.
