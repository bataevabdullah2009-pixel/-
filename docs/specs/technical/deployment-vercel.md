# Развёртывание на Vercel

## Порядок развёртывания

1. Применить все `supabase/migrations` к целевому проекту.
2. Импортировать репозиторий в Vercel и настроить приложение Next.js.
3. Добавить Telegram, Supabase, STT, LLM и служебные переменные из `.env.example`.
4. Выполнить повторное развёртывание.
5. Проверить `/daily-report` и `/api/telegram/webhook`.
6. Локально выполнить `npm run telegram:set-webhook`.
7. Выполнить `npm run telegram:webhook-info`.

## Кнопка Mini App

В BotFather задать Menu Button с HTTPS-адресом Web App. Открыть кнопку в Telegram и проверить отчёт, нижнюю навигацию и встроенный экран.

## Если webhook не отвечает

1. Проверить URL и `last_error_message` через `getWebhookInfo`.
2. Найти запрос и ошибку в журналах Vercel Functions.
3. Сверить `TELEGRAM_WEBHOOK_SECRET` и выполнить повторное развёртывание.
4. Проверить наличие всех переменных бота, STT, LLM и Supabase.
5. Убедиться, что polling остановлен.
6. Проверить миграции, права Data API и RLS.
7. Переустанавливать webhook только после устранения причины, учитывая `drop_pending_updates`.

Развёртывание не меняет `.env.local` и не должно выводить значения секретов. Рабочая проверка не считается выполненной только на основании локальной сборки.
