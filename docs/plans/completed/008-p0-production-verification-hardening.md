# P0-укрепление production-проверки — завершено 2026-06-24

## Граница

Изменены только auth Telegram WebApp, регрессионные тесты и документация. Голосовой/STT/parser/save конвейер, таблицы, миграции и дизайн не менялись.

## Изменения

- data-check-string сортируется детерминированно и исключает только `hash`;
- тестируется фиксированный Telegram Mini App payload с `signature` и сложным `user`;
- auth API логирует `initDataLength` без raw initData и секретов;
- live smoke Supabase/Vercel проверяет session cookie, resolver продавца/магазина и ненулевые счётчики отчёта.

## Результат production smoke

- оба активных продавца определяются через Telegram user id;
- оба продавца относятся к одному магазину, в котором находятся продажи бота;
- `/api/auth/telegram` возвращает `200`;
- отчёт за 24 июня 2026 читает 4 `sales` и 4 `sale_items`.
