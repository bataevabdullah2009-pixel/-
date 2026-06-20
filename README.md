# Voice Sales Log

Voice Sales Log — MVP-продукт для магазина, который превращает голосовые сообщения продавцов в структурированный журнал продаж и отчёт владельца по выручке.

## Проблема и решение

Продавцу неудобно заполнять таблицу во время работы. Он произносит товар, количество и цену в Telegram, а система сама выполняет распознавание речи, извлекает позиции, сохраняет их и формирует отчёт. Неоднозначные записи не попадают в выручку до ручного исправления.

## Как работает

```text
Telegram voice
  → download/private storage
  → STT
  → LLM parser + deterministic evidence rules
  → transactional Supabase insert
  → owner report in Telegram Web App
```

Роли:

- `owner` — открывает Web App, видит только свой магазин, исправляет и исключает позиции;
- `seller` — отправляет голосовые продажи боту и должен быть активным в своём магазине;
- `system` — обрабатывает аудио, определяет статусы, сохраняет данные и пересчитывает отчёт.

Активный отчёт учитывает только `sale_items.status = processed` и `sale_items.deleted_at is null`. `shop_id` всегда определяется сервером по owner/seller, а не из клиентского запроса.

## Технологии

- Node.js 20.9+
- TypeScript, npm workspaces
- Telegraf
- Next.js App Router
- Supabase Postgres и Storage
- внешние STT и OpenAI-compatible LLM endpoints
- Vitest

## Локальный запуск

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Скопируйте `.env.example` в `.env.local` и заполните значения.
3. Примените Supabase migrations.
4. Создайте shop, owner и seller records с корректными Telegram id.
5. Запустите:

   ```bash
   npm run dev
   ```

Отдельно: `npm run bot:dev` и `npm run web:dev`.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Токен бота; также используется для HMAC initData. |
| `TELEGRAM_WEBHOOK_SECRET` | Secret header Telegram webhook. |
| `NEXT_PUBLIC_APP_URL` | Публичный HTTPS URL Web App. |
| `SUPABASE_URL` | URL проекта Supabase. |
| `SUPABASE_ANON_KEY` | Public key Supabase; не даёт анонимного чтения бизнес-таблиц. |
| `SUPABASE_SERVICE_ROLE_KEY` | Только server-side bot/Web App. |
| `SUPABASE_STORAGE_BUCKET` | Приватный bucket voice records. |
| `STT_API_KEY`, `STT_API_URL`, `STT_MODEL` | STT provider. |
| `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` | Parser provider. |
| `DEMO_MODE` | Явно включает демонстрационное поведение; default `false`. |
| `DEMO_OWNER_TELEGRAM_ID` | Owner для Web App в demo mode. |
| `DEFAULT_SHOP_NAME` | Имя demo shop, используется только при `DEMO_MODE=true`. |

Секреты не должны иметь префикс `NEXT_PUBLIC_` и не коммитятся.

## Supabase migrations

Supabase CLI можно вызвать установленной командой или через `npx`:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase migration list
```

Последняя migration добавляет/выравнивает soft-delete поля, `updated_at`, статус `excluded`, таблицу `owners`, server-only grants и транзакционную функцию `save_voice_sale`. Она не удаляет существующие продажи.

Пример назначения ролей после создания магазина:

```sql
insert into public.owners (shop_id, telegram_id, name)
values ('<shop-uuid>', <owner-telegram-id>, 'Владелец');

insert into public.sellers (shop_id, telegram_id, name)
values ('<shop-uuid>', <seller-telegram-id>, 'Продавец');
```

## Telegram webhook

После deploy задайте публичный URL и secret, затем выполните:

```bash
npm run telegram:set-webhook
npm run telegram:webhook-info
```

Webhook endpoint: `/api/telegram/webhook`. Mini App должен открывать тот же Vercel deployment, чтобы `/api/auth/telegram` мог принять и проверить `Telegram.WebApp.initData`.

## Vercel

Импортируйте корень монорепозитория, добавьте server-side env, примените migrations до deploy и установите webhook после получения HTTPS URL. Build command: `npm run build`.

## DEMO_MODE

Production использует `DEMO_MODE=false`: неизвестный продавец не создаётся, а Web App требует валидный initData активного owner.

При `DEMO_MODE=true` бот может создать неизвестного продавца в `DEFAULT_SHOP_NAME`. Web App использует `DEMO_OWNER_TELEGRAM_ID` либо первого активного owner этого demo shop; без Supabase env доступны локальные fixtures. Этот режим должен включаться осознанно и не используется для production data.

## Документация

Карта находится в [`docs/INDEX.md`](./docs/INDEX.md). Канонические спецификации — в `docs/specs`, функции — в `docs/features`, правила — в `docs/rules`, текущий план — в `docs/plans/active`.

## Команды контроля качества

```bash
npm run test
npm run build
```

Дополнительно доступен `npm run lint`.
