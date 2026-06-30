# Голосовой журнал продаж

«Голосовой журнал продаж» — MVP-продукт для малого бизнеса. Продавец диктует продажу в Telegram, бот распознаёт товар, количество и цену, сохраняет данные в Supabase, а владелец смотрит отчёт, записи и продавцов в мобильном WebApp.

## Как работает

```text
Telegram voice
  -> download/audio preparation
  -> STT
  -> LLM parser + deterministic evidence rules
  -> Supabase voice_records/sales/sale_items
  -> Telegram confirm/cancel for review sales
  -> Telegram Mini App или browser fallback
  -> отчёт, записи, продавцы, edit/delete товаров
```

Уверенная запись сразу получает `processed` и входит в выручку. Сомнительная запись получает `needs_review`, не входит в выручку и решается под сообщением бота кнопками `✅ Подтвердить` и `❌ Отмена`. Отмена переводит запись в `cancelled` и soft-delete её активные товары.

WebApp не подтверждает сомнительную voice-запись. Он показывает, что запись нужно подтвердить в Telegram, и остаётся панелью просмотра и управления товарами. Редактирование товара сохраняет поля; если родительская запись ещё `needs_review`, позиция не входит в выручку до Telegram confirm.

## Роли

- `seller` — отправляет voice-продажи и может подтвердить/отменить свою сомнительную запись в Telegram.
- `owner` — открывает WebApp, смотрит отчёт, записи, продавцов, редактирует и исключает товары.
- `system` — валидирует Telegram, сохраняет Supabase rows, пересчитывает отчёт и пишет безопасные logs.

## Статусы

- `processed` — запись подтверждена или уверенно распознана, входит в отчёт.
- `needs_review` — запись сохранена, но ждёт решения в Telegram.
- `cancelled` — пользователь отменил запись, она не входит в отчёт.
- `failed` — voice pipeline не смог завершить обработку.
- `sale_items.status = excluded` + `deleted_at` — товар исключён через soft delete.

## WebApp

Нижняя навигация:

- Отчёт.
- Записи.
- Продавцы.

Отчёт показывает четыре метрики: выручка, количество товаров, записи и «Нужно проверить». Ниже идут компактные фильтры периода, топ товаров, продажи за период и review-блок, если он есть.

Журнал записей показывает дату/время, продавца, распознанный текст, статус, сумму, кнопку прослушивания аудио и раскрытие «Товары».

Страница продавцов показывает активность, количество записей и выручку за выбранный период.

## Auth и безопасность

`shop_id` никогда не приходит от клиента. Сервер определяет магазин по валидному raw Telegram `initData` либо через явно включённый server-side fallback.

Telegram WebApp HMAC:

- использует `TELEGRAM_BOT_TOKEN`;
- исключает только `hash`;
- сохраняет `signature`;
- не использует `TELEGRAM_WEBHOOK_SECRET`.

`SUPABASE_SERVICE_ROLE_KEY` используется только сервером.

Production diagnostics доступны только при `DEBUG_TELEGRAM_WEBAPP=true`.

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

Отдельно доступны:

```bash
npm run bot:dev
npm run web:dev
```

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Токен бота и секрет HMAC для WebApp initData. |
| `TELEGRAM_WEBHOOK_SECRET` | Только secret header Telegram webhook. |
| `NEXT_PUBLIC_APP_URL` | Публичный HTTPS URL WebApp. |
| `PUBLIC_WEBHOOK_URL` | Необязательная отдельная база или полный URL webhook. |
| `SUPABASE_URL` | URL проекта Supabase. |
| `SUPABASE_ANON_KEY` | Public key Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Только server-side bot/WebApp. |
| `SUPABASE_STORAGE_BUCKET` | Приватный bucket voice records. |
| `STT_API_KEY`, `STT_API_URL`, `STT_MODEL` | STT provider. |
| `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` | Parser provider. |
| `DEMO_MODE` | Явно включает demo behavior для разработки. |
| `DEFAULT_SHOP_NAME` | Demo shop при `DEMO_MODE=true`. |
| `ALLOW_WEBAPP_FALLBACK` | Разрешает browser fallback. |
| `DEFAULT_SHOP_ID` | Shop id для fallback, только server-side. |
| `DEFAULT_SELLER_ID` | Seller id для fallback, только server-side. |
| `DEBUG_TELEGRAM_WEBAPP` | Включает diagnostics route и кнопку. |

## Supabase migrations

Migrations создают shops, sellers, owners, products, voice_records, sales, sale_items, audit_logs, Storage bucket, soft-delete поля и RPC `save_voice_sale`.

Актуальная схема допускает `cancelled` для `sales` и `voice_records`. Товары исключаются только через `sale_items.deleted_at`, не через физический delete.

## Проверка продукта

1. Уверенная запись: `Сникерс, 5 штук по 100 рублей`.
   - status `processed`;
   - входит в выручку;
   - видна в WebApp.
2. Сомнительная запись:
   - status `needs_review`;
   - не входит в выручку;
   - под сообщением есть только `✅ Подтвердить` и `❌ Отмена`.
3. Confirm:
   - sale становится `processed`;
   - товары входят в отчёт.
4. Cancel:
   - sale становится `cancelled`;
   - товары soft-deleted и не входят в отчёт.
5. Edit товара:
   - сохраняет `product_name`, `quantity`, `price`;
   - пересчитывает `total`;
   - processed sale пересчитывает выручку.
6. Delete товара:
   - soft-delete row;
   - после reload row не возвращается в active list.

## Качество

```bash
npm run lint
npm run test
npm run build
npm run web:build
```

Не заявляйте, что проект работает, если эти команды или внешние smoke checks не запускались.

## Документация

Карта находится в [`docs/INDEX.md`](./docs/INDEX.md).

Главный spec: [`docs/specs/global.md`](./docs/specs/global.md).

Ключевые specs:

- [`docs/specs/product/telegram-confirmation-flow.md`](./docs/specs/product/telegram-confirmation-flow.md);
- [`docs/specs/product/webapp-report.md`](./docs/specs/product/webapp-report.md);
- [`docs/specs/product/sale-item-editing.md`](./docs/specs/product/sale-item-editing.md);
- [`docs/specs/technical/database.md`](./docs/specs/technical/database.md);
- [`docs/specs/technical/webapp-api.md`](./docs/specs/technical/webapp-api.md);
- [`docs/specs/technical/telegram-webhook.md`](./docs/specs/technical/telegram-webhook.md);
- [`docs/specs/technical/telegram-webapp-session.md`](./docs/specs/technical/telegram-webapp-session.md).
