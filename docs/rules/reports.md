# Report Rules

## Main table

The main report table contains only:

- product;
- quantity;
- revenue.

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

## Forbidden in main report

- seller name;
- exact sale time;
- raw transcript;
- technical statuses;
- ids;
- error messages.
