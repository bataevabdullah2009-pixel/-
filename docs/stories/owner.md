# Owner Stories

## O-01 Daily report

As an owner, I want to see a daily sales table so that I do not calculate voice notes manually.

Acceptance:

- `/daily-report` shows product, quantity, revenue.
- Same products are grouped.
- Total row is visible.

## O-02 Quantity sold

As an owner, I want to see quantity sold per product.

Acceptance:

- Report sums quantity by product.
- Unit is shown.

## O-03 Daily revenue

As an owner, I want to see total revenue for the selected period.

Acceptance:

- Revenue includes only processed items with known price.
- Unknown prices are excluded.

## O-04 Review missing prices

As an owner, I want to see items without price so that I can fix them manually.

Acceptance:

- `needs_price` items appear in “Нужно проверить”.
- Owner can enter price and save.

## O-05 Search records

As an owner, I want to search records by text.

Acceptance:

- `/records` has search field.
- Search filters raw or cleaned text.

## O-06 Filter by seller

As an owner, I want to filter records by seller.

Acceptance:

- `/records` has seller filter.
- Records list changes by selected seller.
