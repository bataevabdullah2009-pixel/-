# Production Readiness

Статус: функционально готово к release gate при успешных локальных checks и отдельном production Telegram smoke.

## Реализовано

Telegram:

1. Reply `web_app` button.
2. Inline `web_app` button в `/start`.
3. Chat menu `web_app` button.
4. Voice message pipeline.
5. Review inline buttons.
6. Short callback data `confirm:<sale_id>` и `cancel:<sale_id>`.
7. Legacy callback prefix support.
8. Callback idempotency.
9. Webhook route with secret check.
10. Safe update logging.

WebApp:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.
5. `/debug-telegram` gated page.
6. Bottom navigation.
7. Telegram auth bootstrap.
8. HttpOnly initData cookie.
9. Fallback mode.
10. Explicit auth/DB error states.
11. Compact item cards.
12. Inline edit.
13. Soft delete.
14. Restore.
15. Reset day.
16. Review confirm/cancel/bulk confirm.

Backend:

1. Supabase service role only server-side.
2. RLS enabled on public tables.
3. `owners` table for owner binding.
4. Seller creation from owner binding in same shop.
5. `save_voice_sale` RPC.
6. Read-back verification after RPC.
7. Parser diagnostics.
8. Soft delete metadata.
9. `cancelled` parent status.
10. Item-level revenue rules.
11. Audit logs best-effort.

Testing:

1. Parser regression tests.
2. Telegram callback/keyboard tests.
3. Confirm/cancel service tests.
4. WebApp session tests.
5. Records/report tests.
6. Logger tests.
7. Audio conversion tests.
8. Build/typecheck scripts.

## Release gate

Run locally:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Expected:

1. Lint passes.
2. Unit/regression tests pass.
3. Workspace build passes.
4. WebApp build passes.
5. No new TypeScript errors.
6. No client bundle secret exposure.

## Supabase gate

Before deploy:

1. Migrations applied.
2. `owners` table exists.
3. `sale_items` soft delete columns exist.
4. `sales.status` allows `cancelled`.
5. `voice_records.status` allows `cancelled`.
6. `sale_items.status` allows `excluded`.
7. RPC `save_voice_sale` exists.
8. RPC execute grant is service role only.
9. Storage bucket `voice-records` exists.
10. Service role key is set only server-side.

## Telegram gate

After deploy:

1. Set webhook through `npm run telegram:set-webhook`.
2. Verify through `npm run telegram:webhook-info`.
3. Confirm production URL is correct.
4. Confirm webhook secret is active.
5. Confirm `allowed_updates` includes `message`.
6. Confirm `allowed_updates` includes `callback_query`.
7. Confirm callback logs appear on button press.

## WebApp auth gate

Verify:

1. Open through Telegram button.
2. `initDataLength > 0` in safe logs.
3. `/api/auth/telegram` returns success.
4. Cookie is set.
5. Auth log contains expected Telegram user id.
6. Auth log contains expected seller/shop.
7. Missing/invalid initData path shows readable error.
8. Direct browser works only if fallback enabled.
9. Fallback seller shop matches fallback shop.

## Product smoke

Confident voice:

```text
Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей.
```

Expected:

1. Bot replies processing.
2. Bot replies success.
3. Sale status is `processed`.
4. Voice status is `processed`.
5. Two items exist.
6. Items are `processed`.
7. Total is `1100`.
8. Report revenue includes `1100`.

Review voice:

```text
Корзина продуктов.
```

Expected:

1. Bot saves review row.
2. Bot shows only two review buttons.
3. `/review` shows active item.
4. Confirm without full item returns no-confirmable message.
5. Edit can make item processed.
6. Cancel can exclude active items.

Mixed cart:

```text
Хлеб 3 штуки по 50 рублей. Корзина продуктов.
```

Expected:

1. Valid item can enter revenue.
2. Incomplete item remains in review.
3. Parent sale may remain `needs_review`.
4. Confirm does not fail entire cart.

## WebApp smoke

1. `/daily-report` loads.
2. Metrics show expected values.
3. DateFilter works.
4. `/review` loads.
5. Confirm action works.
6. Cancel action works.
7. `/records` loads.
8. Search works.
9. Seller filter works.
10. Audio link appears when audio exists.
11. `/sellers` loads.
12. Revenue by seller matches report.
13. Edit item persists after reload.
14. Delete item persists after reload.
15. Restore item recalculates report.
16. Reset day excludes only selected day.

## Security gate

1. Browser bundle does not contain `SUPABASE_SERVICE_ROLE_KEY`.
2. Logs do not contain raw initData.
3. Logs do not contain `TELEGRAM_BOT_TOKEN`.
4. Logs do not contain `TELEGRAM_WEBHOOK_SECRET`.
5. Logs do not contain STT/LLM keys.
6. Client cannot choose `shop_id`.
7. Cross-shop item mutation fails.
8. Cross-shop callback fails.
9. Inactive seller cannot access.
10. Debug route hidden without flag.

## Known release backlog

1. Production smoke with real Telegram bot after every deploy.
2. Verify audio signed URL on production storage.
3. Verify Vercel logs contain safe metadata only.
4. CSV/XLSX export is not implemented.
5. Advanced parser analytics are not implemented.
6. Inventory accounting is not implemented.

## Release decision

Project can be called ready only when:

1. Local release gate passes.
2. Supabase gate passes.
3. Telegram webhook gate passes.
4. WebApp auth gate passes.
5. Product smoke passes.
6. Security gate has no blocking issue.
