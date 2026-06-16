# Acceptance Scenarios

## Scenario 1: Voice with prices

Input:

```text
хлеб 3 по 40 молоко 2 по 90
```

Expected:

- `voice_records.status = processed`
- `sales.total_amount = 300`
- sale items:
  - Хлеб, 3, 40, 120, processed
  - Молоко, 2, 90, 180, processed
- Report total: 300 ₽.

## Scenario 2: Voice without price

Input:

```text
чай 2 штуки
```

Expected if product price exists:

- price is loaded from `products.default_price`;
- item can become `processed`.

Expected if product price does not exist:

- `sale_items.status = needs_price`;
- `price = null`;
- `total = null`;
- item appears in “Нужно проверить”;
- item is excluded from revenue.

## Scenario 3: Poor transcript

Input:

```text
...
```

Expected:

- status is `needs_review`;
- system does not invent product;
- owner can review manually.

## Scenario 4: Same product twice

Input A:

```text
хлеб 3 по 40
```

Input B:

```text
хлеб 2 по 40
```

Expected report:

| Товар | Количество | Выручка |
| --- | ---: | ---: |
| Хлеб | 5 шт | 200 ₽ |
