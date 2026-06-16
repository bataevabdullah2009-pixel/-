# voice-sales-log

`voice-sales-log` — учебный TypeScript-проект для магазина: продавец отправляет голосовое сообщение в Telegram-бот, система распознаёт текст, очищает его, извлекает позиции продажи и показывает владельцу простой отчёт.

Это не CRM, не склад, не касса и не учёт остатков. Проект решает одну задачу: быстро превратить голос продавца в понятную запись и таблицу итогов.

## Проблема

В небольшом магазине продавцы часто записывают продажи в тетрадь или в чат. Это неудобно, записи сложно искать, а владелец тратит время на ручной подсчёт. Проект автоматизирует фиксацию продаж без сложной кассовой системы.

## Как работает система

1. Продавец отправляет голосовое сообщение в Telegram-бот.
2. Бот скачивает аудио и сохраняет его в Supabase Storage.
3. Whisper-compatible STT API переводит голос в сырой текст.
4. LLM очищает текст и возвращает строгий JSON с позициями продажи.
5. Если цена названа в голосе, система использует её.
6. Если цена не названа, система ищет цену в таблице `products`.
7. Если цена не найдена, позиция получает статус `needs_price`.
8. Запись, продажа и позиции сохраняются в Supabase Postgres.
9. Веб-панель показывает записи и отчёты за день, неделю, месяц или год.

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
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── tests/
```

## Установка

```bash
npm install
```

На Windows в PowerShell может быть заблокирован `npm.ps1`. В этом случае используйте `npm.cmd install`.

## Env-переменные

Скопируйте `.env.example` в `.env.local` и заполните значения:

```env
TELEGRAM_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=voice-records
STT_API_KEY=
STT_API_URL=
LLM_API_KEY=
LLM_API_URL=
LLM_MODEL=
DEFAULT_SHOP_NAME=Демо-магазин
```

`SUPABASE_SERVICE_ROLE_KEY` используется только серверным кодом бота и серверными действиями веб-панели. Его нельзя передавать в браузер.

## Запуск

```bash
npm run dev
npm run bot:dev
npm run web:dev
npm run lint
npm run test
npm run build
```

Отдельные команды:

- `npm run dev` — запускает бота и веб-панель одновременно.
- `npm run bot:dev` — запускает Telegram-бота.
- `npm run web:dev` — запускает веб-панель на `http://localhost:3000`.
- `npm run lint` — проверяет код ESLint.
- `npm run test` — запускает Vitest.
- `npm run build` — проверяет сборку workspaces.

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
