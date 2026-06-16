# Seller Stories

## S-01 Send voice sale

As a seller, I want to send a voice message so that I do not write sales in a notebook.

Acceptance:

- Seller sends Telegram voice.
- Bot confirms processing.
- Sale is saved if processing succeeds.

## S-02 Simple natural speech

As a seller, I want to speak naturally so that I do not learn a strict form.

Example:

```text
хлеб 3 по 40 молоко 2 по 90
```

Acceptance:

- System extracts bread and milk.
- Quantity and price are saved.

## S-03 Bot confirmation

As a seller, I want to receive confirmation so that I know the record was saved.

Acceptance:

- Bot sends saved cleaned text.
- Bot does not expose technical IDs.

## S-04 Bad voice handling

As a seller, I want a clear error message if the voice cannot be processed.

Acceptance:

- Bot says to try again.
- Error is saved for owner/developer review.
