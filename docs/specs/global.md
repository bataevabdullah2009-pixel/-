# Global Spec

## Product

`Голосовой журнал продаж` - Telegram bot + Telegram WebApp для магазина.

## Primary flow

1. Seller sends Telegram voice message.
2. Bot downloads audio.
3. Bot prepares audio for STT.
4. STT returns Russian text.
5. Parser extracts sale items.
6. Deterministic fallback splits glued items and preserves incomplete leftovers.
7. Bot saves voice record, sale and sale items in Supabase.
8. Bot replies with success or review decision.
9. WebApp shows report, review, records and sellers.

## Roles

1. Seller sends sales and can view shop WebApp.
2. Owner can view shop WebApp and mutate sale items.
3. Bot owns voice pipeline and Telegram callbacks.
4. Supabase stores business data.

## Statuses

`sales` and `voice_records`:

1. `processed` - counted.
2. `needs_review` - saved, not counted.
3. `cancelled` - cancelled, not counted.
4. `failed` - failed, not counted.

`sale_items`:

1. `processed` - can count when parent sale is not `cancelled` or `failed`.
2. `needs_review` - not counted.
3. `needs_price` - legacy review, not counted.
4. `failed` - not counted.
5. `excluded` - soft-deleted, not counted.

## Processed voice sale

1. Product name is meaningful.
2. Quantity or weight is valid.
3. Unit price is valid or can be derived from total.
4. Total is valid.
5. Confidence is high enough.
6. Sale status becomes `processed`.
7. Voice status becomes `processed`.
8. Valid items become `processed`.
9. Bot sends `✅ Запись сохранена: ...`.
10. No review keyboard is attached.

## Needs review voice sale

1. Missing product, missing quantity/weight, or missing both price and total creates review.
2. Low confidence creates review.
3. Parser fallback creates review.
4. Sale status becomes `needs_review`.
5. Voice status becomes `needs_review`.
6. Items do not enter revenue.
7. Bot sends warning text.
8. Bot attaches only `✅ Подтвердить` and `❌ Отмена`.
9. No `Открыть отчёт` button is attached to the review-message.
10. Fallback keeps complete products and incomplete products as separate `sale_items`.

## Telegram decision

1. `confirm:<sale_id>` confirms.
2. `cancel:<sale_id>` cancels.
3. Legacy `voice_sale_review:<action>:<sale_id>` can be accepted.
4. Confirm validates active `sale_items` individually.
5. Confirm sets sale/voice and valid items to `processed`.
6. Confirm leaves incomplete mixed-cart items in `needs_review`.
7. Confirm fails only when there is no complete item and returns `Не удалось подтвердить: нет ни одной полной позиции.`
8. Confirm recalculates total from confirmed items.
9. Successful confirm returns `✅ Подтверждено: N позиций, сумма X ₽`.
10. Cancel sets sale/voice to `cancelled`.
11. Cancel soft-deletes active items.
12. Callbacks are idempotent.

## WebApp

1. Navigation: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
2. `/daily-report` shows summary, top products, period sales and review visibility.
3. `/review` shows active `needs_review` items and review actions.
4. `/records` shows voice-sale journal.
5. `/sellers` shows seller stats.
6. WebApp review actions use server-derived shop context.
7. Review records show status consistently.

## Sale item editing

1. `✏️` opens compact edit mode.
2. Edit fields: product, quantity, unit, price.
3. Save updates Supabase.
4. Save recalculates item total.
5. Save recalculates sale total.
6. Save with valid product, quantity and price stores the item as `processed`.
7. Parent `needs_review` sale can still contain processed revenue items while other items remain in review.
8. `🗑` opens delete confirmation.
9. Delete soft-deletes item.
10. Deleted item disappears from active report.

## Revenue

Count only:

1. Parent sale is not `cancelled` or `failed`.
2. Item `processed`.
3. `deleted_at is null`.
4. Total exists.
5. Quantity or weight is valid.
6. Unit price exists or can be derived from total.

Do not count:

1. `needs_review` sale.
2. `cancelled` sale.
3. `failed` sale.
4. `needs_review` item.
5. `needs_price` item.
6. `failed` item.
7. `excluded` item.
8. Deleted rows.

## Diagnostics

1. `/debug-telegram` is development/debug only.
2. Production debug requires `DEBUG_TELEGRAM_WEBAPP=true`.
3. Main user flow does not expose diagnostics.

## Acceptance

1. Confident `Сникерс, 5 штук по 100 рублей` is processed.
2. Review item does not enter revenue; processed item in review sale can enter revenue.
3. Review message has exactly two buttons.
4. Confirm adds revenue for complete items and leaves incomplete mixed-cart items in review.
5. Cancel excludes revenue.
6. Edit item persists after reload.
7. Delete item persists after reload.
8. WebApp has four nav tabs.
9. Docs match code.
