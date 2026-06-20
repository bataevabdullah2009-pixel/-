# Развёртывание на Vercel

1. Импортировать репозиторий и оставить корень монорепозитория.
2. Добавить переменные из `.env.example` без префикса `NEXT_PUBLIC_` для секретов.
3. Выполнить Supabase migrations по порядку.
4. Создать owner/seller записи и проверить их `shop_id`.
5. Задеплоить приложение и задать production `NEXT_PUBLIC_APP_URL` на канонический HTTPS alias без preview suffix; при отдельном webhook domain задать `PUBLIC_WEBHOOK_URL`.
6. Установить Telegram webhook с секретом.
7. Выполнить `npm run test` и `npm run build` для release commit.

`SUPABASE_SERVICE_ROLE_KEY` доступен только server functions и bot runtime.

Обязательный production checklist: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, STT/LLM URL+key+model, `DEFAULT_SHOP_NAME`, `DEMO_MODE=false`. После deploy `telegram:webhook-info` должен показывать текущий domain, нулевую очередь, отсутствие last error и `allowed_updates=["message"]`.

Read-only проверка 2026-06-20 подтвердила production deployment `Ready`, alias `https://web-n3ji.vercel.app` и наличие `NEXT_PUBLIC_APP_URL` в production env. Значение помечено Sensitive и не раскрывается Vercel CLI; совпадение runtime URL подтверждается текущим webhook. Локальные, ngrok и устаревшие preview URL не используются.
