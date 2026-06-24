# P0 production verification hardening — завершено 2026-06-24

## Граница

Изменены только Telegram WebApp auth, regression tests и документация. Voice/STT/parser/save pipeline, таблицы, миграции и дизайн не менялись.

## Изменения

- data-check-string сортируется детерминированно и исключает только `hash`;
- тестируется фиксированный Telegram Mini App payload с `signature` и сложным `user`;
- auth API логирует `initDataLength` без raw initData и секретов;
- live Supabase/Vercel smoke проверяет session cookie, seller/shop resolver и ненулевые report counts.

## Результат production smoke

- оба active seller разрешены через Telegram user id;
- оба seller относятся к одному shop, в котором находятся продажи бота;
- `/api/auth/telegram` возвращает `200`;
- report за 24 июня 2026 читает 4 `sales` и 4 `sale_items`.
