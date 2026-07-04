# Архитектура

## Граница системы

`Голосовой журнал продаж` состоит из трёх основных частей:

1. Telegram-бот в `apps/bot`.
2. Next.js Telegram WebApp в `apps/web`.
3. База данных и хранилище Supabase.

Общие бизнес-утилиты находятся в `packages/shared`.

## Общий поток

```text
Пользователь Telegram
  -> webhook бота
  -> voice.handler
  -> скачивание файла Telegram
  -> конвертация/подготовка аудио
  -> STT
  -> очистка/парсер
  -> детерминированный резервный разбор доказательств
  -> records.service
  -> Supabase RPC save_voice_sale
  -> ответ Telegram
  -> отчёт/проверка/записи/продавцы WebApp
```

## Модули бота

- `apps/bot/src/core/process-update.ts` регистрирует обработчики.
- `apps/bot/src/handlers/start.handler.ts` обрабатывает `/start`.
- `apps/bot/src/handlers/voice.handler.ts` управляет оркестрацией голосового конвейера.
- `apps/bot/src/handlers/review.handler.ts` управляет решениями callback Telegram.
- `apps/bot/src/services/transcription.service.ts` вызывает STT.
- `apps/bot/src/services/cleanup-text.service.ts` вызывает парсер/LLM и резервный разбор.
- `apps/bot/src/services/records.service.ts` сохраняет записи и решения проверки.
- `apps/bot/src/services/storage.service.ts` архивирует голосовое аудио.
- `apps/bot/src/services/telegram.service.ts` создаёт клавиатуры/сообщения Telegram.

## Модули WebApp

- `apps/web/src/app/daily-report/page.tsx` рендерит отчёт.
- `apps/web/src/app/review/page.tsx` рендерит очередь проверки и решения проверки.
- `apps/web/src/app/review/actions.ts` управляет действиями подтверждения/отмены проверки в WebApp.
- `apps/web/src/app/records/page.tsx` рендерит журнал записей.
- `apps/web/src/app/sellers/page.tsx` рендерит статистику продавцов.
- `apps/web/src/app/daily-report/actions.ts` управляет действиями update/delete/restore/reset для позиций продажи.
- `apps/web/src/features/records/records.api.ts` читает отчёты и выполняет мутации.
- `apps/web/src/features/records/report-scope.ts` ограничивает `sale_items` через продажи текущего магазина.
- `apps/web/src/components/SaleItemCard.tsx` управляет компактным UX редактирования/удаления позиции.
- `apps/web/src/components/RecordCard.tsx` управляет отображением записи и бейджем проверки Telegram.
- `apps/web/src/components/MobileNavigation.tsx` управляет мобильной навигацией с четырьмя вкладками.

## Модель данных

Основные таблицы:

- `shops`;
- `sellers`;
- `voice_records`;
- `sales`;
- `sale_items`;
- `products`;
- `audit_logs`.

Аудио хранится в bucket Supabase Storage, настроенном через `SUPABASE_STORAGE_BUCKET`.

## Жизненный цикл статусов

`sales` and `voice_records`:

- `processed`;
- `needs_review`;
- `cancelled`;
- `failed`.

`sale_items`:

- `processed`;
- `needs_review`;
- `needs_price` устаревший;
- `failed`;
- `excluded`.

## Граница выручки

Выручка выводится только из активных строк в области текущего магазина:

```text
sales.shop_id = current shop
sales.status is not cancelled/failed
sale_items.sale_id in scoped sales
sale_items.status = processed
sale_items.deleted_at is null
sale_items.total is not null
sale_items.quantity/weight is valid
sale_items.price is valid or derivable from total
```

`scopeReportRows` предотвращает чтение между магазинами, исключает родительские продажи `cancelled`/`failed` и оставляет статус позиции источником истины для выручки. Продажа `needs_review` может давать выручку через активные позиции `processed`, пока неполные позиции остаются на проверке.

`buildSalesReport` затем агрегирует только активные позиции `processed`.

## Граница резервного парсера

`packages/shared/utils/sale-parser.ts` - детерминированная защита между выводом LLM и сохранением:

- проверяет доказательства количества/цены по STT-расшифровке;
- разделяет склеенный вывод парсера на отдельные `sale_items`;
- обрабатывает запятую после названия товара, точку, новую строку, союзы и соседние товары;
- поддерживает `шт`, `кг`, `г`, бутылки как штуки и голое `5 по 100`;
- сохраняет неполные остатки как отдельные позиции на проверку вместо склейки с валидным товаром.

## Решение проверки в Telegram

```text
продажа needs_review
  -> сообщение Telegram с:
       ✅ Подтвердить
       ❌ Отмена
  -> callback:
       confirm:<sale_id>
       cancel:<sale_id>
  -> requireSeller определяет пользователя Telegram
  -> records.service проверяет магазин и продавца продажи
  -> мутация обновляет Supabase
```

Подтверждение:

- проверяет активные позиции по отдельности;
- требует осмысленный товар, количество/вес и цену или сумму для подтверждаемой позиции;
- ставит валидные позиции в `processed`;
- оставляет неполные активные позиции как `needs_review`;
- падает только когда нет ни одной подтверждаемой позиции;
- ставит продажу/голосовую запись в `processed`;
- пересчитывает сумму.

Отмена:

- ставит продажу/голосовую запись в `cancelled`;
- мягко удаляет активные позиции;
- сохраняет предыдущий статус позиции;
- сумма становится нулевой.

## Ответственность WebApp

Ответственности WebApp:

- показывать отчёт;
- показывать очередь проверки;
- подтверждать/отменять продажи на проверке через серверные действия;
- показывать записи;
- показывать продавцов;
- редактировать поля позиции продажи;
- удалять позицию продажи из активного отчёта;
- единообразно отображать состояния проверки/отмены/обработки.

## Аутентификация и изоляция магазина

Сессия Telegram WebApp:

- клиент получает Telegram initData;
- сервер проверяет initData токеном бота;
- сервер определяет principal владельца/продавца;
- session cookie хранит выведенный контекст;
- мутации вызывают `requireOwner()`;
- `shop_id` никогда не принимается из данных клиентской формы как источник правды.

Callback бота:

- определяет продавца по `ctx.from.id`;
- фильтрует продажу по `shop_id` и `seller_id`;
- не доверяет данным callback сверх id продажи и действия.

## Диагностика

`/debug-telegram` is available only:

- в разработке;
- или в production при `DEBUG_TELEGRAM_WEBAPP=true`.

В обычном сообщении проверки диагностическая кнопка не показывается. Клавиатура отчёта `/start` может включать диагностику только за debug-флагом.

## Не цели

- Не переписывать STT.
- Не переписывать парсер.
- Не сбрасывать схему базы данных.
- Не делать широкое переписывание UI-фреймворка.

## Проверка

Архитектурно чувствительные тесты:

- `tests/stabilization.test.ts`;
- `tests/telegram-web-app.test.ts`;
- `tests/records.test.ts`;
- `tests/sale-parser.test.ts`;
- `tests/transcript.test.ts`.

Обязательные команды:

```bash
npm run lint
npm run test
npm run build
npm run web:build
```
