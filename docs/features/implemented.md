# Implemented Features

## Telegram bot

- `/start` command.
- Text message fallback.
- Voice message handler.
- Shared `processTelegramUpdate(update)`.
- Local polling through `npm run bot:dev`.
- Vercel webhook route `/api/telegram/webhook`.
- Telegram webhook secret header validation.
- Telegram audio download.
- Seller registration by Telegram ID.
- Confirmation message after save.
- Failure message after processing error.

## AI pipeline

- STT service for Whisper-compatible API.
- Cleanup text service.
- Sale parser service.
- Strict JSON validation through Zod.
- `needs_review` for empty or uncertain transcript.

## Storage and database

- Supabase Storage upload.
- `shops` table.
- `sellers` table.
- `products` table.
- `voice_records` table.
- `sales` table.
- `sale_items` table.
- `audit_logs` table.
- RLS policies.
- Seed data.

## Web dashboard

- `/daily-report`.
- `/records`.
- `/sellers`.
- Date filters.
- Seller filter.
- Text search.
- Record cards.
- Empty state.
- Review block.
- Manual item correction form for product name, quantity and price.
- Responsive mobile report cards without horizontal scrolling.
- Sticky report summary and manual Supabase refresh action.
- Mobile bottom navigation for reports, records and sellers.
- Route loading skeletons and mobile-friendly empty states.

## Reports

- Grouping by `product_id` or normalized product name.
- Product name normalization for common spoken forms.
- Unit normalization to `шт`.
- Quantity total.
- Revenue total.
- Excluding unknown prices from revenue.
- Review list for disputed items.

## Quality

- npm workspaces.
- TypeScript strict mode.
- ESLint.
- Vitest.
- Shared types.
- Shared Zod schemas.
- Shared date/report utilities.
- Telegram webhook setup and info scripts.
