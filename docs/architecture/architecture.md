# Архитектура Voice Sales Log

## Основной поток

```text
Telegram voice
  -> POST /api/telegram/webhook
  -> processTelegramUpdate
  -> seller resolution
  -> audio preparation
  -> Russian STT
  -> LLM parser + evidence rules
  -> save_voice_sale RPC
  -> sales/sale_items read-back verification
  -> Telegram success or review decision/report buttons
  -> Next.js App Router WebApp
  -> report / records / review / sellers / item mutations
```

## Telegram bot

Bot работает через Telegraf.

Webhook защищён `TELEGRAM_WEBHOOK_SECRET`.

Bot success после voice save возможен только после Supabase read-back.

Уверенная продажа получает обычный success message.

Сомнительная продажа получает inline keyboard:

```text
✅ Подтвердить
❌ Отмена
Открыть отчёт
```

`Открыть отчёт` создаётся только как `web_app` кнопка.

## Confirm/cancel service

Callback flow:

```text
confirm:<sale_id> / cancel:<sale_id>
  -> seller from ctx.from.id
  -> sales by sale_id + seller_id + shop_id
  -> confirm or cancel mutation
  -> editMessageText or fallback reply
```

Confirm переводит sale/voice в `processed` и валидные items в `processed`.

Cancel переводит sale/voice в `cancelled` и soft-delete active items.

Callback не принимает client `shop_id`.

Повторные callback идемпотентны.

Handler также принимает legacy `voice_sale_review:<action>:<sale_id>` для уже отправленных сообщений, но новые сообщения создаются только с короткими callback data.

## WebApp auth

```text
Telegram mode:
  telegram-web-app.js
  -> window.Telegram.WebApp.initData
  -> client checks WebApp + raw initData + initDataUnsafe.user.id
  -> apiFetch(x-app-mode=telegram, x-telegram-init-data=<raw initData>)
  -> resolveRequestContext()
  -> HMAC via TELEGRAM_BOT_TOKEN
  -> seller lookup by Telegram user id
  -> optional seller creation from active owner binding
  -> server-derived shop_id
```

```text
Browser fallback:
  no initData
  -> apiFetch(x-app-mode=fallback)
  -> ALLOW_WEBAPP_FALLBACK=true
  -> DEFAULT_SHOP_ID / DEFAULT_SELLER_ID from server env
  -> seller lookup
  -> shop_id equality check
```

`TELEGRAM_WEBHOOK_SECRET` не участвует в WebApp auth.

## WebApp data flow

Report:

```text
requireOwner()
  -> sales by shop_id and period
  -> sale_items by sale ids
  -> scopeReportRows()
  -> buildSalesReport()
```

Records:

```text
requireOwner()
  -> sales by shop_id and period
  -> signed audio url
  -> sale_items by sale ids
  -> RecordCard + details "Товары"
```

Sellers:

```text
requireOwner()
  -> sellers by shop_id
  -> sales by period
  -> sale_items by sale ids
  -> recordsCount + revenue
```

Review:

```text
requireOwner()
  -> records by shop_id and period
  -> filter needs_review
  -> SaleItemCard edit/delete
  -> confirmReviewSale / cancelReviewSale
  -> revalidate report / records / review / sellers
```

## Item mutation flow

```text
SaleItemCard
  -> updateSaleItemAction / excludeSaleItemAction
  -> requireOwner()
  -> sale_items.sale_id -> sales.shop_id access check
  -> Supabase update + returned row
  -> recalculate sales.total_amount/status
  -> revalidate /daily-report and /records
  -> router.refresh()
```

Processed sale item edit keeps item processed and updates revenue.

Review sale item edit saves fields but keeps item review until explicit confirm.

Delete is soft delete:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
```

## Revenue architecture

Revenue is derived from active processed items:

```text
sale_items.status = processed
and deleted_at is null
and price is not null
and total is not null
```

`needs_review`, `cancelled`, `failed`, `excluded` and deleted rows do not participate.

## Diagnostics

Diagnostics route `/debug-telegram` is separate from the main product UI.

Production access requires `DEBUG_TELEGRAM_WEBAPP=true`.

Diagnostics never prints raw initData or secrets.

## References

- [Global spec](../specs/global.md)
- [Telegram confirmation flow](../specs/product/telegram-confirmation-flow.md)
- [WebApp report](../specs/product/webapp-report.md)
- [Sale item editing](../specs/product/sale-item-editing.md)
- [Database](../specs/technical/database.md)
- [WebApp API](../specs/technical/webapp-api.md)
