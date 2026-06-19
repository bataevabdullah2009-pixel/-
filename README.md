# voice-sales-log

`voice-sales-log` — учебный голосовой журнал продаж небольшого магазина. Продавец диктует продажу Telegram-боту, система распознаёт речь, извлекает товар, количество и цену, сохраняет результат в Supabase, а владелец проверяет отчёт в Telegram Mini App.

Проект решает узкую задачу: заменить тетрадь и ручной вечерний подсчёт быстрым сценарием «сказал → сохранил → проверил». Это не CRM, не склад, не касса и не система онлайн-оплаты.

> Текущий MVP предназначен для демонстрации. До использования реальных коммерческих данных обязательны авторизация владельца, изоляция магазинов, идемпотентность, транзакции, мониторинг и резервное восстановление.

## Как работает проект

1. Продавец отправляет `/start`, затем голосовое сообщение с товаром, количеством и ценой.
2. В production Telegram доставляет update в защищённый webhook Vercel; локально используется polling.
3. Бот загружает аудио в приватный Supabase Storage и отправляет его в Whisper-совместимый STT.
4. LLM возвращает строгий JSON, а приложение проверяет значения по исходному тексту и самостоятельно считает итог.
5. `voice_records`, `sales`, `sale_items` и `audit_logs` сохраняются в Supabase.
6. Владелец смотрит отчёт, журнал и продавцов, исправляет сомнительные позиции, исключает и восстанавливает их.

Ручное сохранение требует непустое название, `quantity > 0` и `price > 0`. Сервер обновляет только выбранный `sale_items.id`, пересчитывает `total = quantity × price` и переводит позицию в `processed`. Исключение не удаляет строку: она получает `status = excluded`, `deleted_at` и `deleted_reason = excluded_by_owner` и перестаёт входить в отчёт.

```text
Telegram → Vercel webhook → STT → LLM parser → Supabase → Web App
```

## Стек

TypeScript, Next.js, React, Telegraf, Telegram Bot API, Supabase Postgres/Storage, Whisper-совместимый STT, OpenAI-совместимый LLM, Zod, Vitest и Vercel.

## Структура репозитория

```text
apps/bot        Telegram-обработчики, polling и голосовой конвейер
apps/web        Next.js Web App, серверные действия и Telegram webhook
packages/shared Общие типы, Zod-схемы, парсер, даты и расчёт отчёта
supabase        Последовательные миграции и демонстрационный seed
scripts         Установка и диагностика Telegram webhook
tests           Модульные и регрессионные тесты
docs            Спецификации, архитектура, правила, планы и roadmap
codex/skills    Проектный навык Codex
```

Главная карта документов: [docs/INDEX.md](docs/INDEX.md).

## Локальный запуск

Требования: Node.js 20+ и npm.

```bash
npm install
```

Скопируйте `.env.example` в `.env.local` и заполните значения локально.

> Никогда не коммитьте `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` разрешён только в серверном коде и настройках серверного окружения.

```bash
npm run web:dev
npm run bot:dev
```

`bot:dev` запускает polling. Не запускайте его одновременно с production webhook.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Одновременно запустить локальные bot и web процессы. |
| `npm run bot:dev` | Запустить Telegram polling локально. |
| `npm run web:dev` | Запустить Next.js Web App с `.env.local`. |
| `npm run lint` | Проверить ESLint. |
| `npm run test` | Выполнить Vitest. |
| `npm run build` | Собрать все workspaces. |
| `npm run web:build` | Собрать только Web App с `.env.local`. |
| `npm run telegram:set-webhook` | Установить Telegram webhook из `.env.local`. |
| `npm run telegram:webhook-info` | Показать URL, очередь и последнюю ошибку webhook. |

В PowerShell с запрещёнными сценариями используйте `npm.cmd` вместо `npm`.

## Supabase

1. Создайте проект Supabase и приватный bucket, определённый миграциями.
2. Примените все SQL-файлы из `supabase/migrations` по имени и времени создания.
3. При необходимости примените `supabase/seed.sql` только к демонстрационному окружению.
4. Не изменяйте уже применённую миграцию: любое изменение схемы оформляется новым SQL-файлом.

## Deploy на Vercel

1. Импортируйте репозиторий как Next.js-проект из workspace `apps/web`.
2. Убедитесь, что Vercel устанавливает зависимости монорепозитория и собирает `apps/web`.
3. Добавьте все переменные из `.env.example` в нужные Vercel environments; значения не помещайте в Git.
4. Укажите публичный HTTPS URL в `NEXT_PUBLIC_APP_URL` без завершающего `/`.
5. Сначала примените миграции Supabase, затем выполните redeploy.
6. Проверьте `/daily-report` и журналы Functions для `/api/telegram/webhook`.

Подробный порядок: [deployment-vercel.md](docs/specs/technical/deployment-vercel.md).

## Установка Telegram webhook

После успешного deploy задайте в локальном `.env.local` тот же `NEXT_PUBLIC_APP_URL`, токен бота и секрет webhook:

```bash
npm run telegram:set-webhook
npm run telegram:webhook-info
```

Ожидаемый URL оканчивается на `/api/telegram/webhook`, а `last_error_message` равен `null`. Команда установки использует `drop_pending_updates`, поэтому не запускайте её без понимания последствий для очереди. В BotFather задайте Menu Button с HTTPS-адресом Web App.

## Сценарий проверки для куратора

1. Открыть [docs/INDEX.md](docs/INDEX.md) и проверить границы MVP, архитектуру и единственный активный план.
2. Выполнить `npm run lint`, `npm run test` и `npm run build`.
3. Отправить боту `/start`, затем голосом: «Сникерс 5 штук по 60 рублей».
4. Убедиться, что бот сообщил статус обработки, а в отчёте появились 5 единиц и 300 ₽.
5. Изменить цену на 70, сохранить и проверить итог 350 ₽ и исчезновение позиции из блока проверки.
6. Исключить позицию, проверить 0 ₽, затем восстановить и снова получить 350 ₽.
7. Убедиться, что исходная запись и другая дата не изменились.

Локальные тесты не подтверждают состояние Telegram, Vercel или Supabase. Внешний шаг считается пройденным только после фактической проверки.

## Ограничения

MVP работает в демонстрационном режиме: Web App не имеет надёжной авторизации владельца, а RLS не обеспечивает production-изоляцию магазинов. Полный список блокеров находится в [production-readiness.md](docs/specs/product/production-readiness.md).
