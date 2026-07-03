# Auth and Shop Isolation

Auth and shop isolation защищают dashboard от доступа к чужому магазину. Главный принцип: `shop_id` выводится только на сервере.

## Client contract

`getAppAuthContext()` возвращает:

```ts
{
  mode: "telegram" | "fallback",
  initData?: string,
  telegramUserId?: number,
  hasTelegram: boolean,
  hasWebApp: boolean
}
```

Telegram mode требует:

1. `window.Telegram.WebApp`.
2. Непустой raw `initData`.
3. `initDataUnsafe.user.id`.

Client отправляет:

1. `x-app-mode`.
2. `x-telegram-init-data` с raw строкой.

Client не отправляет trusted `shop_id`.

## Server contract

`resolveRequestContext(request)`:

1. Если есть `x-telegram-init-data`, валидирует HMAC через `TELEGRAM_BOT_TOKEN`.
2. Data-check-string содержит все поля, включая `signature`, кроме `hash`.
3. `TELEGRAM_WEBHOOK_SECRET` не используется для WebApp auth.
4. Проверяет `auth_date` freshness.
5. Извлекает Telegram user id.
6. Ищет active seller.
7. Если seller найден, использует seller shop.
8. Если seller отсутствует, ищет active owner.
9. Owner binding может создать seller только в owner shop.
10. Если initData нет и fallback разрешён, загружает fallback seller.
11. Если initData нет и fallback выключен, возвращает auth error.

## Fallback contract

Fallback requires:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

Server:

1. Reads env.
2. Loads seller by `DEFAULT_SELLER_ID`.
3. Requires seller active.
4. Requires `seller.shop_id === DEFAULT_SHOP_ID`.
5. Returns context with `mode = "fallback"`.

Missing or mismatched fallback env is `AUTH_MISCONFIGURED`.

## Cookie session

`/api/auth/telegram` stores raw initData in httpOnly cookie:

1. Cookie name: `voice_sales_telegram_init_data`.
2. SameSite strict.
3. Secure in production.
4. Max age 24 hours.
5. Path `/`.

Server re-verifies cookie initData through the same Telegram HMAC path. Cookie is not a client authority for shop selection.

## Shop isolation

Forbidden authority sources:

1. Query `shop_id`.
2. Form `shop_id`.
3. JSON body `shop_id`.
4. Client header with shop id.
5. LocalStorage.
6. Browser Supabase session metadata.

Allowed authority sources:

1. Active seller row.
2. Active owner row.
3. Verified fallback seller/shop env.
4. Demo mode context.

## WebApp reads

Server Components:

1. `getReport` requires context.
2. `getReviewItems` requires context.
3. `getRecords` requires context.
4. `getSellerStats` requires context.
5. `getSellers` requires context.
6. `getCurrentShopName` requires context.

Data flow:

1. Read sales by `shop_id`.
2. Read items by scoped sale ids.
3. Validate rows through scope helpers.
4. Return error if auth/load fails.

## WebApp mutations

Server Actions:

1. `updateSaleItemAction`.
2. `excludeSaleItemAction`.
3. `restoreSaleItemAction`.
4. `resetDayRevenueAction`.
5. `confirmReviewSaleAction`.
6. `cancelReviewSaleAction`.
7. `confirmAllReviewSalesAction`.

Mutation checks:

1. Resolve current context.
2. Read item or sale.
3. Check parent sale shop.
4. Reject missing/cross-shop rows.
5. Mutate with admin client.
6. Recalculate parent sale.

Hidden form fields are not access control.

## Telegram callback isolation

Telegram callback:

1. Reads Telegram user id from callback update.
2. Resolves active seller.
3. Selects sale by `sale_id`.
4. Filters by `seller_id`.
5. Filters by `shop_id`.
6. Rejects missing/cross-shop sale.
7. Does not use WebApp session.

## Logging

Allowed log fields:

1. `mode`.
2. `telegramUserId`.
3. `sellerId`.
4. `shopId`.
5. `initDataLength`.
6. `errorReason`.
7. `hasDefaultShop`.
8. `hasDefaultSeller`.

Forbidden log fields:

1. Raw initData.
2. Bot token.
3. Webhook secret.
4. Supabase service role key.
5. STT key.
6. LLM key.

## Error mapping

1. Missing initData -> 401.
2. Invalid hash -> 401.
3. Expired auth date -> 401.
4. Missing bot token -> 500.
5. Seller not linked -> 403.
6. Seller inactive -> 403.
7. Shop not found -> 403.
8. Fallback misconfigured -> 500.

Report/records show explicit error messages and do not render successful empty states for these failures.

## Acceptance criteria

1. Valid Telegram initData opens dashboard.
2. Invalid initData is rejected.
3. Missing initData opens fallback only when configured.
4. Client `shop_id` is ignored.
5. Seller sees only own shop.
6. Owner creates seller only in owner shop.
7. Cross-shop item mutation fails.
8. Cross-shop callback fails.
9. Logs contain safe metadata only.
10. Debug page is hidden in production without flag.
