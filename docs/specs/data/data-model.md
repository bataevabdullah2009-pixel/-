# Data Model

Одна Telegram voice запись создаёт:

- `voice_records` — исходный/очищенный текст, parser JSON, статус pipeline, аудио metadata;
- `sales` — агрегат продажи, seller/shop, total amount;
- один или несколько `sale_items` — товарные позиции.

`voice_records.status` и `sales.status`:

- `pending` — техническое начальное состояние;
- `processed` — запись готова и входит в отчёт;
- `needs_review` — запись ждёт решения в Telegram или WebApp `Проверка`;
- `cancelled` — запись отменена пользователем;
- `failed` — обработка завершилась ошибкой.

`sale_items.status`:

- `processed` — позиция готова и входит в отчёт;
- `needs_review` — позицию нужно проверить;
- `needs_price` — legacy состояние старых строк, в UI равно «Нужно проверить»;
- `failed` — технически неудачная позиция, в UI равно «Нужно проверить»;
- `excluded` — soft-deleted позиция.

Новая voice-позиция становится `processed`, если товар осмысленный, количество и цена распознаны, `confidence >= 0.80`. Иначе она сохраняется как `needs_review`.

`sales.total_amount` равен сумме активных `processed` items. `sales.status = processed`, если запись уверенная или явно подтверждена. `sales.status = needs_review`, если запись ждёт confirm/cancel. `sales.status = cancelled`, если пользователь нажал `❌ Отмена` или WebApp `Отмена`.

WebApp edit review item сохраняет поля, но не переводит sale в `processed`.
