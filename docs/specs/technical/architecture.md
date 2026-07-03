# Техническая архитектура

Статус: реализовано в монорепозитории npm workspaces.

## Workspaces

1. `apps/bot` - Telegraf bot, voice pipeline, Telegram callback handlers.
2. `apps/web` - Next.js App Router WebApp, route handlers, Server Actions.
3. `packages/shared` - типы, Zod schemas, parser evidence rules, date/report utilities.
4. `supabase/migrations` - Postgres schema, RLS/grants, RPC, soft delete.
5. `docs` - product, technical, data, feature and rule documentation.
6. `scripts` - webhook setup and webhook info commands.

## Runtime overview

```text
Telegram voice
  -> webhook route
  -> Telegraf update processor
  -> voice handler
  -> audio download
  -> audio preparation
  -> STT
  -> LLM cleanup/parser
  -> deterministic evidence layer
  -> Supabase RPC save_voice_sale
  -> read-back verification
  -> Telegram reply
  -> WebApp report/review/records/sellers
```

## Telegram webhook boundary

`apps/web/src/app/api/telegram/webhook/route.ts`:

1. Runs in Node.js runtime.
2. Reads `x-telegram-bot-api-secret-token`.
3. Compares secret constant-time.
4. Parses update JSON.
5. Logs safe update metadata.
6. Calls `processTelegramUpdate(update)`.
7. Returns `{ ok: true }` or `{ ok: false }`.

The route must receive both `message` and `callback_query` updates.

## Bot module

`apps/bot/src/core/process-update.ts` creates one shared Telegraf instance:

1. Loads env through `getEnv()`.
2. Creates bot with `TELEGRAM_BOT_TOKEN`.
3. Registers `/start`.
4. Registers review callback handler.
5. Registers voice handler.
6. Registers text handler.
7. Registers catch handler.

The bot can run behind Vercel webhook through the web app route.

## Voice pipeline

`apps/bot/src/handlers/voice.handler.ts`:

1. Validates Telegram user id.
2. Resolves seller.
3. Sends "Голосовое получено, обрабатываю."
4. Downloads Telegram file.
5. Converts audio to mp3 when ffmpeg is available.
6. Falls back to original OGG when conversion is unavailable or fails.
7. Uploads original audio best-effort.
8. Calls STT.
9. Logs raw transcript through audit log best-effort.
10. Calls cleanup LLM.
11. Calls parser LLM.
12. Applies deterministic transcript evidence.
13. Saves sale through service layer.
14. Replies success or review message.

Pipeline failures are staged with `VoiceFailureStage` so errors can be diagnosed.

## Parser boundary

`packages/shared/utils/sale-parser.ts` is the deterministic guard between LLM output and persistence.

It handles:

1. Number words.
2. Decimal comma.
3. Units `шт`, `кг`, `г`.
4. Bottle forms normalized to `шт`.
5. Bare quantity before price: `5 по 100`.
6. Price markers `руб`, `рублей`, `₽`.
7. Multi-item split by sentence/segment evidence.
8. Glued single-item LLM output.
9. Incomplete leftovers.
10. Confidence downgrade for incomplete items.

Parser output then goes through `normalizeSaleItemFields()`.

## Persistence boundary

`apps/bot/src/services/records.service.ts`:

1. Creates Supabase service role client server-side.
2. Resolves seller and shop.
3. Normalizes products and units.
4. Resolves optional product catalog match.
5. Builds RPC payload.
6. Calls `save_voice_sale`.
7. Verifies returned identifiers.
8. Reads sale back.
9. Reads item count back.
10. Throws if persisted count mismatches expected count.

False success is not allowed. If persistence fails, user sees save failure message.

## Supabase schema

Core tables:

1. `shops`.
2. `owners`.
3. `sellers`.
4. `products`.
5. `voice_records`.
6. `sales`.
7. `sale_items`.
8. `audit_logs`.

Storage:

1. Bucket `voice-records`.
2. Audio upload best-effort.
3. Signed URLs are created server-side for records journal.

RPC:

1. `save_voice_sale`.
2. `security invoker`.
3. Checks active seller belongs to shop.
4. Inserts voice, sale and items.
5. Execute granted only to service role.

## Status model

Parent statuses:

1. `pending`.
2. `processed`.
3. `needs_review`.
4. `cancelled`.
5. `failed`.

Item statuses:

1. `processed`.
2. `needs_review`.
3. `needs_price` legacy.
4. `failed`.
5. `excluded`.

Revenue is controlled primarily by item status plus parent sale exclusion for `cancelled` and `failed`.

## WebApp architecture

`apps/web` uses Server Components for data loading:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.
5. `/debug-telegram`.

Client components are used for:

1. Telegram auth bootstrap.
2. Sale item card edit/delete UI state.
3. Refresh button.
4. Confirm submit button.
5. Diagnostics component.

Client components do not hold trusted shop authority.

## WebApp auth

`resolveRequestContext()` sources:

1. Header raw initData.
2. HttpOnly cookie with raw initData.
3. Explicit fallback env.
4. Demo mode.

Telegram mode:

1. Verify HMAC with bot token.
2. Verify auth date freshness.
3. Resolve seller first.
4. Resolve owner if seller missing.
5. Owner can create seller binding in same shop.
6. Return `OwnerContext`.

Fallback mode:

1. Requires `ALLOW_WEBAPP_FALLBACK=true`.
2. Requires `DEFAULT_SHOP_ID`.
3. Requires `DEFAULT_SELLER_ID`.
4. Loads seller server-side.
5. Checks active seller.
6. Checks seller shop matches fallback shop.

## Report calculation

`getReport(filters)`:

1. Computes date range in `Europe/Moscow`.
2. Resolves owner context.
3. Reads sales by shop and period.
4. Reads items by sale ids.
5. Scopes rows through `scopeReportRows()`.
6. Excludes parent `cancelled` and `failed`.
7. Keeps parent `needs_review` items so processed siblings can count.
8. Partitions active/deleted items.
9. Builds summary through `buildSalesReport()`.

## Mutations

WebApp mutations are Server Actions and service functions:

1. `updateSaleItem`.
2. `excludeSaleItem`.
3. `restoreSaleItem`.
4. `resetDay`.
5. `confirmReviewSale`.
6. `cancelReviewSale`.

Every mutation:

1. Resolves current shop.
2. Reads parent row.
3. Checks shop access.
4. Mutates with admin client.
5. Checks affected row when needed.
6. Recalculates sale.
7. Revalidates affected routes.

## Review confirm/cancel

Telegram and WebApp share the same domain rules:

1. Already processed -> unchanged success.
2. Already cancelled -> unchanged success.
3. Failed -> forbidden.
4. No confirmable active item -> readable error.
5. Mixed cart -> confirm valid items, keep incomplete items review.
6. Complete cart -> sale/voice processed.
7. Cancel -> sale/voice cancelled, active items soft-deleted.

## Security model

1. Service role stays server-side.
2. RLS remains enabled.
3. Business authorization is enforced in application service layer.
4. `shop_id` never comes from client authority.
5. Telegram webhook secret protects webhook route.
6. Telegram initData HMAC protects WebApp session.
7. Diagnostics do not expose raw initData or tokens.
8. Debug route is production-gated.

## Error handling

1. Voice pipeline errors include stage.
2. Parser fallback turns recoverable parser issues into review rows.
3. Supabase persistence errors avoid false success.
4. WebApp auth errors produce user-facing messages.
5. DB load errors are not converted to empty states.
6. Audit log errors are best-effort and non-blocking.
7. Revalidation failure after successful mutation produces soft refresh message.

## Testing boundary

Tests cover:

1. Parser split and evidence rules.
2. Date/report calculations.
3. Telegram callback parsing and keyboard.
4. Confirm/cancel status transitions.
5. Records/report scope.
6. Logger behavior.
7. Audio conversion fallback.
8. Telegram WebApp session.
9. WebApp mutation patches.

## Acceptance criteria

1. Voice sale can be saved only after seller/shop resolution.
2. RPC read-back verifies sale and item count.
3. Review message has only two buttons.
4. Callback delivery includes `callback_query`.
5. WebApp data comes from server-derived shop.
6. Item-level revenue matches code and specs.
7. Soft delete is the only delete path for sale items.
8. Auth and DB errors stay visible.
9. Quality gate commands pass before release.
