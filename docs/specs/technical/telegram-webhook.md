# Technical Spec: Telegram Webhook

## 1. Цель

1. Webhook принимает Telegram updates.
2. Bot обрабатывает `/start`, voice messages и review callbacks.
3. Voice pipeline должен сохранять продажи без потери данных.
4. Review callbacks должны подтверждать или отменять сомнительные записи.
5. Webhook не должен зависеть от WebApp session.

## 2. Entry points

1. Next.js route: `apps/web/src/app/api/telegram/webhook/route.ts`.
2. Bot update processor: `apps/bot/src/core/process-update.ts`.
3. Bot instance factory: `createTelegramBot`.
4. Webhook setup script: `scripts/set-telegram-webhook.ts`.
5. Webhook info script: `scripts/get-telegram-webhook-info.ts`.

## 3. Handlers

1. `/start`: `start.handler.ts`.
2. Text: `text.handler.ts`.
3. Voice: `voice.handler.ts`.
4. Review callbacks: `review.handler.ts`.
5. Handlers are registered by `process-update.ts`.

## 4. `/start`

1. Resolves seller by Telegram user id.
2. Creates seller in demo mode when allowed.
3. Sends report access.
4. Can include `Открыть отчёт` WebApp button.
5. Can configure menu button.
6. Can show diagnostics button only when `DEBUG_TELEGRAM_WEBAPP=true`.
7. Does not process sales.

## 5. Voice flow stages

1. `seller_resolve`.
2. `telegram_reply`.
3. `telegram_download`.
4. `audio_prepare`.
5. `stt`.
6. `llm`.
7. `supabase_insert`.
8. `telegram_reply`.

Each stage logs context for diagnostics.

## 6. Seller resolve

1. Telegram user id is required.
2. Seller display name comes from first name or username.
3. `requireSeller` checks active seller.
4. In demo mode unknown seller can be created.
5. In non-demo unknown seller is denied.
6. Missing seller stops pipeline before STT.

## 7. Telegram download

1. Uses Telegram file link.
2. Downloads original voice file.
3. Stores content as OGG input.
4. File name is sanitized.
5. Download failure logs `voice_failed`.

## 8. Audio prepare

1. `prepareTelegramVoiceForStt` prepares audio for STT.
2. Conversion diagnostics are logged.
3. Fallback to original OGG may occur.
4. This stage must not be rewritten for UI tasks.

## 9. Audio storage

1. Upload to Supabase Storage is best effort.
2. Upload failure logs warning.
3. Upload failure does not block sale persistence.
4. `audio_path` and `audio_url` can be null.
5. Records page shows audio link only if URL can be created.

## 10. STT

1. `transcribeAudio` sends prepared audio to STT API.
2. Language is Russian.
3. STT returns raw transcript.
4. Raw transcript is logged.
5. Raw transcript is saved in voice/sale data.
6. STT failure can create failed voice record if sale was not persisted.

## 11. Parser/cleanup

1. `cleanupTranscript` creates cleaned text.
2. `parseSaleTranscript` returns parsed sale.
3. Parser returns items and `needs_review` flag.
4. Invalid LLM JSON falls back to review instead of hard failing when possible.
5. Parser JSON and error message are stored for diagnostics.

## 12. Persistence

1. `saveProcessedSale` is alias for `saveVoiceSale`.
2. Source items are normalized.
3. If parser returns no items, `ensureReviewableSaleItems` creates a fallback review item.
4. Item statuses are resolved with shared utilities.
5. Sale status is `processed` only if all resolved items are processed and no parser error.
6. Otherwise sale status is `needs_review`.
7. Payload is saved through RPC `save_voice_sale`.
8. Persistence verifies saved sale and item count.
9. False success throws.

## 13. Success message

For `processed` sale:

```text
✅ Запись сохранена: ...
```

Rules:

1. No inline review keyboard.
2. No raw technical status.
3. Sale enters report immediately.

## 14. Review message

For `needs_review` sale:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: ...
```

Keyboard:

```text
✅ Подтвердить    ❌ Отмена
```

Rules:

1. Exactly two inline callback buttons.
2. No `Открыть отчёт` button.
3. No diagnostics button.
4. No WebApp button.
5. No raw status.

## 15. Callback route

1. `review.handler.ts` registers `bot.action`.
2. Regex accepts new callbacks.
3. Regex accepts legacy callbacks.
4. Callback extracts action and sale id.
5. Callback resolves Telegram seller.
6. Callback calls records service.
7. Callback answers Telegram loading state.
8. Callback edits message text if possible.
9. Callback falls back to reply if edit fails.
10. Webhook route logs safe `telegram_update_received` metadata before dispatch.
11. `scripts/set-telegram-webhook.ts` must include `callback_query` in `allowed_updates`.

## 16. Callback data

Allowed new values:

```text
confirm:<uuid>
cancel:<uuid>
```

Allowed legacy values:

```text
voice_sale_review:confirm:<uuid>
voice_sale_review:cancel:<uuid>
```

## 17. Confirm service

1. Function: `confirmVoiceSaleWithClient`.
2. Selects sale by id, shop and seller.
3. Already processed returns unchanged success.
4. Already cancelled returns unchanged success.
5. Failed sale returns error.
6. Loads active items.
7. Validates active items individually.
8. If at least one item is valid, updates only confirmable items to `processed`.
9. Leaves incomplete active items as `needs_review`.
10. Recalculates total from confirmable items.
11. Updates sale and voice record to `processed`.
12. If no item is valid, returns `Не удалось подтвердить: нет ни одной полной позиции.`

## 18. Cancel service

1. Function: `cancelVoiceSaleWithClient`.
2. Selects sale by id, shop and seller.
3. Already cancelled returns unchanged success.
4. Already processed returns unchanged success.
5. Failed sale returns error.
6. Loads active items.
7. Soft-deletes each active item.
8. Updates sale and voice record to cancelled.
9. Sets total zero.

## 19. Idempotency

1. Repeated confirm on processed sale is safe.
2. Repeated cancel on cancelled sale is safe.
3. Confirm after cancel does not restore sale.
4. Cancel after confirm does not remove revenue.
5. Message edit failure does not rollback DB mutation.

## 20. Failed pipeline

1. If seller exists and sale was not persisted, save failed voice record.
2. Failed record status is `failed`.
3. Error message includes stage.
4. User sees generic processing failure.
5. Supabase insert failure uses save failure message.

## 21. Security

1. Webhook should be protected by Telegram secret or deployment config.
2. Service role key is server-only.
3. Callback does not accept shop id.
4. Callback seller identity comes from Telegram user id.
5. Sale mutation filters by seller and shop.
6. Logs avoid leaking secrets.

## 22. WebApp relation

1. WebApp route is separate.
2. WebApp session is not required for Telegram callback.
3. WebApp shows updated state after refresh.
4. WebApp `/review` exposes review confirm/cancel through server actions and WebApp session.
5. `/start` can still open WebApp report.

## 23. Database writes

1. Insert voice record.
2. Insert sale.
3. Insert sale items.
4. Update sale status on decision.
5. Update voice status on decision.
6. Update item statuses on decision.
7. Insert audit logs best effort.

## 24. Errors

1. Missing Telegram user id.
2. Seller not linked.
3. Telegram file download failure.
4. Audio conversion failure.
5. STT failure.
6. Parser failure.
7. Supabase insert failure.
8. Telegram reply failure.
9. Callback sale not found.
10. Callback item validation failure.

## 25. Acceptance criteria

1. Confident voice sale receives success message.
2. Confident sale has status `processed`.
3. Review voice sale receives warning message.
4. Review keyboard has only two buttons.
5. Review keyboard has no `Открыть отчёт`.
6. Confirm callback processes sale.
7. Cancel callback cancels sale.
8. Repeat callback does not corrupt data.
9. Failed voice record is saved when possible.
10. Voice pipeline tests pass.

## 26. Out of scope

1. Replacing Telegraf.
2. Replacing STT provider.
3. Replacing LLM/parser.
4. Physical deletion of sale data.
