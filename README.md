# voice-sales-log

Голосовой журнал продаж: продавец отправляет голосовое сообщение Telegram-боту, система распознаёт товар, количество и цену, сохраняет результат в Supabase и показывает владельцу отчёт в Telegram Mini App.

Это учебный MVP для небольшого магазина. Проект не является CRM, складом, кассой, системой фискализации или онлайн-оплатой.

## Основной сценарий

1. В рабочем окружении Telegram доставляет update в webhook на Vercel; локально бот использует polling.
2. Бот скачивает и сохраняет аудио, затем вызывает Whisper-совместимый STT.
3. LLM возвращает строгий JSON, а детерминированная проверка запрещает угадывать значения.
4. `voice_records`, `sales`, `sale_items` и `audit_logs` сохраняются в Supabase.
5. Владелец открывает `/daily-report`, выбирает период и видит количество и выручку.
6. Любую позицию можно исправить, обратимо исключить или восстановить; «Сбросить день» обратимо исключает все позиции выбранного дня.

## Технологии

TypeScript, Next.js, React, Telegraf, Telegram Bot API, Supabase Postgres/Storage, Whisper-совместимый STT, OpenAI-совместимый LLM, Vercel, Zod и Vitest.

## Структура репозитория

```text
apps/web        Next.js Web App, отчёты, серверные действия и Telegram webhook
apps/bot        Telegram-обработчики, локальный polling и обработка голоса
packages/shared Типы, Zod-схемы, парсер, даты и расчёт отчёта
supabase        Миграции и демонстрационные данные
scripts         Эксплуатационные скрипты webhook
tests           Модульные и регрессионные тесты
docs            Спецификации, планы, правила, истории, архитектура и дорожная карта
codex/skills    Основной проектный навык для Codex
```

## Карта документации

| Раздел | Расположение |
| --- | --- |
| Обзор | [docs/overview/README.md](docs/overview/README.md) |
| Глобальная спецификация | [docs/specs/global.md](docs/specs/global.md) |
| Технические спецификации | [docs/specs/technical/README.md](docs/specs/technical/README.md) |
| Продуктовые спецификации | [docs/specs/product/README.md](docs/specs/product/README.md) |
| Спецификации данных | [docs/specs/data/README.md](docs/specs/data/README.md) |
| Функции | [docs/features/README.md](docs/features/README.md) |
| Активные планы | [docs/plans/active/](docs/plans/active/) |
| Завершённые планы | [docs/plans/completed/](docs/plans/completed/) |
| Будущие задачи | [docs/plans/backlog/](docs/plans/backlog/) |
| Правила | [docs/rules/README.md](docs/rules/README.md) |
| Git и GitHub | [docs/rules/git-and-github.md](docs/rules/git-and-github.md) |
| Архитектура | [docs/architecture/architecture.md](docs/architecture/architecture.md) |
| Дорожная карта | [docs/roadmap/roadmap.md](docs/roadmap/roadmap.md) |
| Пользовательские истории | [docs/stories/README.md](docs/stories/README.md) |
| Проектный навык | [codex/skills/voice-sales-log/SKILL.md](codex/skills/voice-sales-log/SKILL.md) |

Рекомендуемый порядок чтения: обзор → глобальная спецификация → продуктовые, технические и информационные спецификации → правила → активные планы.

## Установка и запуск

```bash
npm install
npm run web:dev
npm run bot:dev
```

В PowerShell с запрещёнными сценариями используйте `npm.cmd` и `npx.cmd`.

Скопируйте `.env.example` в `.env.local` и заполните значения только локально. Не коммитьте `.env.local`. Переменная `SUPABASE_SERVICE_ROLE_KEY` предназначена только для серверного кода.

## Команды качества

```bash
npm run lint
npm run test
npm run build
```

## Supabase

Перед развёртыванием примените миграции по порядку. Последняя миграция добавляет обратимое удаление позиции, необходимое для изменения, исключения, восстановления и сброса дня. `seed.sql` необязателен и предназначен только для демонстрационных данных.

## Vercel и Telegram webhook

1. Примените миграции Supabase.
2. Добавьте в Vercel все переменные из `.env.example` и выполните повторное развёртывание.
3. Укажите в `NEXT_PUBLIC_APP_URL` HTTPS-адрес развёртывания.
4. Локально выполните `npm run telegram:set-webhook`.
5. Выполните `npm run telegram:webhook-info` и проверьте URL и пустой `last_error_message`.
6. В BotFather задайте Menu Button с тем же адресом Web App.

Polling (`npm run bot:dev`) используется только локально и не должен работать одновременно с производственным webhook.

## Демонстрационный сценарий

1. Отправьте: «Сникерс 5 штук по 60 рублей».
2. Откройте Telegram Mini App → «Отчёт» → «Сегодня».
3. Ожидайте 5 единиц и 300 ₽.
4. Измените цену на 70 и сохраните: ожидайте 350 ₽.
5. Исключите позицию: ожидайте 0 ₽; восстановите: ожидайте 350 ₽.
6. Сбросьте выбранный день и убедитесь, что другая дата не изменилась.

## Ограничения

Текущий MVP использует демонстрационные политики анонимного чтения и не имеет производственной авторизации владельца. До серверной проверки Telegram init data, изоляции магазинов, идемпотентности update и транзакционной записи используйте только тестовые данные. Подробности находятся в [архитектуре](docs/architecture/architecture.md) и [дорожной карте](docs/roadmap/roadmap.md).
