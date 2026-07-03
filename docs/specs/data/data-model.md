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

Новая voice-позиция становится `processed`, если товар осмысленный, количество/вес и цена либо итоговая сумма распознаны, `confidence >= 0.80`. Единицы веса хранятся в `quantity` + `unit`: `кг` как килограммы, `г` как граммы; total для граммов считается как доля килограмма от unit price. `бутылка/бутылки/бутылок` нормализуются в `шт`. Иначе позиция сохраняется как `needs_review`.

Deterministic parser fallback создаёт отдельную `sale_items` row для каждого товара, найденного по evidence в transcript. Если часть фразы неполная, она сохраняется отдельной `needs_review` row, а не склеивается с валидным товаром.

`sales.total_amount` равен сумме активных `processed` items с валидным `total`. `sales.status = processed`, если запись уверенная или явно подтверждена. После mixed confirm parent sale может быть `processed`, while неполные active `sale_items` остаются `needs_review` и не входят в выручку. `sales.status = needs_review`, если запись ждёт confirm/cancel. `sales.status = cancelled`, если пользователь нажал `❌ Отмена` или WebApp `Отмена`.

WebApp edit review item сохраняет поля, пересчитывает `total` и может перевести item row в `processed`, но не переводит parent sale в `processed`. Такая позиция войдёт в выручку только после Telegram/WebApp confirm parent sale.
