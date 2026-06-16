# Roadmap

Roadmap показывает развитие проекта по версиям. Детальный план выполнения лежит в [Workplan](../plans/README.md), активные задачи - в [Active Plan](../plans/active.md).

## Version table

| Version | Focus | Status |
| --- | --- | --- |
| 0.1 | Project structure, documentation, Supabase schema | Done |
| 0.2 | Telegram bot, voice messages, audio storage | Done |
| 0.3 | STT, cleanup text, sale parser, records saving | Done |
| 0.4 | Web dashboard, records list, filters, search | Done |
| 0.5 | Products, sale items, daily report, revenue | Done |
| 0.6 | Strict documentation system and project governance | Done |
| 1.0 | Stable MVP with Vercel webhook ready for teacher review | In progress |

## Version 0.1

- Structure project.
- Add README.
- Add AGENTS.
- Add documentation base.
- Add Supabase migration.

## Version 0.2

- Add Telegram bot.
- Add `/start`.
- Receive voice messages.
- Download audio.
- Upload audio to Supabase Storage.

## Version 0.3

- Add STT service.
- Add cleanup text service.
- Add sale parser.
- Save voice records.
- Save sales.
- Save sale items.

## Version 0.4

- Add Next.js web dashboard.
- Add records page.
- Add sellers page.
- Add date filters.
- Add seller filter.
- Add text search.

## Version 0.5

- Add products table.
- Add item extraction.
- Add daily report.
- Add weekly, monthly and yearly period filters.
- Add grouping.
- Add revenue calculation.
- Add review block.

## Version 0.6

- Add `docs/specs/global.md`.
- Split specs into detailed documents.
- Add active/completed/backlog plans.
- Split rules by category.
- Split features by status.
- Split user stories by role.

## Version 1.0

Required before final teacher demo:

- Fill real env values locally.
- Add production env values in Vercel.
- Apply Supabase migration.
- Register Telegram webhook with `npm run telegram:set-webhook`.
- Run live Telegram voice flow through webhook.
- Verify record in Supabase.
- Verify `/daily-report` with real data.
- Run `npm run lint`.
- Run `npm run test`.
- Run `npm run build`.

## After MVP

- Export to Excel.
- Better manual correction.
- Roles owner/seller.
- PWA mode.
- More integration tests.
