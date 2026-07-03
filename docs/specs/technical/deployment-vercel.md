# Deployment on Vercel

Статус: проект рассчитан на Vercel/Next.js App Router deployment с Telegram webhook route и Supabase backend.

## Build command

```bash
npm run build
```

Для отдельной проверки WebApp:

```bash
npm run web:build
```

В PowerShell при заблокированном `npm.ps1`:

```bash
npm.cmd run build
npm.cmd run web:build
```

## Runtime

1. WebApp работает на Next.js App Router.
2. Telegram webhook route использует Node.js runtime.
3. Webhook max duration: 60 seconds.
4. Bot update processor запускается внутри route handler.
5. Server Actions выполняются на сервере.
6. Supabase service role доступен только server-side.

## Required env

Telegram:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
PUBLIC_WEBHOOK_URL=
```

Supabase:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=voice-records
```

STT:

```text
STT_API_KEY=
STT_API_URL=
STT_MODEL=whisper-large-v3-turbo
```

LLM:

```text
LLM_API_KEY=
LLM_API_URL=
LLM_MODEL=
```

Modes:

```text
DEMO_MODE=false
DEMO_OWNER_TELEGRAM_ID=
DEFAULT_SHOP_NAME=Демо-магазин
ALLOW_WEBAPP_FALLBACK=false
DEFAULT_SHOP_ID=
DEFAULT_SELLER_ID=
DEBUG_TELEGRAM_WEBAPP=false
```

Production fallback should be enabled only deliberately. If enabled, both `DEFAULT_SHOP_ID` and `DEFAULT_SELLER_ID` must be set and must match in DB.

## URL requirements

`NEXT_PUBLIC_APP_URL`:

1. Must be public HTTPS.
2. Must be canonical WebApp URL.
3. Used for Telegram WebApp buttons.
4. Used by webhook scripts to build default webhook URL.
5. Must not point to localhost in production.

`PUBLIC_WEBHOOK_URL`:

1. Optional.
2. Can be separate HTTPS base URL.
3. Can be full `/api/telegram/webhook` URL.
4. If unset, webhook URL is built from `NEXT_PUBLIC_APP_URL`.

## Supabase before deploy

Before deploying code that expects current schema:

1. Apply all migrations.
2. Confirm table `owners` exists.
3. Confirm `sale_items.deleted_at` exists.
4. Confirm `sale_items.deleted_reason` exists.
5. Confirm `sale_items.deleted_previous_status` exists.
6. Confirm `sale_items.updated_at` exists.
7. Confirm `sales.status` allows `cancelled`.
8. Confirm `voice_records.status` allows `cancelled`.
9. Confirm RPC `save_voice_sale` exists.
10. Confirm execute on RPC is granted to service role.
11. Confirm Storage bucket `voice-records` exists.
12. Confirm service role can manage voice audio objects.

## RLS and grants

1. RLS must remain enabled on business tables.
2. Runtime business reads and writes use server-side service role.
3. Public anon table access is not required for WebApp business data.
4. `owners` should not be exposed to anon/authenticated clients.
5. New Supabase tables that must be Data API-visible need explicit grants, but business tables should still be protected by RLS and server-side access checks.

## Telegram webhook setup

Run after production URL and env are ready:

```bash
npm run telegram:set-webhook
```

The script must set:

```json
["message", "callback_query"]
```

Then verify:

```bash
npm run telegram:webhook-info
```

Check:

1. URL matches expected production webhook.
2. Secret token is configured.
3. `allowed_updates` includes `message`.
4. `allowed_updates` includes `callback_query`.
5. No unexpected pending update errors.

## Pre-release local checks

Run:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Expected:

1. ESLint passes.
2. Vitest passes.
3. Workspace build passes.
4. Next build passes.
5. No secret values appear in logs.

## Production smoke

After deploy:

1. Open WebApp through Telegram bot button.
2. Confirm Telegram SDK exists.
3. Confirm raw initData is non-empty.
4. Confirm `/api/auth/telegram` returns success.
5. Confirm auth log shows expected Telegram user id.
6. Confirm auth log shows expected seller/shop.
7. Confirm `/daily-report` loads without auth error.
8. Confirm report counts are non-zero when DB has rows.
9. Confirm `/review` opens.
10. Confirm `/records` opens.
11. Confirm `/sellers` opens.
12. Confirm direct browser fallback works only if intentionally enabled.

## Voice smoke

Send a confident sale:

```text
Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей.
```

Expected:

1. Bot receives voice.
2. Bot replies processing message.
3. Bot replies success.
4. Supabase has one `voice_records` row.
5. Supabase has one `sales` row.
6. Supabase has two `sale_items`.
7. Items are `processed`.
8. Total is `1100`.
9. Report revenue increases.

Send a review sale:

```text
Корзина продуктов.
```

Expected:

1. Bot saves review row.
2. Bot shows two review buttons.
3. No `Открыть отчёт` button in review message.
4. `/review` shows active item.
5. Confirm without full item returns no-confirmable message.
6. Edit with product/quantity/unit/price can make item processed.
7. Cancel soft-deletes active items and excludes sale from revenue.

## Callback smoke

1. Press `✅ Подтвердить`.
2. Confirm callback is delivered.
3. Logs show `has_callback_query = true`.
4. Sale/items transition according to mixed-cart rules.
5. Repeated confirm returns already confirmed/unchanged behavior.
6. Press `❌ Отмена` on another review sale.
7. Sale/voice become `cancelled`.
8. Active items become `excluded` with `deleted_at`.

## WebApp mutation smoke

1. Edit processed item price.
2. Check total changes.
3. Reload page.
4. Check value persists.
5. Delete item.
6. Reload page.
7. Check item remains excluded.
8. Restore item from deleted panel.
9. Check report recalculates.
10. Reset one day.
11. Check only selected day's active items are excluded.

## Diagnostics

`DEBUG_TELEGRAM_WEBAPP`:

1. Should be absent or `false` in normal production.
2. Can be temporarily set to `true`.
3. Enables diagnostics button/page.
4. Must be turned off after debugging.

Diagnostics may show SDK/initData metadata, but must not show raw initData or secrets.

## Failure handling

If WebApp shows auth error:

1. Check `NEXT_PUBLIC_APP_URL`.
2. Check bot opens the same production URL.
3. Check `TELEGRAM_BOT_TOKEN`.
4. Check initData freshness.
5. Check seller/owner binding.
6. Check fallback env if using direct browser.

If callback buttons do nothing:

1. Run `npm run telegram:webhook-info`.
2. Check `allowed_updates`.
3. Check webhook secret.
4. Check route logs.
5. Check callback data format.

If report is empty unexpectedly:

1. Check auth log seller/shop.
2. Check report log seller/shop.
3. Check sales for that shop and period.
4. Check parent statuses.
5. Check item statuses.
6. Check `deleted_at`.
7. Check totals.

## Acceptance criteria

1. Migrations applied before code deploy.
2. Build passes.
3. Telegram webhook is set to production route.
4. `callback_query` delivery is enabled.
5. WebApp opens through Telegram with valid initData.
6. Fallback is explicit and verified if used.
7. Voice sale persists through RPC.
8. Review confirm/cancel works in Telegram.
9. Review confirm/cancel works in WebApp.
10. Service role key is not in client assets.
