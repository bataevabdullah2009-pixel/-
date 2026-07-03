# Acceptance Matrix

Актуально на 2026-07-03.

| Область | Acceptance criteria | Статус |
| --- | --- | --- |
| Voice processed | Полная запись с товаром, количеством, ценой, total и `confidence >= 0.80` сохраняется как `processed` и входит в отчёт. | Покрыто parser/report tests. |
| Parser split | `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.` создаёт две `sale_items` и total `850`. | Покрыто `tests/sale-parser.test.ts` и Supabase RPC smoke из changelog. |
| Parser fallback | Invalid LLM JSON или recoverable parser failure создаёт reviewable items, а не теряет продажу. | Покрыто parser fallback tests. |
| Voice review | Неполная или низкоуверенная запись сохраняется как `needs_review` и не включает неполные items в выручку. | Покрыто status/report tests. |
| Telegram keyboard | Review-message содержит только `✅ Подтвердить` и `❌ Отмена`. | Покрыто keyboard regression. |
| Callback data | Новые callback data имеют формат `confirm:<id>` и `cancel:<id>`, legacy prefix принимается. | Покрыто callback parsing tests. |
| Webhook delivery | Production webhook установлен с `allowed_updates: ["message", "callback_query"]`. | Покрыто script/docs; требует live webhook-info после deploy. |
| Confirm full sale | Confirm переводит все валидные active items в `processed`, sale/voice в `processed`, пересчитывает `total_amount`. | Покрыто service regression. |
| Confirm mixed sale | Confirm подтверждает валидные active items, оставляет неполные active items `needs_review`, parent sale может остаться `needs_review`. | Покрыто mixed-cart regression. |
| Confirm no valid item | Если нет полной позиции, confirm возвращает `Не удалось подтвердить: нет ни одной полной позиции.` и не меняет строки. | Покрыто no-confirmable regression. |
| Confirm idempotency | Повторный confirm already processed sale возвращает `✅ Уже подтверждено`. | Покрыто idempotency regression. |
| Cancel | Cancel review sale переводит sale/voice в `cancelled`, active items в `excluded` + `deleted_at`, total становится 0. | Покрыто service regression. |
| Cancel idempotency | Повторный cancel already cancelled sale возвращает unchanged success. | Покрыто service regression. |
| Isolation | Callback чужого seller/shop не меняет запись. | Покрыто regression test. |
| Report revenue | Отчёт считает только active `processed` rows с `deleted_at is null`, валидным количеством/весом и total. | Покрыто report tests. |
| Parent review revenue | Active `processed` item внутри parent `needs_review` sale входит в revenue, если parent не `cancelled`/`failed`. | Покрыто 2026-07-03 revenue tests. |
| Exclusions | `needs_review`, `needs_price`, `failed`, `excluded`, deleted rows, parent `cancelled`/`failed` не входят в revenue. | Покрыто report/status tests. |
| WebApp edit | Карточка открывает edit mode, сохраняет `product_name`, `quantity`, `unit`, `price`, пересчитывает `total`, ставит item `processed`. | Реализовано в `SaleItemCard`, `updateSaleItemAction`, `buildManualSaleItemPatch`. |
| Review edit revenue | Валидный edit review item может сделать конкретную item row `processed` и включить её в выручку без скрытого confirm всей sale. | Покрыто save-then-confirm/revenue tests. |
| WebApp delete | Корзина показывает confirm `Удалить товар из отчёта?`, выполняет soft delete без физического удаления. | Реализовано и покрыто patch/report tests. |
| Restore | Soft-deleted item может быть восстановлен с previous status и пересчётом sale. | Реализовано; ручной smoke нужен перед release. |
| Reset day | Сброс дня soft-delete active items одного дня и не удаляет `sales`. | Реализовано; требует product smoke перед release. |
| Review page | `/review` показывает active review items, поддерживает confirm, cancel и bulk confirm через server actions. | Реализовано и покрыто service/status tests. |
| Records journal | `/records` показывает voice-sale журнал, search, seller filter, audio link при наличии и раскрытие товаров. | Реализовано; покрыто records tests. |
| Sellers page | `/sellers` показывает active state, records count, last activity и revenue за период. | Реализовано; покрыто report/scope logic. |
| Shop auth | `shop_id` не принимается от клиента; WebApp и callback используют server-derived context. | Покрыто auth/scope tests. |
| Owner binding | Active owner без seller может создать seller binding только в owner shop. | Покрыто Telegram principal tests. |
| Fallback | Browser fallback требует `ALLOW_WEBAPP_FALLBACK`, `DEFAULT_SHOP_ID`, `DEFAULT_SELLER_ID` и matching seller shop. | Покрыто WebApp session tests. |
| Diagnostics | `/debug-telegram` скрыт без `DEBUG_TELEGRAM_WEBAPP=true` в production. | Покрыто auth/diagnostics tests. |
| Errors | Auth/DB errors отображаются явно и не превращаются в пустой отчёт. | Реализовано в records API messages; проверять smoke. |
| Secrets | Raw initData, bot token, webhook secret и service role key не логируются. | Проверяется review/log discipline; требует deployment log check. |

## Release smoke backlog

Перед production release отдельно проверить:

1. Реальное открытие WebApp через Telegram кнопку.
2. Реальный `initDataLength > 0`.
3. Совпадение seller/shop в auth log и report log.
4. `npm run telegram:webhook-info` на production env.
5. Voice processed scenario.
6. Voice review scenario.
7. Telegram confirm.
8. Telegram cancel.
9. WebApp review confirm.
10. WebApp edit/delete/restore.
