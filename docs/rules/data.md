# Data Rules

## Required fields

- Every table row must have `created_at`.
- Voice records must have `seller_id` when seller exists.
- Sales must keep `raw_text` and `cleaned_text`.
- Sale items must keep `product_name`, `quantity`, `unit`, `price`, `total`, `status`.

## Deletion

- Do not physically delete business records.
- Use statuses for failed or disputed data.

## Audit

Log:

- processing failures;
- parser failures;
- save failures;
- manual correction events, when implemented fully.
