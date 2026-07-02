# Голосовой журнал продаж

Telegram bot + Telegram WebApp для магазина, где продавец надиктовывает продажи голосом, а система сохраняет распознанные товары, цены, количество и выручку в Supabase.

## Текущая модель продукта

```text
Продавец -> Telegram voice
  -> bot downloads audio
  -> audio is prepared for STT
  -> STT returns Russian transcript
  -> LLM/parser returns sale items
  -> Supabase saves voice_records, sales, sale_items
  -> Telegram sends success or review decision buttons
  -> WebApp shows report, records and sellers
```

Уверенная запись получает `processed`, сразу входит в выручку и получает обычный ответ бота без inline-кнопок.

Сомнительная запись получает `needs_review`, не входит в выручку и подтверждается Telegram inline-кнопками `✅ Подтвердить` / `❌ Отмена` либо вкладкой WebApp `Проверка`. В сообщении сомнительной записи нет кнопки `Открыть отчёт`.

Отмена переводит запись в `cancelled`, soft-delete active items и оставляет запись вне выручки. `failed` используется для voice pipeline failures и не входит в отчёт.

## WebApp

Нижняя навигация содержит четыре раздела:

- `Отчёт`;
- `Проверка`;
- `Записи`;
- `Продавцы`.

Экран `Отчёт` использует premium graphite dashboard и показывает:

- один заголовок `Сводка магазина`;
- название магазина и выбранный период;
- карточки `Выручка`, `Количество товаров`, `Записей`, `Нужно проверить`;
- компактную аналитику по дням с суммами;
- компактный выбор периода: сегодня, вчера, неделя, месяц, год, дата;
- топ товаров;
- продажи за период;
- блок `Нужно проверить`, если есть active `needs_review` данные, без смешивания с выручкой.

Экран `Проверка` показывает только active `needs_review` позиции. Каждая позиция остаётся отдельной карточкой, может быть отредактирована или исключена, а кнопки `Подтвердить`, `Отмена` и `Подтвердить всё` вызывают server actions для parent sale. Эти действия синхронизируются с теми же статусами и выручкой, что Telegram callback.

Экран `Записи` показывает voice-sale журнал: дата, продавец, распознанный текст, статус, сумма, аудио при наличии и раскрытие товаров. Для `needs_review` показывается бейдж `Нужно подтвердить в Telegram`.

Экран `Продавцы` показывает имя, активность, количество записей и выручку за выбранный период.

## Редактирование товаров

Карточка товара в WebApp имеет компактный обычный режим:

```text
Сникерс
5 шт × 100 ₽
500 ₽                         ✏️ 🗑
```

Карандаш открывает compact edit mode с полями `Товар`, `Количество`, `Цена, ₽`, кнопками `Сохранить` и `Отмена`.

Корзина открывает локальный confirm dialog `Удалить товар из отчёта?` с действиями `Удалить` и `Отмена`.

Сохранение и удаление выполняются через server actions, которые используют Supabase admin client, проверяют shop access через Telegram WebApp session и пересчитывают `sales.total_amount`.

## Выручка

В выручку входят только позиции, которые одновременно удовлетворяют условиям:

- родительская `sales.status = processed`;
- `sale_items.status = processed`;
- `sale_items.deleted_at is null`;
- `sale_items.price is not null`;
- `sale_items.total is not null`;
- количество и цена валидны.

Не входят:

- `needs_review`;
- `cancelled`;
- `failed`;
- `excluded`;
- soft-deleted rows;
- processed-looking items внутри `needs_review` sale.

## Telegram bot

Основные команды и сценарии:

- `/start` регистрирует или проверяет продавца, выдаёт WebApp кнопку отчёта и persistent menu button;
- voice message запускает pipeline распознавания;
- уверенная запись отвечает `✅ Запись сохранена: ...`;
- сомнительная запись отвечает `⚠️ Запись сохранена, но нужно подтвердить товары и цены. Распознано: ...`;
- `✅ Подтвердить` переводит sale/voice/items в `processed`;
- `❌ Отмена` переводит sale/voice в `cancelled` и soft-delete active items;
- webhook должен быть установлен с `allowed_updates: ["message", "callback_query"]`.

Callback data:

```text
confirm:<sale_id>
cancel:<sale_id>
```

Legacy callback prefix `voice_sale_review:` принимается для уже отправленных старых сообщений, но новые сообщения используют короткий формат.

## Diagnostics

Telegram diagnostics доступны только через `/debug-telegram` в development или при `DEBUG_TELEGRAM_WEBAPP=true` в production. Основной пользовательский сценарий не показывает диагностические кнопки.

## Команды

```bash
npm run lint
npm run test
npm run build
npm run web:build
```

В PowerShell на машине с заблокированным `npm.ps1` используйте `npm.cmd`:

```bash
npm.cmd run test
```

## Структура

- `apps/bot` - Telegram bot, voice pipeline, callback handlers.
- `apps/web` - Next.js WebApp, report, records, sellers, server actions.
- `packages/shared` - общие типы, parser/report utilities, date range.
- `supabase/migrations` - schema migrations.
- `docs/specs` - product/technical specs.
- `codex/skills/voice-sales-log/SKILL.md` - локальные правила работы агента с проектом.

## Документация

Перед изменениями читать:

- [AGENTS.md](./AGENTS.md)
- [docs/specs/product/telegram-confirmation-flow.md](./docs/specs/product/telegram-confirmation-flow.md)
- [docs/specs/product/webapp-report.md](./docs/specs/product/webapp-report.md)
- [docs/specs/product/sale-item-editing.md](./docs/specs/product/sale-item-editing.md)
- [docs/specs/technical/database.md](./docs/specs/technical/database.md)
- [docs/specs/technical/telegram-webhook.md](./docs/specs/technical/telegram-webhook.md)
- [docs/specs/technical/telegram-webapp-session.md](./docs/specs/technical/telegram-webapp-session.md)

## Product smoke

Проверять перед сдачей:

1. `Сникерс, 5 штук по 100 рублей` сохраняется как `processed`, входит в выручку и виден в WebApp.
2. Длинная сомнительная запись сохраняется как `needs_review`, не входит в выручку и получает только `✅ Подтвердить` / `❌ Отмена`.
3. `✅ Подтвердить` переводит запись в `processed`, добавляет товары в выручку и обновляет WebApp после refresh.
4. `❌ Отмена` переводит запись в `cancelled`, товары не входят в выручку.
5. `✏️` редактирует товар, сохраняет Supabase row, пересчитывает item total и report totals.
6. `🗑` soft-delete товар, он исчезает из active отчёта и не возвращается после reload.
