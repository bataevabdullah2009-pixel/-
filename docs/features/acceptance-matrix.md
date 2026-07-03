# Acceptance Matrix

Актуально на 2 июля 2026.

| Область | Acceptance criteria | Статус |
| --- | --- | --- |
| Voice processed | Полная запись с товаром, количеством, ценой, total и `confidence >= 0.80` сохраняется как `processed` и входит в отчёт. | Покрыто тестами parser/report. |
| Parser split | `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.` создаёт две `sale_items` и total `850`. | Покрыто `tests/sale-parser.test.ts` и Supabase RPC smoke. |
| Voice review | Неполная или низкоуверенная запись сохраняется как `needs_review` и не входит в выручку. | Покрыто тестами report/status. |
| Telegram callback | Review-message содержит только `✅ Подтвердить` и `❌ Отмена`; callback data `confirm:<id>` / `cancel:<id>`. | Покрыто keyboard regression. |
| Confirm | Confirm переводит sale/voice и валидные active items в `processed`, пересчитывает `total_amount`; неполные mixed-cart items остаются `needs_review`. Если нет полной позиции, показывает `Не удалось подтвердить: нет ни одной полной позиции.` | Покрыто service regression для полной, смешанной и пустой корзины. |
| Cancel | Cancel переводит sale/voice в `cancelled`, items в `excluded` + `deleted_at`, выручка остаётся 0. | Покрыто service regression. |
| Isolation | Callback чужого seller/shop не меняет запись. | Покрыто regression test. |
| Report | Отчёт считает только active `processed` rows с `deleted_at is null`, валидным количеством/весом и total. | Покрыто report tests. |
| WebApp edit | Карточка открывает edit mode, сохраняет `product_name`, `quantity`, `unit`, `price`, пересчитывает `total`, ставит item `processed`, не очищает форму при ошибке. | Реализовано в `SaleItemCard`, `updateSaleItemAction` и `buildManualSaleItemPatch`. |
| WebApp delete | Корзина показывает confirm «Удалить товар из отчёта?», soft-delete без физического удаления. | Реализовано и покрыто patch/report tests. |
| Review actions | WebApp `/review` показывает active `needs_review`, подтверждает, отменяет и bulk-confirm через server actions. | Реализовано в review UX; покрыто service/status tests. |
| Shop auth | `shop_id` не принимается от клиента; WebApp и callback используют server-derived context. | Покрыто auth/scope tests. |
| Diagnostics | `/debug-telegram` скрыт без `DEBUG_TELEGRAM_WEBAPP=true`. | Покрыто auth tests. |

Внешние smoke checks реального Telegram-клиента и Vercel logs остаются post-deploy backlog.
