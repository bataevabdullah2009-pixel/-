# API Spec

Статус: реализовано через Next.js route handlers, Server Components и Server Actions. Отдельных публичных REST endpoints для отчётов, записей, продавцов и item mutations нет.

Подробный контракт WebApp Server Actions: [`webapp-api.md`](./webapp-api.md).

## Границы API

1. Telegram webhook принимает updates от Telegram.
2. WebApp auth endpoint устанавливает server-side session cookie.
3. Report/records/sellers читаются через Server Components.
4. Item edit/delete/restore/reset выполняются Server Actions.
5. Review confirm/cancel выполняются Server Actions.
6. Bot confirm/cancel выполняется через Telegram callback handler.
7. Client не получает прямой Supabase business-write API.
8. Client не передаёт доверенный `shop_id`.
9. Service role используется только server-side.
10. Ошибки auth/DB возвращаются как readable UI state, а не как пустые данные.

## `POST /api/telegram/webhook`

Назначение: принять Telegram update и передать его в общий bot processor.

Файл: `apps/web/src/app/api/telegram/webhook/route.ts`.

Runtime:

1. `nodejs`.
2. `dynamic = "force-dynamic"`.
3. `maxDuration = 60`.

Headers:

1. `x-telegram-bot-api-secret-token` обязателен.
2. Secret сравнивается через `timingSafeEqual`.
3. Missing или invalid secret возвращает `401`.

Body:

1. Telegram `Update`.
2. Поддерживаются `message`.
3. Поддерживаются `callback_query`.

Processing:

1. Логирует безопасный summary update.
2. Не логирует bot token.
3. Не логирует webhook secret.
4. Вызывает `processTelegramUpdate(update)`.
5. Возвращает `{ ok: true }` при успехе.
6. При ошибке логирует serialized error.
7. При ошибке возвращает `{ ok: false }`.

Webhook должен быть установлен с:

```json
["message", "callback_query"]
```

## Voice update

Voice update обрабатывает bot handler:

1. Resolve seller по Telegram user id.
2. Скачать Telegram audio.
3. Подготовить audio для STT.
4. Best-effort upload в Supabase Storage.
5. Выполнить STT.
6. Выполнить cleanup и parser.
7. Применить deterministic evidence fallback.
8. Сохранить через RPC `save_voice_sale`.
9. Проверить persisted sale и item count read-back.
10. Ответить пользователю.

Success message:

```text
✅ Запись сохранена: ...
```

Review message:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: ...
```

Review keyboard содержит только `✅ Подтвердить` и `❌ Отмена`.

## Callback update

Поддерживаемые новые callback data:

```text
confirm:<sale_id>
cancel:<sale_id>
```

Legacy callback data:

```text
voice_sale_review:confirm:<sale_id>
voice_sale_review:cancel:<sale_id>
```

Callback flow:

1. Parse action и sale id.
2. Resolve seller по `ctx.from.id`.
3. Найти sale по `id`, `shop_id`, `seller_id`.
4. Confirm или cancel через service layer.
5. Ответить `answerCbQuery`.
6. Попытаться отредактировать исходное message.
7. Если edit не прошёл, отправить новое message.

Unsupported callback получает readable ответ `Некорректная кнопка.`

## `POST /api/auth/telegram`

Назначение: bootstrap WebApp session.

Файл: `apps/web/src/app/api/auth/telegram/route.ts`.

Runtime:

1. `nodejs`.
2. `force-dynamic`.

Headers:

1. `x-telegram-init-data` содержит raw `Telegram.WebApp.initData`.
2. `x-app-mode` может использоваться client helper для диагностики mode.
3. `TELEGRAM_WEBHOOK_SECRET` не используется этим endpoint.

Processing:

1. Читает raw initData из header.
2. Вызывает `resolveRequestContext(request)`.
3. Telegram mode проверяет HMAC через `TELEGRAM_BOT_TOKEN`.
4. Telegram mode проверяет freshness `auth_date`.
5. Resolver ищет seller/owner.
6. Fallback mode разрешён только через env.
7. При Telegram success устанавливает httpOnly cookie.
8. Возвращает JSON result.

Success responses:

```json
{ "ok": true, "mode": "telegram" }
```

```json
{ "ok": true, "mode": "fallback" }
```

Error responses:

1. `401` - missing/invalid/expired initData.
2. `403` - seller/owner inactive, not linked, shop missing.
3. `500` - misconfiguration or server error.

Cookie:

1. Name: `voice_sales_telegram_init_data`.
2. `httpOnly = true`.
3. `sameSite = "strict"`.
4. `secure = true` in production.
5. `maxAge = 24h`.

## Server Components

Report, review, records и sellers не вызывают public REST API.

Server-side readers:

1. `getCurrentShopName()`.
2. `getReport(filters)`.
3. `getReviewItems(filters)`.
4. `getRecords(filters)`.
5. `getSellers()`.
6. `getSellerStats(filters)`.

Каждый reader:

1. Вызывает `requireOwner()` или использует reader, который вызывает его.
2. Получает server-derived shop.
3. Читает Supabase через admin client.
4. Фильтрует rows по shop.
5. Возвращает `{ error }` для UI, если access/load failed.

## Server Actions

Item actions:

1. `updateSaleItemAction`.
2. `excludeSaleItemAction`.
3. `restoreSaleItemAction`.
4. `resetDayRevenueAction`.

Review actions:

1. `confirmReviewSaleAction`.
2. `cancelReviewSaleAction`.
3. `confirmAllReviewSalesAction`.

Action contract:

1. Validate form inputs.
2. Resolve server context.
3. Check item/sale/shop relation.
4. Mutate through admin client.
5. Recalculate sale.
6. Revalidate affected routes.
7. Return action state or safe redirect.

Affected routes:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.

## `updateSaleItemAction`

Input:

1. `itemId`.
2. `productName`.
3. `quantity`.
4. `unit`.
5. `price`.

Validation:

1. `itemId` required.
2. `productName` required.
3. `quantity > 0`.
4. `price > 0`.
5. Soft-deleted item rejected.
6. Cross-shop item rejected.

Success:

1. Updates item fields.
2. Normalizes unit.
3. Recalculates total.
4. Sets `status = processed`.
5. Sets `confidence = 1`.
6. Recalculates parent sale.
7. Returns updated row.

## `excludeSaleItemAction`

Input:

1. `itemId`.

Success:

1. Soft-deletes item.
2. Sets `status = excluded`.
3. Saves previous status.
4. Recalculates parent sale.
5. Returns deleted item id.

## Restore and reset redirects

`restoreSaleItemAction` and `resetDayRevenueAction` use redirect-based mutation state. Their `returnTo` is sanitized and limited to `/daily-report`.

Reset day:

1. Allows only one-day range.
2. Soft-deletes active items.
3. Uses `deleted_reason = day_reset`.
4. Does not delete sales.

## Review actions

`confirmReviewSaleAction`:

1. Accepts `saleId`.
2. Requires WebApp session.
3. Validates active items individually.
4. Confirms all confirmable items.
5. Leaves incomplete items in review.
6. Recalculates `sales.total_amount`.
7. Updates sale/voice status to `processed` or `needs_review`.
8. Returns readable message.

`cancelReviewSaleAction`:

1. Accepts `saleId`.
2. Requires WebApp session.
3. Soft-deletes active items.
4. Sets sale/voice `cancelled`.
5. Sets sale total to `0`.

`confirmAllReviewSalesAction`:

1. Deduplicates ids.
2. Processes sequentially.
3. Stops on first failure.
4. Returns summary.

## Error model

Mutation errors include:

1. `statusCode`.
2. `code`.
3. `message`.

Typical codes:

1. `TELEGRAM_INIT_DATA_MISSING`.
2. `TELEGRAM_INIT_DATA_INVALID`.
3. `SELLER_NOT_LINKED`.
4. `SELLER_INACTIVE`.
5. `SHOP_NOT_FOUND`.
6. `SALE_NOT_FOUND`.
7. `ITEM_NOT_FOUND`.
8. `INVALID_ITEM_DATA`.
9. `NO_CONFIRMABLE_ITEMS`.
10. `SUPABASE_ADMIN_MISSING`.

UI receives stable Russian messages. Raw Supabase errors stay in server logs.

## Security criteria

1. No client-side service role.
2. No trusted client `shop_id`.
3. Webhook secret only for Telegram webhook.
4. WebApp auth only uses Telegram initData HMAC.
5. Actions repeat authorization server-side.
6. Logs redact secrets and raw initData.
7. Fallback logs only booleans for configured env.
8. Debug route hidden in production without flag.

## Acceptance criteria

1. Webhook rejects missing/invalid secret.
2. Webhook processes `message` and `callback_query`.
3. Auth endpoint accepts valid initData.
4. Auth endpoint rejects invalid initData.
5. Fallback works only with configured env.
6. Report/records/sellers have no separate public business API.
7. Item update persists after reload.
8. Item delete is soft delete.
9. Review confirm/cancel matches Telegram callback rules.
10. Auth/DB errors are visible and not empty states.
