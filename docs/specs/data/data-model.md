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

Новая voice-позиция становится `processed`, если товар осмысленный, количество/вес и цена либо итоговая сумма распознаны, `confidence >= 0.80`. Единицы веса хранятся в `quantity` + `unit`: `кг` как килограммы, `г` как граммы; total для граммов считается как доля килограмма от unit price. Иначе позиция сохраняется как `needs_review`.

`sales.total_amount` равен сумме активных `processed` items с валидным `total`. `sales.status = processed`, если запись уверенная или явно подтверждена. После mixed confirm parent sale может быть `processed`, while неполные active `sale_items` остаются `needs_review` и не входят в выручку. `sales.status = needs_review`, если запись ждёт confirm/cancel. `sales.status = cancelled`, если пользователь нажал `❌ Отмена` или WebApp `Отмена`.

WebApp edit review item сохраняет поля, но не переводит sale в `processed`.
