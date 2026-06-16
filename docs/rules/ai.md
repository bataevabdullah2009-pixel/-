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
- Missing price must be `needs_price`.
