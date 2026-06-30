# Telegram confirmation flow

Статус: реализовано.

## Цель

Сомнительная voice-запись должна решаться там, где она появилась: в Telegram под сообщением бота.

WebApp показывает review-состояние, но не содержит кнопок подтверждения или отмены voice-записи.

Пользователь должен видеть простое решение:

```text
✅ Подтвердить
❌ Отмена
```

## Когда flow запускается

Flow запускается, если сохранённая voice-продажа получила `needs_review`.

Причины:

1. Нет товара.
2. Нет количества.
3. Нет цены.
4. Цена или количество невалидны.
5. Confidence ниже `0.80`.
6. Название товара не выглядит осмысленным.
7. Parser вернул fallback.
8. Multi-item запись содержит неполные позиции.

Уверенная запись не получает confirm/cancel keyboard.

## Сообщение для уверенной записи

Пример:

```text
✅ Запись сохранена: Сникерс, 5 штук по 100 рублей.
```

Требования:

1. Статус sale — `processed`.
2. Статус voice record — `processed`.
3. Валидные items — `processed`.
4. Запись сразу входит в отчёт.
5. Inline confirm/cancel keyboard не показывается.
6. Bot success отправляется только после Supabase read-back.

## Сообщение для сомнительной записи

Пример:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: Буханка хлеба, 3 штуки по 20 рублей. Масло сливочное, 200 грамм, 100 рублей. Шашлык, 10 килограмм по 500 рублей.
```

Под сообщением только две inline-кнопки:

1. `✅ Подтвердить`.
2. `❌ Отмена`.

Нельзя добавлять:

1. «Открыть отчёт».
2. «Диагностика Telegram».
3. «Подтвердить позицию».
4. Любую URL-кнопку.

Кнопка отчёта остаётся в `/start`, reply keyboard и menu button.

## Callback contract

Callback data:

```text
voice_sale_review:<action>:<sale_id>
```

`action`:

1. `confirm`.
2. `cancel`.

Callback не содержит `shop_id`.

Callback не содержит seller id.

Сервер сам определяет пользователя через Telegram update.

## Authorization

При callback:

1. Сервер читает `ctx.from.id`.
2. Сервер ищет active seller по Telegram id.
3. Сервер читает sale по `sale_id`.
4. Сервер проверяет `sale.shop_id = seller.shopId`.
5. Сервер проверяет `sale.seller_id = seller.id`.
6. Чужая sale не изменяется.
7. Неактивный seller не изменяет запись.
8. Unknown seller получает пользовательскую ошибку.

`shop_id` не принимается из клиента.

## Confirm behavior

При `✅ Подтвердить`:

1. Сервер читает active sale_items.
2. Сервер оставляет только валидные позиции.
3. Валидная позиция имеет осмысленный товар.
4. Валидная позиция имеет `quantity > 0`.
5. Валидная позиция имеет `price > 0`.
6. Валидная позиция имеет рассчитанный `total`.
7. Валидные позиции получают `status = processed`.
8. Валидные позиции получают `confidence = 1`.
9. Sale получает `status = processed`.
10. Voice record получает `status = processed`.
11. `sales.total_amount` становится суммой валидных processed items.
12. Bot редактирует или отправляет сообщение:

```text
✅ Запись подтверждена и добавлена в отчёт.
```

Если нет ни одной валидной позиции, confirm не выполняется.

В этом случае пользователь получает сообщение, что нужны товар, количество и цена хотя бы в одной позиции.

## Cancel behavior

При `❌ Отмена`:

1. Сервер читает active sale_items.
2. Каждая active позиция получает soft delete.
3. `status = excluded`.
4. `deleted_at = now()`.
5. `deleted_reason = excluded_by_owner`.
6. `deleted_previous_status` сохраняет прежний статус.
7. Sale получает `status = cancelled`.
8. Voice record получает `status = cancelled`.
9. `sales.total_amount = 0`.
10. Bot редактирует или отправляет сообщение:

```text
❌ Запись отменена и не входит в отчёт.
```

Отменённая запись не входит в выручку.

WebApp не показывает её в активных продажах.

## Идемпотентность

Повторное confirm на уже processed sale:

1. Не меняет данные.
2. Возвращает успешное пользовательское сообщение.
3. Не создаёт дублей.

Повторная cancel на already cancelled sale:

1. Не меняет данные.
2. Возвращает успешное пользовательское сообщение.
3. Не пытается повторно удалить items.

Confirm после cancel:

1. Не восстанавливает запись.
2. Не возвращает выручку.

Cancel после confirm:

1. Не откатывает processed запись.
2. Не удаляет товары.

Первое принятое решение выигрывает.

## WebApp interaction

После confirm:

1. Запись становится `processed`.
2. Items входят в report totals.
3. В WebApp после refresh они видны в активных продажах.

После cancel:

1. Запись становится `cancelled`.
2. Items soft-deleted.
3. Items не видны в активном отчёте.
4. Revenue не меняется.

Если WebApp открыт во время callback, пользователь обновляет экран или нажимает refresh.

## Ошибки

1. Sale не найдена — стабильное сообщение.
2. Seller не найден — «Ваш Telegram не привязан к магазину».
3. Supabase update error — server log и пользовательская ошибка.
4. Telegram edit message может не сработать.
5. Если edit не сработал, bot отправляет обычный reply.
6. Callback answer всегда отправляется, чтобы Telegram не держал spinner.

## Acceptance criteria

1. Уверенная запись не получает confirm/cancel keyboard.
2. Сомнительная запись получает ровно две inline-кнопки.
3. В review-message нет «Открыть отчёт».
4. Confirm переводит sale в `processed`.
5. Confirm добавляет валидные items в выручку.
6. Cancel переводит sale в `cancelled`.
7. Cancel soft-delete active items.
8. Cancel не добавляет выручку.
9. Повторные callback не ломают данные.
10. Callback не принимает `shop_id` от клиента.
11. WebApp не показывает confirm/cancel controls.
12. Tests покрывают confirm, cancel и keyboard contract.

## Не входит в scope

1. Подтверждение отдельных позиций в WebApp.
2. Третья кнопка в review-message.
3. Физическое удаление sale.
4. Изменение STT.
5. Изменение parser prompt.
6. Клиентский выбор магазина.
