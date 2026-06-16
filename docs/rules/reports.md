# Report Rules

## Main table

The main report table contains only:

- product;
- quantity;
- revenue.

It must not show seller name, sale time, technical statuses or ids.

## Grouping

Report rows must be grouped:

1. By `product_id`, when it exists.
2. By normalized product name, when `product_id` is missing.

If a processed item without `product_id` has the same normalized name as an existing product group,
it must be merged into that product group.

Product normalization must collapse casing and simple forms:

- `хлеб`, `Хлеб`, `хлеба` -> `Хлеб`;
- `молоко`, `молока` -> `Молоко`.

Piece units must be displayed as `шт`:

- `штука`;
- `штуки`;
- `штук`;
- `шт.`.

Missing unit defaults to `шт`.

## Revenue

Revenue includes only sale items where:

- `status = processed`;
- `price` is not null;
- `total` is not null.

## Review block

The review block contains:

- `needs_price`;
- `needs_review`;
- `failed`;
- low confidence items.

Manual correction must allow editing `product_name`, `quantity` and `price`.
After save, the item total is recalculated and a valid corrected item becomes `processed`.

## Forbidden in main report

- seller name;
- exact sale time;
- raw transcript;
- technical statuses;
- ids;
- error messages.
