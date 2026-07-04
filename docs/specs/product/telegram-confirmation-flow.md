# Продуктовая спецификация: сценарий подтверждения в Telegram

## 1. Цель

1. Telegram должен быть основным быстрым местом подтверждения сомнительных voice-записей.
2. Flow должен быть понятным продавцу в момент распознавания.
3. Уверенная запись не должна требовать лишних действий.
4. Сомнительная запись должна быть сохранена; неполные позиции не попадают в выручку, а подтверждённые active `processed` позиции могут учитываться.
5. Повторные нажатия callback-кнопок не должны ломать данные.

## 2. Роли

1. `seller` отправляет voice message и нажимает кнопку решения.
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
6. Статус item resolved as `processed`.
7. Статус sale resolved as `processed`.
8. Статус voice record resolved as `processed`.
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
4. Текст заканчивается знаком пунктуации.

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

## 9. Поведение подтверждения

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
18. Sale получает `status = processed`, если неполных active items больше нет; иначе остаётся `needs_review`.
19. Voice record получает тот же итоговый статус, что sale.
20. Sale total становится суммой active `processed` items.
21. Bot редактирует или отправляет сообщение:

```text
✅ Подтверждено: N позиций, сумма X ₽
```

## 10. Поведение отмены

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
15. Sale total становится `0`.
16. Bot редактирует или отправляет сообщение:

```text
❌ Запись отменена и не входит в отчёт.
```

## 11. Идемпотентность

1. Повторный confirm по `processed` sale не меняет данные.
2. Повторный cancel по `cancelled` sale не меняет данные.
3. Confirm после cancel не восстанавливает товары.
4. Cancel после confirm не откатывает продажу.
5. Telegram edit failure fallback отправляет новое сообщение.
6. Callback answer всегда пытается закрыть Telegram loading state.

## 12. Взаимодействие WebApp

1. WebApp после refresh видит новые статусы.
2. `/review` показывает active `needs_review` items отдельными карточками.
3. `/review` вызывает `confirmReviewSaleAction` и `cancelReviewSaleAction`.
4. WebApp review actions используют те же service-layer rules, что Telegram callback.
5. Needs_review record показывает review state в records.
6. Confirmed sale появляется в active revenue.
7. Cancelled sale не появляется в active revenue.
8. Audio и transcript остаются в records.

## 13. Бизнес-логика

1. Parent `cancelled` не входит в revenue.
2. Parent `failed` не входит в revenue.
3. Parent `needs_review` может содержать active `processed` items, которые входят в revenue.
4. Только item `processed` может участвовать в revenue.
5. Deleted items никогда не участвуют в revenue.
6. Confirm не должен учитывать invalid items.
7. Cancel не должен физически удалять rows.

## 14. Серверная логика

1. Callback handler: `apps/bot/src/handlers/review.handler.ts`.
2. Regex принимает новые и legacy callback formats.
3. Confirm service: `confirmVoiceSaleWithClient`.
4. Cancel service: `cancelVoiceSaleWithClient`.
5. Telegram keyboard: `createVoiceSaleReviewKeyboard`.
6. User message: `createVoiceSaleUserMessage`.
7. Data layer использует Supabase service role только на сервере.
8. Audit logs записываются best effort после успешных решений.
9. Webhook route логирует `telegram_update_received` без секретов.
10. Production webhook должен включать `allowed_updates: ["message", "callback_query"]`.

## 15. Таблицы базы данных

1. `sales.id` является callback target.
2. `sales.status` меняется при решении.
3. `sales.total_amount` меняется при решении.
4. `voice_records.status` повторяет решение sale.
5. `sale_items.status` меняется при confirm/cancel.
6. `sale_items.deleted_at` помечает cancellation items.
7. `audit_logs` хранит metadata решения.

## 16. Ошибки

1. Unknown seller получает сообщение о доступе.
2. Отсутствующие callback data получают generic button error.
3. Sale not found получает `Запись не найдена`.
4. Failed sale confirm получает forbidden message.
5. Если нет ни одной полной позиции, пользователь получает `Не удалось подтвердить: нет ни одной полной позиции.`
6. Неполные items в mixed cart не являются ошибкой confirm и остаются `needs_review`.
7. Supabase errors логируются с callback metadata.
8. Telegram edit failure переключается на `ctx.reply`.

## 17. Крайние случаи

1. Старое сообщение с legacy callback продолжает работать.
2. Seller из другого магазина не может подтвердить sale.
3. Seller из того же магазина, но с другим seller id, не может подтвердить sale.
4. Deleted item игнорируется confirm.
5. Excluded item игнорируется cancel loop.
6. Отсутствие active items означает, что confirm завершается ошибкой.
7. Отсутствие active items при cancel всё равно переводит sale в cancelled и total zero.
8. Audio upload failure не влияет на confirmation.

## 18. Критерии приемки

1. Уверенное voice message возвращает успех без inline buttons.
2. Review voice message возвращает warning ровно с двумя кнопками.
3. Review keyboard не содержит `Открыть отчёт`.
4. Confirm переводит sale/voice/items в `processed`.
5. Confirm добавляет valid items в revenue.
6. Cancel переводит sale/voice в `cancelled`.
7. Cancel выполняет soft-delete items.
8. Cancel оставляет revenue равным нулю.
9. Повторный confirm/cancel безопасен.
10. WebApp `/review` может подтвердить/отменить те же review sales через server actions.

## 19. Вне области

1. Telegram confirmation для отдельной позиции.
2. Многошаговый correction conversation в Telegram.
3. Замена STT/parser.
4. Физическое удаление cancelled sale items.
