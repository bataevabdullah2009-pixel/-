# Technical Spec: Telegram WebApp Session

## 1. Цель

1. WebApp должен понимать, какой Telegram user открыл приложение.
2. Server должен проверять raw Telegram initData.
3. Server должен вывести shop access из базы.
4. Client не должен передавать authoritative shop id.
5. Session нужна для report, records, sellers и sale item mutations.
6. Session не используется Telegram callback confirm/cancel.

## 2. Основные файлы

1. `apps/web/src/lib/telegram-api.ts`.
2. `apps/web/src/lib/telegram-init-data.ts`.
3. `apps/web/src/lib/telegram-principal.ts`.
4. `apps/web/src/lib/owner-auth.ts`.
5. `apps/web/src/app/api/auth/telegram/route.ts`.
6. `apps/web/src/components/TelegramAuthBootstrap.tsx`.

## 3. Client bootstrap

1. Telegram JS SDK loads in root layout.
2. `TelegramAuthBootstrap` waits for WebApp.
3. Client reads `window.Telegram.WebApp.initData`.
4. Client sends initData to auth route.
5. Server verifies initData.
6. Client reloads once after session is established.
7. `ready()` and `expand()` are called when WebApp exists.

## 4. InitData verification

1. Verification uses bot token.
2. Verification builds Telegram data check string.
3. Verification checks hash.
4. Verification checks auth date freshness.
5. Invalid hash is `TELEGRAM_INIT_DATA_INVALID`.
6. Missing initData is `TELEGRAM_INIT_DATA_MISSING`.
7. Missing bot token is explicit misconfiguration.

## 5. Principal resolution

1. Server extracts Telegram user id.
2. Server first tries linked seller.
3. If seller exists and active, seller shop is used.
4. Seller shop wins even if same Telegram user is also owner elsewhere.
5. Server may create/link seller from owner shop where code supports it.
6. Inactive seller is denied.
7. Missing shop is denied.
8. Resolved principal includes shop id.

## 6. Session storage

1. Session cookie is server-controlled.
2. Cookie represents verified Telegram principal.
3. Server components call `requireOwner`.
4. Server actions call `requireOwner`.
5. Session failure maps to user-friendly messages.
6. Client cannot forge session by query params.

## 7. Report access

1. `getReport` requires owner/seller session.
2. `getRecords` requires owner/seller session.
3. `getSellerStats` requires owner/seller session.
4. `getSellers` requires owner/seller session.
5. Fallback demo mode is explicit.
6. Without allowed fallback, missing session shows access notice.

## 8. Mutation access

1. `updateSaleItem` requires session.
2. `excludeSaleItem` requires session.
3. `restoreSaleItem` requires session.
4. `resetDay` requires session.
5. Mutations resolve shop server-side.
6. Mutations verify parent sale belongs to resolved shop.
7. Mutations do not trust hidden form shop fields.

## 9. Telegram confirm/cancel relation

1. Telegram callback does not use WebApp session.
2. Telegram callback uses Telegram `ctx.from.id`.
3. Callback resolves seller in bot service.
4. Callback filters sale by seller and shop.
5. WebApp shows updated result after refresh.
6. WebApp displays review status but does not decide it.

## 10. Diagnostics

1. Diagnostics component shows SDK presence and initData metadata only.
2. Diagnostics never prints raw initData.
3. Diagnostics never prints tokens.
4. `/debug-telegram` is available in development.
5. In production `/debug-telegram` requires `DEBUG_TELEGRAM_WEBAPP=true`.
6. Diagnostics is not linked from normal navigation.
7. Report keyboard can show diagnostics only behind debug flag.

## 11. Error mapping

1. Missing initData -> ask user to open WebApp inside Telegram.
2. Invalid initData -> ask user to reopen report.
3. Expired auth date -> invalid session message.
4. Seller not linked -> access denied.
5. Seller inactive -> access disabled.
6. Shop not found -> shop error.
7. Auth misconfiguration -> logged server error.

## 12. Security rules

1. Bot token is server-only.
2. Service role key is server-only.
3. `NEXT_PUBLIC_` variables must not contain secrets.
4. Client may send initData, not derived authority.
5. Server recomputes authority.
6. `shop_id` query param is ignored by report filters.
7. Report reads items only through scoped sales.
8. Actions check row ownership via sale context.

## 13. Routes

1. `/daily-report` requires session.
2. `/records` requires session.
3. `/sellers` requires session.
4. `/` renders report.
5. `/review` redirects to `/records`.
6. `/debug-telegram` is dev/debug gated.
7. `/api/auth/telegram` establishes session.
8. `/api/telegram/webhook` is bot webhook and not WebApp auth.

## 14. Edge cases

1. Telegram SDK loads slowly.
2. initData appears after short wait.
3. User opens WebApp outside Telegram.
4. User session expires.
5. Seller is disabled after session created.
6. Owner and seller use same Telegram id.
7. Shop was deleted or missing.
8. Client passes attacker `shop_id`.
9. Browser blocks or clears cookies.

## 15. Acceptance criteria

1. Valid initData creates usable session.
2. Invalid initData is rejected.
3. Missing initData does not silently show another shop.
4. Report ignores client shop id.
5. Seller sees only own shop.
6. Update/delete cannot mutate another shop.
7. Debug page is hidden in production without flag.
8. Telegram callback works without WebApp session.
9. WebApp has no review confirm/cancel controls.

## 16. Out of scope

1. Password login.
2. OAuth login outside Telegram.
3. Multi-shop switcher.
4. WebApp review decision flow.
5. Client-side direct Supabase writes.
