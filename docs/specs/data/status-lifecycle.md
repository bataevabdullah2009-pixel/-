# Status Lifecycle

Статус: реализовано.

## Sale and voice record

```text
pending
  -> processed
  -> needs_review
  -> cancelled
  -> failed
```

`pending` — техническое начальное состояние.

`processed` — запись подтверждена или уверенно распознана и входит в отчёт.

`needs_review` — запись сохранена, но ждёт решения в Telegram или WebApp `Проверка`.

`cancelled` — пользователь отменил сомнительную voice-запись.

`failed` — pipeline завершился технической ошибкой.

## Sale item

```text
processed
needs_review
needs_price legacy
failed
excluded + deleted_at
```

`processed` входит в выручку.

`needs_review` и `needs_price` не входят.

`failed` не входит.

`excluded` не входит и должен сопровождаться soft-delete metadata.

## Voice recognition decision

```text
complete item + confidence >= 0.80 -> processed
missing/low-confidence/strange item -> needs_review
technical pipeline error -> failed
```

Parser-level review flag не является самостоятельной причиной review, если каждая позиция имеет:

1. Осмысленный товар.
2. `quantity > 0`.
3. `price > 0`.
4. `total > 0`.
5. `confidence >= 0.80`.

## Review decision

```text
needs_review + confirm -> processed
needs_review + cancel -> cancelled
```

Confirm:

1. Переводит sale/voice в `processed`.
2. Переводит валидные active items в `processed`.
3. Добавляет валидные items в выручку.

Cancel:

1. Переводит sale/voice в `cancelled`.
2. Soft-delete active items.
3. Оставляет выручку равной нулю.

Повторные callback/server actions идемпотентны.

## WebApp edit

```text
processed sale + valid item edit -> processed item
needs_review sale + valid item edit -> needs_review item
```

WebApp edit не подтверждает сомнительную voice-запись.

Он только сохраняет товар, количество и цену.

Чтобы review-запись вошла в отчёт, требуется confirm в Telegram или WebApp `Проверка`.

## Soft delete

```text
active item -> excluded + deleted_at
excluded item -> restore previous status
```

Soft delete:

1. Не удаляет row физически.
2. Сохраняет previous status.
3. Убирает item из active report.
4. Пересчитывает sale.

Restore:

1. Очищает deleted metadata.
2. Возвращает previous status.
3. Влияет на revenue только если previous status был `processed`.

## User labels

Пользователь видит:

1. `processed` -> «Готово».
2. `needs_review`, `needs_price`, `pending`, `failed` -> «Нужно проверить».
3. `cancelled`, `excluded` -> «Исключено».

Internal enum не показываются в UI.

## Revenue rule

В выручку входит только:

```text
sale_item.status = processed
and sale_item.deleted_at is null
and total is not null
and quantity_or_weight is valid
and (unit_price is not null or unit_price can be derived from total)
```

`needs_review`, `cancelled`, `failed`, `excluded` и soft-deleted rows не входят.

Mixed processed sale допустима после confirm: parent sale получает `processed`, валидные items получают `processed`, а неполные active items остаются `needs_review` и продолжают отображаться в review list без влияния на revenue.
