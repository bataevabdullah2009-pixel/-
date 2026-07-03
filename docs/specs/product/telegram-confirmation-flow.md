# Product Spec: Telegram Confirmation Flow

## 1. Цель

1. Telegram должен быть основным быстрым местом подтверждения сомнительных voice-записей.
2. Flow должен быть понятным продавцу в момент распознавания.
3. Уверенная запись не должна требовать лишних действий.
4. Сомнительная запись должна быть сохранена, но не попадать в выручку до решения.
5. Повторные нажатия callback-кнопок не должны ломать данные.

## 2. Роли

1. `seller` отправляет voice message и нажимает decision button.
2. `bot` обрабатывает voice и callback.
3. `Supabase` хранит записи и товары.
4. `WebApp` показывает результат после обновления и может решать review на вкладке `Проверка`.

## 3. Статусы

1. `processed` - запись подтверждена и входит в отчёт.
2. `needs_review` - запись сохранена, но не входит в отчёт.
3. `cancelled` - запись отменена и не входит в отчёт.
4. `failed` - voice pipeline завершился ошибкой.
5. `excluded` - item-level soft delete.

## 4. Уверенное распознавание

1. Parser вернул валидный товар.
2. Quantity валидна.
3. Price валидна.
4. Total вычисляемый.
5. Confidence достаточный.
6. Item status resolved as `processed`.
7. Sale status resolved as `processed`.
8. Voice record status resolved as `processed`.
9. Sale входит в выручку сразу.
10. Telegram inline review keyboard не показывается.

## 5. Сообщение для уверенной записи

Пример:

```text
✅ Запись сохранена: Сникерс, 5 штук по 100 рублей.
```

Требования:

1. Сообщение не показывает технические статусы.
2. Сообщение не содержит confirm/cancel.
3. Сообщение не содержит `Открыть отчёт`.
4. Текст заканчивается пунктуацией.

## 6. Сомнительное распознавание

Причины:

1. Нет товара.
2. Нет quantity.
3. Нет price.
4. Total отсутствует.
5. Confidence ниже threshold.
6. Parser fallback.
7. Parser/LLM вернул неоднозначный JSON.
8. Есть хотя бы один item не `processed`.

Результат:

1. Sale status `needs_review`.
2. Voice record status `needs_review`.
3. Items остаются active, но не входят в revenue.
4. Telegram отправляет warning message.
5. Под warning message есть только две callback-кнопки.

## 7. Сообщение для сомнительной записи

Пример:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: Буханка хлеба, 3 штуки по 20 рублей. Масло сливочное, 200 грамм, 100 рублей. Шашлык, 10 килограмм по 500 рублей.
```

Клавиатура:

```text
✅ Подтвердить    ❌ Отмена
```

Запрещено:

1. Добавлять третью кнопку `Открыть отчёт`.
2. Добавлять WebApp button в review-message.
3. Добавлять `Подтвердить позицию`.
4. Показывать raw statuses.

## 8. Callback data

Новые callback data:

```text
confirm:<sale_id>
cancel:<sale_id>
```

Legacy callback data:

```text
voice_sale_review:confirm:<sale_id>
voice_sale_review:cancel:<sale_id>
```

Legacy поддерживается только для старых сообщений.

## 9. Confirm behavior

При `✅ Подтвердить`:

1. Handler получает Telegram user id.
2. `requireSeller` разрешает продавца.
3. Sale ищется по `sale_id`, `shop_id`, `seller_id`.
4. Если sale не найден, возвращается понятное сообщение.
5. Если sale уже `processed`, callback успешен и unchanged.
6. Если sale уже `cancelled`, callback успешен и unchanged.
7. Если sale `failed`, confirm forbidden.
8. Active items загружаются с `deleted_at is null`.
9. Excluded items игнорируются.
10. Confirm работает только по связанным `sale_items` и не принимает решение по общему `raw_text`.
11. Для каждого active item проверяются product, quantity/вес, price и/или total.
12. Валидный item имеет осмысленный `product_name`, положительное `quantity`/вес и либо `price`, либо `total`, из которого можно вывести unit price.
13. Если нет валидных items, confirm не выполняется и возвращает `Не удалось подтвердить: нет ни одной полной позиции.`
14. Если active items смешанные, валидные items подтверждаются, а неполные остаются active `needs_review`.
15. Валидные items получают `status = processed`.
16. Валидные items получают `confidence = 1`.
17. Валидные items получают пересчитанные `price` и `total`.
18. Sale получает `status = processed`, чтобы подтверждённые items вошли в выручку.
19. Voice record получает `status = processed`.
20. Sale total становится суммой confirmable items.
21. Bot редактирует или отправляет сообщение:

```text
✅ Подтверждено: N позиций, сумма X ₽
```

## 10. Cancel behavior

При `❌ Отмена`:

1. Handler получает Telegram user id.
2. `requireSeller` разрешает продавца.
3. Sale ищется по `sale_id`, `shop_id`, `seller_id`.
4. Если sale не найден, возвращается понятное сообщение.
5. Если sale уже `cancelled`, callback успешен и unchanged.
6. Если sale уже `processed`, callback успешен и unchanged.
7. Если sale `failed`, cancel forbidden.
8. Active items загружаются с `deleted_at is null`.
9. Каждый active item получает `status = excluded`.
10. Каждый active item получает `deleted_at`.
11. Каждый active item получает `deleted_reason = excluded_by_owner`.
12. Previous status сохраняется в `deleted_previous_status`.
13. Sale получает `status = cancelled`.
14. Voice record получает `status = cancelled`.
15. Sale total becomes `0`.
16. Bot редактирует или отправляет сообщение:

```text
❌ Запись отменена и не входит в отчёт.
```

## 11. Идемпотентность

1. Повторный confirm по `processed` sale не меняет данные.
2. Повторный cancel по `cancelled` sale не меняет данные.
3. Confirm после cancel не восстанавливает товары.
4. Cancel после confirm не откатывает продажу.
5. Telegram edit failure fallback отправляет новое message.
6. Callback answer всегда пытается закрыть Telegram loading state.

## 12. WebApp interaction

1. WebApp после refresh видит новые статусы.
2. `/review` показывает active `needs_review` items отдельными карточками.
3. `/review` вызывает `confirmReviewSaleAction` и `cancelReviewSaleAction`.
4. WebApp review actions используют те же service-layer rules, что Telegram callback.
5. Needs_review record показывает review state в records.
6. Confirmed sale появляется в active revenue.
7. Cancelled sale не появляется в active revenue.
8. Audio and transcript остаются в records.

## 13. Business logic

1. `needs_review` не входит в revenue.
2. `cancelled` не входит в revenue.
3. `failed` не входит в revenue.
4. Only parent sale `processed` can contribute revenue.
5. Only item `processed` can contribute revenue.
6. Deleted items never contribute revenue.
7. Confirm must not count invalid items.
8. Cancel must not physically delete rows.

## 14. Server logic

1. Callback handler: `apps/bot/src/handlers/review.handler.ts`.
2. Regex accepts new and legacy callback formats.
3. Confirm service: `confirmVoiceSaleWithClient`.
4. Cancel service: `cancelVoiceSaleWithClient`.
5. Telegram keyboard: `createVoiceSaleReviewKeyboard`.
6. User message: `createVoiceSaleUserMessage`.
7. Data layer uses Supabase service role on server only.
8. Audit logs are attempted after successful decisions.
9. Webhook route logs `telegram_update_received` without secrets.
10. Production webhook must include `allowed_updates: ["message", "callback_query"]`.

## 15. Database tables

1. `sales.id` is callback target.
2. `sales.status` changes on decision.
3. `sales.total_amount` changes on decision.
4. `voice_records.status` mirrors sale decision.
5. `sale_items.status` changes on confirm/cancel.
6. `sale_items.deleted_at` marks cancellation items.
7. `audit_logs` stores decision metadata.

## 16. Errors

1. Unknown seller gets access message.
2. Missing callback data gets generic button error.
3. Sale not found gets `Запись не найдена`.
4. Failed sale confirm gets forbidden message.
5. Если нет ни одной полной позиции, пользователь получает `Не удалось подтвердить: нет ни одной полной позиции.`
6. Неполные items в mixed cart не являются ошибкой confirm и остаются `needs_review`.
7. Supabase errors are logged with callback metadata.
8. Telegram edit failure falls back to `ctx.reply`.

## 17. Edge cases

1. Old message with legacy callback still works.
2. Seller from another shop cannot confirm sale.
3. Seller from same shop but different seller id cannot confirm sale.
4. Deleted item is ignored by confirm.
5. Excluded item is ignored by cancel loop.
6. No active items means confirm fails.
7. No active items in cancel still sets sale cancelled and total zero.
8. Audio upload failure does not affect confirmation.

## 18. Acceptance criteria

1. Confident voice message returns success without inline buttons.
2. Review voice message returns warning with exactly two buttons.
3. Review keyboard has no `Открыть отчёт`.
4. Confirm sets sale/voice/items to `processed`.
5. Confirm adds valid items to revenue.
6. Cancel sets sale/voice to `cancelled`.
7. Cancel soft-delete items.
8. Cancel keeps revenue zero.
9. Repeat confirm/cancel is safe.
10. WebApp `/review` can confirm/cancel the same review sales through server actions.

## 19. Out of scope

1. Per-item Telegram confirmation.
2. Multi-step correction conversation in Telegram.
3. Replacing STT/parser.
4. Physical deletion of cancelled sale items.
