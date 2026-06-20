# Развёртывание на Vercel

1. Импортировать репозиторий и оставить корень монорепозитория.
2. Добавить переменные из `.env.example` без префикса `NEXT_PUBLIC_` для секретов.
3. Выполнить Supabase migrations по порядку.
4. Создать owner/seller записи и проверить их `shop_id`.
5. Задеплоить приложение и задать `NEXT_PUBLIC_APP_URL`.
6. Установить Telegram webhook с секретом.
7. Выполнить `npm run test` и `npm run build` для release commit.

`SUPABASE_SERVICE_ROLE_KEY` доступен только server functions и bot runtime.
