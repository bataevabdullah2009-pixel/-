---
name: voice-sales-log
description: Work on Telegram bot + WebApp "Голосовой журнал продаж" without breaking voice pipeline, Supabase revenue rules, Telegram confirmation flow, or product documentation.
---

# Voice Sales Log Skill

Use this skill for any change in this repository.

## Product

`Голосовой журнал продаж` is a Telegram bot and Telegram WebApp for a shop. Sellers record sales by voice. The bot recognizes products, quantities and prices. Supabase stores the data. WebApp shows report, records and sellers.

## Read first

Before code changes, read:

- `AGENTS.md`
- `README.md`
- `docs/specs/product/telegram-confirmation-flow.md`
- `docs/specs/product/webapp-report.md`
- `docs/specs/product/sale-item-editing.md`
- `docs/specs/technical/database.md`
- `docs/specs/technical/telegram-webhook.md`
- `docs/specs/technical/telegram-webapp-session.md`

## Do not break voice pipeline

Do not rewrite these areas unless the task explicitly requires it:

- STT call;
- parser prompt/schema;
- Telegram webhook route;
- voice audio persistence;
- `saveVoiceSale` RPC payload;
- failure persistence.

Audio upload may fail without blocking sale persistence.

## Status model

`sales` and `voice_records`:

- `processed` - confirmed and counted.
- `needs_review` - saved but not counted.
- `cancelled` - user cancelled, not counted.
- `failed` - processing failed, not counted.

`sale_items`:

- `processed` - can count only if parent sale is also `processed`.
- `needs_review` - not counted.
- `needs_price` - legacy review state, not counted.
- `failed` - not counted.
- `excluded` - soft-deleted, not counted.

## Telegram confirmation flow

Review voice-message must contain only:

- `✅ Подтвердить`;
- `❌ Отмена`.

Do not add `Открыть отчёт` to the review-message.

Allowed report access:

- `/start` inline/reply keyboard;
- menu button;
- normal WebApp navigation.

Callback data:

```text
confirm:<sale_id>
cancel:<sale_id>
```

Legacy `voice_sale_review:<action>:<sale_id>` may be accepted for old messages.

## WebApp rules

Navigation:

- `Отчёт`;
- `Проверка`;
- `Записи`;
- `Продавцы`.

WebApp `/review` shows active `needs_review` items and may confirm/cancel the parent review sale through server actions. Telegram inline callbacks remain the primary review path and must stay functional.

Sale item card:

- normal view shows product, quantity, unit price, total;
- `✏️` opens compact edit mode;
- `🗑` opens delete confirmation;
- no permanent large buttons;
- no `Подтвердить позицию`;
- no text link `Исключить из отчёта`.

## Revenue rules

Count only:

- parent sale `processed`;
- item `processed`;
- `deleted_at is null`;
- valid price;
- valid total;
- valid quantity.

Never count:

- parent sale `needs_review`;
- parent sale `cancelled`;
- parent sale `failed`;
- item `needs_review`;
- item `needs_price`;
- item `excluded`;
- deleted rows.

## Documentation

After code changes update relevant docs. After DB changes update migrations and `docs/specs/technical/database.md`. After UI changes update product specs. After Telegram flow changes update Telegram specs.
After every code change, update docs, specs, plans and changelog so they match the actual code. Do not leave stale documents that contradict implementation.

## Verification

Run:

```bash
npm run lint
npm run test
npm run build
npm run web:build
```

Use `npm.cmd` on PowerShell if `npm.ps1` is blocked.
