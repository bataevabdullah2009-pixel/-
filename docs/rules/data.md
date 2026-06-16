# Data Rules

## Required fields

- Every table row must have `created_at`.
- Voice records must have `seller_id` when seller exists.
- Sales must keep `raw_text` and `cleaned_text`.
- Sale items must keep `product_name`, `quantity`, `unit`, `price`, `total`, `status`.
- Sale items should keep `product_id` when a matching product is found.
- Sale item `unit` must be normalized before reporting and correction saves.
- Corrected sale items must recalculate `total` from `quantity * price`.

## Deletion

- Do not physically delete business records.
- Use statuses for failed or disputed data.

## Audit

Log:

- processing failures;
- parser failures;
- save failures;
- manual correction events, when implemented fully.

## Status rules

- `confidence < 0.75` -> `needs_review`.
- Empty `product_name` -> `needs_review`.
- Missing or invalid `quantity` -> save `quantity = 1` and use `needs_review`.
- Missing price after default product lookup -> `needs_price`.
- Valid manual correction with product, quantity and price -> `processed`.
