# Авторизация и изоляция магазина

Авторизация и изоляция магазина защищают dashboard от доступа к чужому магазину. Главный принцип: `shop_id` выводится только на сервере.

## Контракт клиента

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

Client не отправляет доверенный `shop_id`.

## Контракт сервера

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

## Контракт резервного режима

Fallback требует:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

Server:

1. Читает env.
2. Загружает seller по `DEFAULT_SELLER_ID`.
3. Требует active seller.
4. Требует `seller.shop_id === DEFAULT_SHOP_ID`.
5. Возвращает context с `mode = "fallback"`.

Отсутствующий или несовпадающий fallback env является `AUTH_MISCONFIGURED`.

## Cookie-сессия

`/api/auth/telegram` сохраняет raw initData в httpOnly cookie:

1. Cookie name: `voice_sales_telegram_init_data`.
2. SameSite strict.
3. Secure в production.
4. Max age 24 hours.
5. Path `/`.

Server повторно проверяет cookie initData через тот же Telegram HMAC path. Cookie не является client authority для выбора магазина.

## Изоляция магазина

Запрещённые sources authority:

1. Query `shop_id`.
2. Form `shop_id`.
3. JSON body `shop_id`.
4. Client header с shop id.
5. LocalStorage.
6. Browser Supabase session metadata.

Разрешённые sources authority:

1. Активная строка seller.
2. Активная строка owner.
3. Проверенный fallback seller/shop env.
4. Demo mode context.

## Чтения WebApp

Server Components:

1. `getReport` requires context.
2. `getReviewItems` requires context.
3. `getRecords` requires context.
4. `getSellerStats` requires context.
5. `getSellers` requires context.
6. `getCurrentShopName` requires context.

Поток данных:

1. Читать sales по `shop_id`.
2. Читать items по scoped sale ids.
3. Валидировать rows через scope helpers.
4. Возвращать error, если auth/load fails.

## Мутации WebApp

Server Actions:

1. `updateSaleItemAction`.
2. `excludeSaleItemAction`.
3. `restoreSaleItemAction`.
4. `resetDayRevenueAction`.
5. `confirmReviewSaleAction`.
6. `cancelReviewSaleAction`.
7. `confirmAllReviewSalesAction`.

Проверки mutation:

1. Резолвить current context.
2. Читать item или sale.
3. Проверять parent sale shop.
4. Отклонять missing/cross-shop rows.
5. Выполнять mutation с admin client.
6. Пересчитывать parent sale.

Hidden form fields не являются access control.

## Изоляция Telegram callback

Telegram callback:

1. Читает Telegram user id из callback update.
2. Резолвит active seller.
3. Выбирает sale по `sale_id`.
4. Filters by `seller_id`.
5. Filters by `shop_id`.
6. Отклоняет missing/cross-shop sale.
7. Не использует WebApp session.

## Логирование

Разрешённые поля логов:

1. `mode`.
2. `telegramUserId`.
3. `sellerId`.
4. `shopId`.
5. `initDataLength`.
6. `errorReason`.
7. `hasDefaultShop`.
8. `hasDefaultSeller`.

Запрещённые поля логов:

1. Raw initData.
2. Bot token.
3. Webhook secret.
4. Supabase service role key.
5. STT key.
6. LLM key.

## Сопоставление ошибок

1. Отсутствует initData -> 401.
2. Некорректный hash -> 401.
3. Истёкший auth date -> 401.
4. Отсутствует bot token -> 500.
5. Seller not linked -> 403.
6. Seller inactive -> 403.
7. Shop not found -> 403.
8. Fallback misconfigured -> 500.

Report/records показывают явные сообщения об ошибке и не рендерят successful empty states для этих failures.

## Критерии приемки

1. Valid Telegram initData открывает dashboard.
2. Некорректная initData отклоняется.
3. Отсутствующая initData открывает fallback только когда он configured.
4. Client `shop_id` игнорируется.
5. Seller видит только свой магазин.
6. Owner создаёт seller только в owner shop.
7. Cross-shop item mutation завершается ошибкой.
8. Cross-shop callback завершается ошибкой.
9. Logs содержат только safe metadata.
10. Debug page скрыта в production без flag.
