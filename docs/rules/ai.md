# AI Rules

## Allowed AI actions

- Speech to text.
- Punctuation cleanup.
- Readability cleanup.
- Extract products mentioned by the seller.
- Return strict JSON.

## Forbidden AI actions

- Invent product.
- Invent price.
- Invent category.
- Invent analytics.
- Invent revenue.
- Treat unknown price as zero revenue in report.

## Confidence

- `confidence >= 0.75` can be processed if price is known.
- `confidence < 0.75` must be `needs_review`.
- Empty transcript must be `needs_review`.
- Empty `product_name` must be `needs_review`.
- `quantity = null` must become `quantity = 1` and `needs_review`.
- Missing price must be `needs_price`.

## Normalization

- Product lookup uses a trimmed lower-case normalized key.
- Simple spoken forms are normalized before report grouping: `хлеба` -> `Хлеб`, `молока` -> `Молоко`.
- Piece units are normalized to `шт`: `штука`, `штуки`, `штук`, `шт.`.
- Missing unit defaults to `шт`.
