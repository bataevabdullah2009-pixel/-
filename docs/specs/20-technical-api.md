# Спецификация API

Статус: реализовано через Next.js route handlers, Server Components и Server Actions. Отдельных публичных REST endpoints для отчётов, записей, продавцов и item mutations нет.

Подробный контракт WebApp Server Actions: [`21-technical-webapp-api.md`](./21-technical-webapp-api.md).

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
10. Ошибки auth/DB возвращаются как понятное состояние UI, а не как пустые данные.

## `POST /api/telegram/webhook`

Назначение: принять Telegram update и передать его в общий bot processor.

Файл: `apps/web/src/app/api/telegram/webhook/route.ts`.

Среда выполнения:

1. `nodejs`.
2. `dynamic = "force-dynamic"`.
3. `maxDuration = 60`.

Заголовки:

1. `x-telegram-bot-api-secret-token` обязателен.
2. Secret сравнивается через `timingSafeEqual`.
3. Отсутствующий или некорректный secret возвращает `401`.

Тело запроса:

1. Telegram `Update`.
2. Поддерживаются `message`.
3. Поддерживаются `callback_query`.

Обработка:

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

## Голосовой update

Голосовой update обрабатывает bot handler:

1. Резолвит продавца по Telegram user id.
2. Скачать Telegram audio.
3. Подготовить audio для STT.
4. Best-effort upload в Supabase Storage.
5. Выполнить STT.
6. Выполнить cleanup и parser.
7. Применить deterministic evidence fallback.
8. Сохранить через RPC `save_voice_sale`.
9. Проверить persisted sale и item count read-back.
10. Ответить пользователю.

Сообщение об успехе:

```text
✅ Запись сохранена: ...
```

Сообщение для проверки:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: ...
```

Review keyboard содержит только `✅ Подтвердить` и `❌ Отмена`.

## Callback-обновление

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

1. Парсит action и sale id.
2. Резолвит продавца по `ctx.from.id`.
3. Найти sale по `id`, `shop_id`, `seller_id`.
4. Confirm или cancel через service layer.
5. Ответить `answerCbQuery`.
6. Попытаться отредактировать исходное сообщение.
7. Если edit не прошёл, отправить новое сообщение.

Unsupported callback получает readable ответ `Некорректная кнопка.`

## `POST /api/auth/telegram`

Назначение: bootstrap WebApp session.

Файл: `apps/web/src/app/api/auth/telegram/route.ts`.

Среда выполнения:

1. `nodejs`.
2. `force-dynamic`.

Заголовки:

1. `x-telegram-init-data` содержит raw `Telegram.WebApp.initData`.
2. `x-app-mode` может использоваться client helper для диагностики mode.
3. `TELEGRAM_WEBHOOK_SECRET` не используется этим endpoint.

Обработка:

1. Читает raw initData из header.
2. Вызывает `resolveRequestContext(request)`.
3. Telegram mode проверяет HMAC через `TELEGRAM_BOT_TOKEN`.
4. Telegram mode проверяет freshness `auth_date`.
5. Resolver ищет seller/owner.
6. Fallback mode разрешён только через env.
7. При Telegram success устанавливает httpOnly cookie.
8. Возвращает JSON result.

Успешные ответы:

```json
{ "ok": true, "mode": "telegram" }
```

```json
{ "ok": true, "mode": "fallback" }
```

Ответы с ошибкой:

1. `401` - missing/invalid/expired initData.
2. `403` - seller/owner inactive, not linked, shop missing.
3. `500` - misconfiguration или server error.

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
4. Фильтрует rows по магазину.
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

Контракт action:

1. Валидирует form inputs.
2. Резолвит server context.
3. Проверяет relation item/sale/shop.
4. Выполняет mutation через admin client.
5. Пересчитывает sale.
6. Revalidate affected routes.
7. Возвращает action state или safe redirect.

Затрагиваемые routes:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.

## `updateSaleItemAction`

Вход:

1. `itemId`.
2. `productName`.
3. `quantity`.
4. `unit`.
5. `price`.

Валидация:

1. `itemId` обязателен.
2. `productName` обязателен.
3. `quantity > 0`.
4. `price > 0`.
5. Soft-deleted item отклоняется.
6. Cross-shop item отклоняется.

Успех:

1. Обновляет поля item.
2. Нормализует unit.
3. Пересчитывает total.
4. Устанавливает `status = processed`.
5. Устанавливает `confidence = 1`.
6. Пересчитывает parent sale.
7. Возвращает updated row.

## `excludeSaleItemAction`

Вход:

1. `itemId`.

Успех:

1. Выполняет soft-delete item.
2. Устанавливает `status = excluded`.
3. Сохраняет previous status.
4. Пересчитывает parent sale.
5. Возвращает deleted item id.

## Redirects для restore и reset

`restoreSaleItemAction` и `resetDayRevenueAction` используют redirect-based mutation state. Их `returnTo` санитизируется и ограничен `/daily-report`.

Reset day:

1. Разрешает только диапазон в один день.
2. Выполняет soft-delete active items.
3. Использует `deleted_reason = day_reset`.
4. Не удаляет sales.

## Actions проверки

`confirmReviewSaleAction`:

1. Принимает `saleId`.
2. Требует WebApp session.
3. Валидирует active items по отдельности.
4. Подтверждает все confirmable items.
5. Оставляет incomplete items в review.
6. Recalculates `sales.total_amount`.
7. Обновляет sale/voice status до `processed` или `needs_review`.
8. Возвращает readable message.

`cancelReviewSaleAction`:

1. Принимает `saleId`.
2. Требует WebApp session.
3. Выполняет soft-delete active items.
4. Устанавливает sale/voice `cancelled`.
5. Устанавливает sale total в `0`.

`confirmAllReviewSalesAction`:

1. Убирает повторяющиеся ids.
2. Обрабатывает последовательно.
3. Останавливается на первой ошибке.
4. Возвращает summary.

## Модель ошибок

Mutation errors включают:

1. `statusCode`.
2. `code`.
3. `message`.

Типовые codes:

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

UI получает стабильные русские сообщения. Raw Supabase errors остаются в server logs.

## Критерии безопасности

1. Нет client-side service role.
2. Нет доверенного client `shop_id`.
3. Webhook secret используется только для Telegram webhook.
4. WebApp auth использует только Telegram initData HMAC.
5. Actions повторяют authorization server-side.
6. Logs редактируют secrets и raw initData.
7. Fallback логирует только booleans для configured env.
8. Debug route скрыт в production без flag.

## Критерии приемки

1. Webhook отклоняет missing/invalid secret.
2. Webhook обрабатывает `message` и `callback_query`.
3. Auth endpoint принимает valid initData.
4. Auth endpoint отклоняет invalid initData.
5. Fallback работает только с configured env.
6. У report/records/sellers нет отдельного public business API.
7. Item update сохраняется после reload.
8. Item delete является soft delete.
9. Review confirm/cancel совпадает с Telegram callback rules.
10. Auth/DB errors видны и не превращаются в empty states.
