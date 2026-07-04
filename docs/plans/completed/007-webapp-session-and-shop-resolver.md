# P0-сессия WebApp и resolver магазина — завершено 2026-06-24

## Причина

Production API получал непустой Telegram `initData` длиной 586 символов, но возвращал `401 TELEGRAM_INIT_DATA_INVALID` до извлечения user id. Валидатор исключал из data-check-string поле `signature`, хотя актуальная Telegram HMAC-схема исключает только `hash`.

Из-за отсутствующей session cookie Server Components не могли получить контекст продавца/магазина. Отчёт возвращал нулевой результат с auth error, а записи маскировали ту же ошибку состоянием «Записей нет». В Supabase при этом существовали продажи и позиции в магазине активного продавца.

## Исправлено

- raw `initData` передаётся через `x-telegram-init-data`;
- клиент проверяет WebApp, initData и `initDataUnsafe.user.id`;
- HMAC использует только `TELEGRAM_BOT_TOKEN`, включает `signature` и исключает только `hash`;
- причины сбоя auth логируются без initData и токенов;
- seller определяется по Telegram user id; owner binding создаёт seller только в том же shop;
- отчёт читает продажи по магазину продавца и позиции по id продаж;
- лог отчёта содержит user/seller/shop/counts/date range/error reason;
- отчёт и записи не показывают ложные пустые состояния при ошибке;
- диагностика скрыта без `DEBUG_TELEGRAM_WEBAPP=true`;
- голосовой/STT/parser/save конвейер не изменялся.

## Проверка

- валидный initData с полем `signature` создаёт контекст сессии;
- невалидный hash даёт mapping 401;
- истёкшая auth date и missing bot token имеют отдельные reason;
- Telegram user разрешается в seller и shop;
- отсутствующий seller создаётся из active owner binding;
- cross-shop строки продаж отклоняются;
- существующие sales/sale_items дают ненулевой отчёт;
- production read-only проверка Supabase подтверждает строки sales и sale_items в магазине активного продавца.
- `npm run lint` — пройдено;
- `npm run test` — 8 файлов, 79 тестов пройдены;
- `npm run build` — bot/web/shared пройдены.
