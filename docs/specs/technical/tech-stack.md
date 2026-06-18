# Технологии

| Инструмент | Назначение | Расположение | Переменные окружения |
| --- | --- | --- | --- |
| TypeScript | Контракты данных и общий язык монорепозитория | Все приложения, пакеты, скрипты и тесты | Нет |
| Next.js App Router | Серверные компоненты, страницы, действия и webhook | `apps/web` | `NEXT_PUBLIC_APP_URL` для скриптов и развёртывания |
| React | Интерфейс отчёта, записей и продавцов | `apps/web/src` | Нет |
| Telegraf и Telegram Bot API | Команды, update, ответы и ссылки на файлы | `apps/bot` | `TELEGRAM_BOT_TOKEN` |
| Telegram webhook | Рабочая доставка update в Vercel | API route и скрипты | `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` |
| Supabase Postgres | Магазины, продавцы, записи, продажи, позиции и аудит | Сервисы бота и серверный слой веб-приложения | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase Storage | Приватное хранение голоса | Загрузка ботом, подписанные ссылки в веб-приложении | Переменные Supabase, `SUPABASE_STORAGE_BUCKET` |
| Whisper-совместимый STT | Преобразование аудио в исходную расшифровку | `transcription.service.ts` | `STT_API_KEY`, `STT_API_URL`, `STT_MODEL` |
| OpenAI-совместимый LLM | Очистка и извлечение JSON | `cleanup-text.service.ts` | `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` |
| Vercel | Размещение Next.js и серверного webhook | `apps/web` | Серверные переменные из `.env.example` |
| Zod | Проверка окружения и JSON парсера | Конфигурация бота и общие схемы | Нет |
| Vitest | Модульные и регрессионные тесты | `tests` | Нет |

`SUPABASE_SERVICE_ROLE_KEY`, ключи STT/LLM, токен бота и секрет webhook используются только сервером. Им нельзя давать префикс `NEXT_PUBLIC_`.

Модель STT по умолчанию — `whisper-large-v3-turbo`. Другое поддерживаемое провайдером имя задаётся через `STT_MODEL` без изменения конвейера.
