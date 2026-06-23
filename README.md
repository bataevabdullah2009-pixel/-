# Voice Sales Log

Voice Sales Log — MVP-продукт для малого бизнеса: продавец диктует продажу в Telegram, система распознаёт товар, количество и цену, сохраняет запись в Supabase и показывает владельцу отчёт по выручке.

## Как работает

```text
Telegram voice
  -> download/audio preparation
  -> STT
  -> LLM parser + deterministic evidence rules
  -> Supabase sale/voice_records/sale_items
  -> Telegram Mini App или browser fallback
  -> отчёт, записи, продавцы и корректировка товаров
```

Если распознаны товар, количество, цена и `confidence >= 0.80`, позиция сразу получает внутренний статус `processed`, показывается как «Готово» и входит в отчёт. Если нет цены/количества, confidence ниже порога, текст странный или часть позиций неполная, такие позиции показываются как «Нужно проверить» и не входят в выручку до исправления. Исключённые позиции показываются как «Исключено» и не учитываются.

`shop_id` никогда не приходит от клиента. Сервер определяет магазин по Telegram initData либо по server-side fallback env.

## Роли

- `seller` — отправляет голосовые продажи в Telegram и должен быть активным в своём магазине.
- `owner` — открывает Mini App, смотрит отчёт, записи и продавцов, исправляет, сохраняет, исключает и восстанавливает позиции.
- `system` — обрабатывает аудио, определяет статусы, сохраняет данные и пересчитывает отчёт.

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

Отдельно доступны `npm run bot:dev` и `npm run web:dev`.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Токен бота; используется также для HMAC проверки Telegram initData. |
| `TELEGRAM_WEBHOOK_SECRET` | Secret header Telegram webhook. |
| `NEXT_PUBLIC_APP_URL` | Публичный HTTPS URL Web App. |
| `PUBLIC_WEBHOOK_URL` | Необязательная отдельная HTTPS база или полный URL webhook; иначе используется `NEXT_PUBLIC_APP_URL`. |
| `SUPABASE_URL` | URL проекта Supabase. |
| `SUPABASE_ANON_KEY` | Public key Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Только server-side bot/Web App. |
| `SUPABASE_STORAGE_BUCKET` | Приватный bucket voice records. |
| `STT_API_KEY`, `STT_API_URL`, `STT_MODEL` | STT provider. |
| `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` | Parser provider. |
| `DEMO_MODE` | Явно включает demo behavior для локальной разработки. |
| `DEMO_OWNER_TELEGRAM_ID` | Owner для demo mode. |
| `DEFAULT_SHOP_NAME` | Имя demo shop при `DEMO_MODE=true`. |
| `ALLOW_WEBAPP_FALLBACK` | Если `true`, Mini App может открыться без Telegram initData. |
| `DEFAULT_SHOP_ID` | Shop id для browser fallback; читается только сервером. |
| `DEFAULT_SELLER_ID` | Seller id для browser fallback; читается только сервером. |

Секреты не должны иметь префикс `NEXT_PUBLIC_` и не коммитятся.

## Web App auth

Mini App работает в трёх режимах:

- Telegram mode: клиент видит `window.Telegram.WebApp.initData`, `apiFetch` отправляет `x-telegram-init-data` и `x-app-mode: telegram`, сервер проверяет HMAC и находит owner/seller в БД.
- Browser fallback mode: initData нет, `apiFetch` отправляет `x-app-mode: fallback`, сервер использует `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID`, если `ALLOW_WEBAPP_FALLBACK=true`.
- Error mode: UI показывает ошибку только для реальных проблем сервера, БД или конфигурации. Отсутствие initData само по себе не заменяет интерфейс красной блокировкой.

`/debug-telegram` остаётся безопасной диагностикой SDK/initData и не является обязательным шагом для открытия отчёта.

## Supabase migrations

Migrations создают shops, sellers, products, voice_records, sales, sale_items, audit_logs, soft-delete поля `sale_items.deleted_at`, `deleted_reason`, `deleted_previous_status`, `updated_at`, таблицу `owners` и функцию `save_voice_sale`. Исключение товара использует `deleted_at = now()`, восстановление — `deleted_at = null`.

Пример назначения ролей:

```sql
insert into public.owners (shop_id, telegram_id, name)
values ('<shop-uuid>', <owner-telegram-id>, 'Владелец');

insert into public.sellers (shop_id, telegram_id, name)
values ('<shop-uuid>', <seller-telegram-id>, 'Продавец');
```

## Telegram webhook

Webhook endpoint: `/api/telegram/webhook`. После deploy задайте публичный URL и secret, затем выполните:

```bash
npm run telegram:set-webhook
npm run telegram:webhook-info
```

`/start` отправляет reply и inline `web_app` кнопки «Открыть отчёт», задаёт `MenuButtonWebApp` и даёт кнопку «Диагностика Telegram» на `/debug-telegram`.

## Проверка продажи

1. Бот сохраняет voice record, sale и распознанные позиции.
2. Полная уверенная позиция сразу видна в отчёте как «Готово».
3. Неполная позиция попадает в «Нужно проверить».
4. Владелец меняет товар, количество или цену и нажимает «Сохранить»; валидная позиция сразу пересчитывает отчёт.
5. «Исключить из отчёта» выполняет soft delete; исключённые позиции можно восстановить.

## Качество

```bash
npm run lint
npm run test
npm run build
```

Не заявляйте, что проект работает, если эти команды или внешние smoke checks не запускались.

## Документация

Карта находится в [`docs/INDEX.md`](./docs/INDEX.md). Канонические спецификации — в `docs/specs`, функции — в `docs/features`, правила — в `docs/rules`, планы — в `docs/plans`.
