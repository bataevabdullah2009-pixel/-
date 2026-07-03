# AGENTS.md

## Краткое описание

`Голосовой журнал продаж` - коммерческий Telegram bot + Telegram WebApp для магазина. Продавец отправляет voice message, бот распознаёт продажу, сохраняет данные в Supabase, а WebApp показывает отчёт, записи и продавцов.

Основной результат продукта - корректная выручка. Все изменения должны защищать voice pipeline, статусы и расчёт отчёта.

## Обязательные specs перед работой

Перед изменениями читать:

- `README.md` - текущий пользовательский сценарий.
- `docs/specs/product/telegram-confirmation-flow.md` - Telegram confirm/cancel.
- `docs/specs/product/webapp-report.md` - WebApp отчёт, записи, продавцы.
- `docs/specs/product/sale-item-editing.md` - edit/delete товара.
- `docs/specs/technical/database.md` - таблицы, статусы, soft delete.
- `docs/specs/technical/telegram-webhook.md` - webhook и bot handlers.
- `docs/specs/technical/telegram-webapp-session.md` - WebApp auth/session.
- `docs/specs/technical/testing-strategy.md` - что обязательно проверять.

Если меняется отдельная область, читать её профильный spec до кода.

## Правила voice pipeline

- Не переписывать STT, parser, webhook и persistence голосовых без прямой необходимости.
- Не менять `transcription.service.ts`, `cleanup-text.service.ts`, `voice.handler.ts` и `saveVoiceSale` ради UI-задач.
- Любая ошибка pipeline должна сохранять диагностируемое состояние, а не терять запись молча.
- Уверенная запись должна оставаться `processed`.
- Сомнительная запись должна оставаться `needs_review` до Telegram или WebApp review decision.
- Deterministic parser fallback обязан разделять glued transcript на отдельные `sale_items`, включая случай запятой между названием и количеством: `Сникерс, 3 штуки по 200 рублей`.
- Если fallback нашёл валидную позицию и неполный хвост, валидная позиция сохраняется отдельно, а неполная остаётся `needs_review`.
- `failed` не должен попадать в выручку.
- Audio upload не должен блокировать сохранение продажи.

## Правила Telegram flow

- Сомнительное распознавание получает только две inline-кнопки:
  - `✅ Подтвердить`;
  - `❌ Отмена`.
- Не добавлять `Открыть отчёт` в сообщение сомнительной записи.
- `Открыть отчёт` может быть в `/start`, reply keyboard или menu button.
- Новые callback data:
  - `confirm:<sale_id>`;
  - `cancel:<sale_id>`.
- Legacy `voice_sale_review:<action>:<sale_id>` можно принимать для старых сообщений.
- Callback должен быть идемпотентным: повторное нажатие не ломает данные.
- `confirm` переводит sale/voice и валидные active items в `processed`.
- Если active items смешанные, валидные позиции подтверждаются и входят в выручку, а неполные остаются `needs_review` и не блокируют всю корзину.
- Если нет ни одной валидной позиции, confirm запрещён с сообщением `Не удалось подтвердить: нет ни одной полной позиции.`
- Успешный confirm отвечает `✅ Подтверждено: N позиций, сумма X ₽`.
- `cancel` переводит sale/voice в `cancelled` и soft-delete active items.
- После изменения Telegram flow обновлять product и technical telegram specs.

## Правила WebApp

- WebApp - панель управления и просмотра продаж, записей, проверки и продавцов.
- Нижняя навигация: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- Пользовательская вкладка `/review` показывает только active `needs_review` позиции.
- `/review` может подтверждать или отменять review sale через server actions, которые используют те же статусы и правила выручки, что Telegram callback.
- `needs_review` в WebApp показывать как `Нужно проверить`.
- Карточки товаров должны быть компактными.
- Не добавлять постоянные большие кнопки под товаром.
- Не возвращать `Подтвердить позицию`.
- Не возвращать текстовую ссылку `Исключить из отчёта`.
- Edit открывается только по `✏️`.
- Сохранение edit с товаром, количеством и ценой обновляет реальную строку `sale_items`, пересчитывает `total`, ставит item `processed` и убирает ошибку цены.
- Если parent sale ещё `needs_review`, такой item всё равно не входит в выручку до отдельного Telegram/WebApp confirm, потому что report требует parent sale `processed`.
- Delete открывается только по `🗑` и требует confirm dialog.
- После изменения UI обновлять product specs и, если нужно, screenshots/manual smoke notes.

## Правила Supabase

- Browser client не должен получать service role key.
- WebApp mutations идут через server actions и Supabase admin client.
- Shop access берётся из Telegram WebApp session через server-side owner/seller resolution.
- Не принимать `shop_id` от клиента как источник правды.
- Update/delete должны проверять, что изменена нужная строка.
- Soft delete использует `sale_items.deleted_at`, `deleted_reason`, `deleted_previous_status`.
- Если код использует новое поле БД, должна быть миграция и database spec.
- После изменения БД обновлять `docs/specs/technical/database.md` и migrations.

## Статусы

`sales.status` и `voice_records.status`:

- `processed` - запись подтверждена и входит в выручку.
- `needs_review` - запись сохранена, но не входит в выручку до confirm.
- `cancelled` - пользователь отменил запись, она не входит в выручку.
- `failed` - voice processing failure.

`sale_items.status`:

- `processed` - active item может входить в выручку, если parent sale тоже `processed`.
- `needs_review` - active item не входит в выручку.
- `needs_price` - legacy review-like state, не использовать для новых неполных items.
- `failed` - item не входит в выручку.
- `excluded` - soft-deleted item, не входит в active report.

## Выручка

В выручку входят только:

- parent sale `processed`;
- item `processed`;
- `deleted_at is null`;
- валидные `quantity`/вес и `total`;
- валидный `price` или возможность вывести unit price из `total / quantity`.

Не входят:

- parent sale `needs_review`;
- parent sale `cancelled`;
- parent sale `failed`;
- item `needs_review`;
- item `needs_price`;
- item `excluded`;
- any item with `deleted_at`.

## Документация

- После изменения кода обновлять документацию.
- После каждого изменения кода агент обязан обновлять документацию, changelog, активные планы и технические спецификации так, чтобы они соответствовали фактическому состоянию проекта. Запрещено оставлять документацию, противоречащую текущему коду.
- После каждого изменения кода агент обязан обновить документацию, спеки, планы и changelog под фактическое состояние проекта. Запрещено оставлять устаревшие документы, которые противоречат коду.
- После изменения UI обновлять product specs.
- После изменения Telegram flow обновлять Telegram product и technical specs.
- После изменения БД обновлять database spec и migrations.
- Не оставлять specs, которые обещают несуществующий UI/API.
- Не использовать формулировки, которые описывают продукт как некоммерческий, временный или тренировочный.
- Документация должна описывать реальную систему.

## Рефакторинг

- Не делать хаотичный крупный рефакторинг.
- Держать изменения в границах задачи.
- Сначала понять текущие тесты и контракты.
- Не удалять рабочий fallback/legacy код без проверки миграционного эффекта.
- Не менять voice pipeline ради визуального polish.

## Проверки после работы

Запускать:

```bash
npm run lint
npm run test
npm run build
npm run web:build
```

В PowerShell, если `npm.ps1` заблокирован, запускать через `npm.cmd`.

Нельзя писать, что работа готова, если проверки не запускались или остались нерешённые ошибки.
