# voice-sales-log

`voice-sales-log` — учебный TypeScript-проект для магазина: продавец отправляет голосовое сообщение в Telegram-бот, система распознаёт текст, очищает его, извлекает позиции продажи и показывает владельцу простой отчёт.

Это не CRM, не склад, не касса и не учёт остатков. Проект решает одну задачу: быстро превратить голос продавца в понятную запись и таблицу итогов.

## Проблема

В небольшом магазине продавцы часто записывают продажи в тетрадь или в чат. Это неудобно, записи сложно искать, а владелец тратит время на ручной подсчёт. Проект автоматизирует фиксацию продаж без сложной кассовой системы.

## Как работает система

1. Продавец отправляет голосовое сообщение в Telegram-бот.
2. В production Telegram отправляет update на Vercel route `/api/telegram/webhook`; локально `npm run bot:dev` использует polling.
3. Общий обработчик `processTelegramUpdate(update)` запускает существующую bot-логику.
4. Бот скачивает аудио и сохраняет его в Supabase Storage.
5. Whisper-compatible STT API переводит голос в сырой текст.
6. LLM очищает текст и возвращает строгий JSON с позициями продажи.
7. Если цена названа в голосе, система использует её.
8. Если цена не названа, система ищет цену в таблице `products`.
9. Если цена не найдена, позиция получает статус `needs_price`.
10. Запись, продажа и позиции сохраняются в Supabase Postgres.
11. Веб-панель показывает записи и отчёты за день, неделю, месяц или год.

## Стек

- TypeScript
- Telegram Bot API через Telegraf
- Supabase Postgres
- Supabase Storage
- React / Next.js App Router
- Whisper-compatible STT API
- OpenRouter / Polza AI / другой OpenAI-compatible LLM для очистки текста и JSON-парсинга
- Zod
- Vitest

## Структура папок

```text
voice-sales-log/
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── .env.example
├── package.json
├── docs/
├── apps/
│   ├── bot/
│   └── web/
├── packages/
│   └── shared/
├── scripts/
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── tests/
```

## Документация

Документация организована как профессиональная карта проекта:

| Раздел | Файл |
| --- | --- |
| Карта документации | `docs/overview/README.md` |
| Главная спецификация | `docs/specs/global.md` |
| Индекс спецификаций | `docs/specs/README.md` |
| Детальные specs | `docs/specs/*` |
| Рабочий план | `docs/plans/README.md` |
| Активные планы | `docs/plans/active.md` |
| Завершённые планы | `docs/plans/completed.md` |
| Backlog | `docs/plans/backlog.md` |
| Правила | `docs/rules/README.md`, `docs/rules/*` |
| Фичи | `docs/features/README.md`, `docs/features/*` |
| User stories | `docs/stories/README.md`, `docs/stories/*` |
| Архитектура | `docs/architecture/README.md` |
| Roadmap | `docs/roadmap/README.md` |
| Codex skill | `codex-skills/voice-sales-log/SKILL.md` |

Рекомендуемый порядок чтения:

1. `README.md`
2. `docs/specs/global.md`
3. `docs/architecture/README.md`
4. `docs/specs/README.md`
5. `docs/plans/README.md`
6. `docs/rules/README.md`
7. `docs/features/README.md`
8. `docs/stories/README.md`

## Установка

```bash
npm install
```

На Windows в PowerShell может быть заблокирован `npm.ps1`. В этом случае используйте `npm.cmd install`.

## Env-переменные

Скопируйте `.env.example` в `.env.local` и заполните значения:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=voice-records
STT_API_KEY=
STT_API_URL=
STT_MODEL=whisper-large-v3-turbo
LLM_API_KEY=
LLM_API_URL=
LLM_MODEL=
DEFAULT_SHOP_NAME=Демо-магазин
```

`SUPABASE_SERVICE_ROLE_KEY` используется только серверным кодом бота, webhook route и серверными действиями веб-панели. Его нельзя передавать в браузер.

`TELEGRAM_WEBHOOK_SECRET` передаётся в Telegram `setWebhook` как `secret_token` и проверяется в route по header `x-telegram-bot-api-secret-token`.

## Запуск

```bash
npm run dev
npm run bot:dev
npm run web:dev
npm run telegram:set-webhook
npm run telegram:webhook-info
npm run lint
npm run test
npm run build
```

Отдельные команды:

- `npm run dev` — запускает бота и веб-панель одновременно.
- `npm run bot:dev` — запускает Telegram-бота локально через polling.
- `npm run web:dev` — запускает веб-панель на `http://localhost:3000`.
- `npm run telegram:set-webhook` — регистрирует Telegram webhook для Vercel route.
- `npm run telegram:webhook-info` — показывает текущий Telegram webhook.
- `npm run lint` — проверяет код ESLint.
- `npm run test` — запускает Vitest.
- `npm run build` — проверяет сборку workspaces.

## Deploy webhook bot on Vercel

1. Задеплойте `apps/web` на Vercel.
2. Добавьте env в Vercel:
   `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_APP_URL`,
   `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_STORAGE_BUCKET`,
   `STT_API_KEY`,
   `STT_API_URL`,
   `STT_MODEL`,
   `LLM_API_KEY`,
   `LLM_API_URL`,
   `LLM_MODEL`,
   `DEFAULT_SHOP_NAME`.
3. Сделайте Redeploy после добавления env.
4. Локально заполните `.env.local`, включая `NEXT_PUBLIC_APP_URL=https://your-vercel-domain`.
5. Выполните `npm run telegram:set-webhook`.
6. Проверьте `npm run telegram:webhook-info`: `url` должен быть `${NEXT_PUBLIC_APP_URL}/api/telegram/webhook`, `last_error_message` должен быть пустым.
7. Напишите боту `/start`.
8. Отправьте голосовое.
9. Проверьте Supabase и веб-панель.

На Vercel polling не запускается. Production-путь: Telegram voice message -> Vercel API route -> `processTelegramUpdate(update)` -> существующая обработка голосового -> Supabase -> веб-панель.

## Supabase

1. Создайте проект Supabase.
2. Примените миграцию `supabase/migrations/001_init.sql`.
3. При необходимости выполните `supabase/seed.sql` для демо-данных.
4. Создайте или проверьте bucket `voice-records`.
5. Заполните `.env.local`.

## Демо-сценарий

1. Запустить проект.
2. Отправить голосовое в Telegram-бот: `хлеб 3 по 40, молоко 2 по 90`.
3. Открыть веб-панель.
4. Увидеть текстовую запись на странице `/records`.
5. Открыть `/daily-report` и увидеть таблицу товаров, количества и выручки.
6. Отфильтровать записи за день или месяц.
7. Проверить блок “Нужно проверить”, если в голосовом не была названа цена.

## Что важно

- ИИ не должен выдумывать цены, товары или аналитику.
- Если цена неизвестна, позиция не попадает в итоговую выручку.
- Позиции без цены отображаются в блоке “Нужно проверить”.
- Проект остаётся простым голосовым журналом продаж.
