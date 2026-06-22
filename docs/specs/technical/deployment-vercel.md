# Развёртывание на Vercel

1. Импортировать репозиторий и оставить корень монорепозитория.
2. Добавить переменные из `.env.example` без префикса `NEXT_PUBLIC_` для секретов.
3. Выполнить Supabase migrations по порядку.
4. Создать owner/seller записи и проверить их `shop_id`.
5. Задать Production и Preview `NEXT_PUBLIC_APP_URL` на один канонический HTTPS alias без временного deployment suffix; при отдельном webhook domain задать `PUBLIC_WEBHOOK_URL`.
6. Установить Telegram webhook с секретом.
7. Выполнить `npm run test` и `npm run build` для release commit.

`SUPABASE_SERVICE_ROLE_KEY` доступен только server functions и bot runtime.

Обязательный production checklist: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `STT_API_KEY`, `STT_API_URL`, `STT_MODEL`, `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL`, `DEMO_MODE=false`. `DEFAULT_SHOP_NAME` и `DEMO_OWNER_TELEGRAM_ID` нужны только для demo. После deploy `telegram:webhook-info` должен показывать текущий domain, нулевую очередь, отсутствие last error, `allowed_updates=["message"]` и `webhook_matches_expected=true`.

Release считается подтверждённым только после нового production deployment, проверки `/debug-telegram`, webhook diagnostics и реального mobile Telegram smoke run. Старые URL и результаты предыдущего deploy не являются доказательством текущего релиза.
