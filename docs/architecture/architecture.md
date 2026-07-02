# Architecture

## System boundary

`Голосовой журнал продаж` состоит из трёх основных частей:

1. Telegram bot in `apps/bot`.
2. Next.js Telegram WebApp in `apps/web`.
3. Supabase database/storage.

Shared business utilities находятся в `packages/shared`.

## High-level flow

```text
Telegram user
  -> bot webhook
  -> voice.handler
  -> Telegram file download
  -> audio conversion/preparation
  -> STT
  -> cleanup/parser
  -> records.service
  -> Supabase RPC save_voice_sale
  -> Telegram response
  -> WebApp report/review/records/sellers
```

## Bot modules

- `apps/bot/src/core/process-update.ts` registers handlers.
- `apps/bot/src/handlers/start.handler.ts` handles `/start`.
- `apps/bot/src/handlers/voice.handler.ts` owns voice pipeline orchestration.
- `apps/bot/src/handlers/review.handler.ts` owns Telegram callback decisions.
- `apps/bot/src/services/transcription.service.ts` calls STT.
- `apps/bot/src/services/cleanup-text.service.ts` calls parser/LLM and fallback.
- `apps/bot/src/services/records.service.ts` persists records and review decisions.
- `apps/bot/src/services/storage.service.ts` archives voice audio.
- `apps/bot/src/services/telegram.service.ts` creates Telegram keyboards/messages.

## Web modules

- `apps/web/src/app/daily-report/page.tsx` renders report.
- `apps/web/src/app/review/page.tsx` renders review queue and review decisions.
- `apps/web/src/app/review/actions.ts` owns WebApp confirm/cancel review actions.
- `apps/web/src/app/records/page.tsx` renders record journal.
- `apps/web/src/app/sellers/page.tsx` renders seller stats.
- `apps/web/src/app/daily-report/actions.ts` owns sale item update/delete/restore/reset actions.
- `apps/web/src/features/records/records.api.ts` reads reports and performs mutations.
- `apps/web/src/features/records/report-scope.ts` scopes sale_items through sales from current shop.
- `apps/web/src/components/SaleItemCard.tsx` owns compact item edit/delete UX.
- `apps/web/src/components/RecordCard.tsx` owns record display and Telegram review badge.
- `apps/web/src/components/MobileNavigation.tsx` owns four-tab mobile navigation.

## Data model

Main tables:

- `shops`;
- `sellers`;
- `voice_records`;
- `sales`;
- `sale_items`;
- `products`;
- `audit_logs`.

Audio lives in Supabase Storage bucket configured by `SUPABASE_STORAGE_BUCKET`.

## Status lifecycle

`sales` and `voice_records`:

- `processed`;
- `needs_review`;
- `cancelled`;
- `failed`.

`sale_items`:

- `processed`;
- `needs_review`;
- `needs_price` legacy;
- `failed`;
- `excluded`.

## Revenue boundary

Revenue is derived from scoped active rows only:

```text
sales.shop_id = current shop
sales.status = processed
sale_items.sale_id in scoped sales
sale_items.status = processed
sale_items.deleted_at is null
sale_items.total is not null
sale_items.quantity/weight is valid
sale_items.price is valid or derivable from total
```

`scopeReportRows` prevents cross-shop reads and downgrades items from `needs_review` sales to review state for report purposes.

`buildSalesReport` then aggregates only `processed` active items.

## Telegram review decision

```text
needs_review sale
  -> Telegram message with:
       ✅ Подтвердить
       ❌ Отмена
  -> callback:
       confirm:<sale_id>
       cancel:<sale_id>
  -> requireSeller resolves Telegram user
  -> records.service validates sale shop and seller
  -> mutation updates Supabase
```

Confirm:

- validates active items individually;
- requires meaningful product, quantity/weight and price-or-total for a confirmable item;
- sets valid items to `processed`;
- leaves incomplete active items as `needs_review`;
- fails only when there is no confirmable item;
- sets sale/voice to `processed`;
- recalculates total.

Cancel:

- sets sale/voice to `cancelled`;
- soft-delete active items;
- stores previous item status;
- total becomes zero.

## WebApp responsibility

WebApp responsibilities:

- show report;
- show review queue;
- confirm/cancel review sales through server actions;
- show records;
- show sellers;
- edit sale item fields;
- delete sale item from active report;
- display review/cancel/processed states consistently.

## Authentication and shop isolation

Telegram WebApp session:

- client receives Telegram initData;
- server verifies initData with bot token;
- server resolves owner/seller principal;
- session cookie stores derived context;
- mutations call `requireOwner()`;
- `shop_id` is never accepted from client form data as authority.

Bot callback:

- resolves seller by `ctx.from.id`;
- filters sale by `shop_id` and `seller_id`;
- does not trust callback data beyond sale id and action.

## Diagnostics

`/debug-telegram` is available only:

- in development;
- or in production when `DEBUG_TELEGRAM_WEBAPP=true`.

No diagnostics button is shown in the ordinary review-message. `/start` report keyboard can include diagnostics only behind the debug flag.

## Non-goals

- No rewrite of STT.
- No rewrite of parser.
- No database schema reset.
- No broad UI framework rewrite.

## Verification

Architecture-sensitive tests:

- `tests/stabilization.test.ts`;
- `tests/telegram-web-app.test.ts`;
- `tests/records.test.ts`;
- `tests/sale-parser.test.ts`;
- `tests/transcript.test.ts`.

Required commands:

```bash
npm run lint
npm run test
npm run build
npm run web:build
```
