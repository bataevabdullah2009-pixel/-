# Voice Sales Log

Voice Sales Log — MVP-продукт для магазина, который превращает голосовые сообщения продавцов в структурированный журнал продаж и отчёт владельца по выручке.

## Проблема и решение

Продавцу неудобно заполнять таблицу во время работы. Он произносит товар, количество и цену в Telegram, а система выполняет распознавание речи, извлекает позиции и сохраняет их. Каждая новая запись попадает в «Нужно проверить» и включается в выручку только после ручного подтверждения.

## Как работает

```text
Telegram voice
  → download/audio preparation
  → STT
  → LLM parser + deterministic evidence rules
  → Supabase insert (RPC, с совместимым fallback на время rollout migration)
  → обязательная проверка и подтверждение в Telegram Mini App
  → owner report
```

Роли:

- `owner` — открывает Mini App, видит только свой магазин, исправляет, подтверждает и исключает позиции;
- `seller` — отправляет голосовые продажи боту, может проверять доступные ему записи и должен быть активным в своём магазине;
- `system` — обрабатывает аудио, определяет статусы, сохраняет данные и пересчитывает отчёт.

Новая voice-продажа сохраняется со статусом проверки. Сохранение правок не подтверждает позицию автоматически; отдельное подтверждение переводит её во внутренний `processed`, который в UI называется «Подтверждено». Активный отчёт учитывает только `sale_items.status = processed` и `sale_items.deleted_at is null`. `shop_id` всегда определяется сервером по owner/seller, а не из клиентского запроса.

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
3. Примените Supabase migrations. Код умеет пережить отсутствие `save_voice_sale` во время rollout, но migration остаётся обязательной для целевой схемы.
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
| `PUBLIC_WEBHOOK_URL` | Необязательная отдельная HTTPS база или полный URL webhook; иначе используется `NEXT_PUBLIC_APP_URL`. |
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

Webhook endpoint: `/api/telegram/webhook`. `/start` отправляет новую reply-кнопку и inline-кнопку «Открыть отчёт», а также задаёт `MenuButtonWebApp`; все они имеют тип `web_app` и используют один `NEXT_PUBLIC_APP_URL`. После успешной продажи бот снова отправляет inline Web App button. `/start` также даёт Web App button «Диагностика Telegram» на `/debug-telegram`. Обычная URL-кнопка не используется.

Next.js загружает официальный `telegram-web-app.js` до hydration. Корневая страница сразу рендерит отчёт без server redirect, чтобы Telegram launch-параметры не терялись до запуска SDK. Client bootstrap после hydration ждёт `window.Telegram.WebApp`, вызывает `ready()` и `expand()`, а общий `apiFetch()` добавляет `Telegram.WebApp.initData` в header `x-telegram-init-data` каждого явного browser API fetch. Server Components и Server Actions повторно проверяют HttpOnly cookie. В логах и на debug-экране выводятся только признаки наличия SDK, длина initData, platform и version; само initData не логируется.

`POST /api/auth/telegram` валидирует HMAC и срок initData, находит owner/seller по Telegram id, отдельно запрещает неактивную привязку, проверяет существование магазина и устанавливает HttpOnly cookie. Server Components и Server Actions повторно валидируют cookie. `shop_id` всегда берётся из БД и не принимается из query, form или JSON клиента. Ошибки API имеют коды `TELEGRAM_INIT_DATA_MISSING`, `TELEGRAM_INIT_DATA_INVALID`, `SELLER_NOT_LINKED`, `SELLER_INACTIVE` и `SHOP_NOT_FOUND`. Безопасный server log содержит только наличие/длину initData, наличие Telegram user, результат lookup и `shop_id`.

## Проверка продажи

1. Бот сохраняет voice record, sale и распознанные позиции без изменения STT/LLM pipeline.
2. Все новые позиции отображаются в «Нужно проверить»; позиции без цены остаются отдельно отмечены как требующие проверки цены.
3. Пользователь меняет товар, количество или цену и нажимает «Сохранить».
4. Пользователь нажимает «Подтвердить позицию». После подтверждения всех активных позиций запись показывается как «Подтверждено» и участвует в выручке.
5. «Исключить из отчёта» выполняет soft delete; исключённые позиции не участвуют в количестве и выручке и могут быть восстановлены.

`telegram:webhook-info` показывает `current_webhook_url`, `pending_update_count`, `last_error`, `allowed_updates`, настроенный Web App URL, ожидаемый webhook URL и результат их сравнения. Команда завершается ошибкой, если webhook не совпадает с конфигурацией. `NEXT_PUBLIC_APP_URL` должен быть каноническим production HTTPS-доменом; localhost, ngrok, deployment preview и git-branch Vercel URL запрещены.

До появления отдельной строки `owners` сервер сохраняет совместимость с существующим MVP: после проверки initData активная запись `sellers` с тем же Telegram id определяет тот же `shop_id`. Клиентский `shop_id` не принимается ни в одном варианте.

## Vercel

Импортируйте корень монорепозитория, добавьте server-side env, примените migrations до deploy и установите webhook после получения HTTPS URL. Build command: `npm run build`.

## DEMO_MODE

Production использует `DEMO_MODE=false`: неизвестный продавец не создаётся, а Web App требует валидный initData активного owner либо существующей активной Telegram-to-shop записи seller периода миграции.

При `DEMO_MODE=true` бот может создать неизвестного продавца в `DEFAULT_SHOP_NAME`. Web App использует `DEMO_OWNER_TELEGRAM_ID` либо первого активного owner этого demo shop; без Supabase env доступны локальные fixtures. Этот режим должен включаться осознанно и не используется для production data.

## Документация

Карта находится в [`docs/INDEX.md`](./docs/INDEX.md). Канонические спецификации — в `docs/specs`, функции — в `docs/features`, правила — в `docs/rules`, текущий план — в `docs/plans/active`.

## Команды контроля качества

```bash
npm run test
npm run build
```

Дополнительно доступен `npm run lint`.
