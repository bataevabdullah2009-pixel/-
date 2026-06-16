# Changelog

## [Unreleased]

### Added

- Added shared `processTelegramUpdate(update)` for Telegram updates.
- Added Vercel webhook route at `/api/telegram/webhook` with Telegram `secret_token` header validation.
- Added Telegram webhook management scripts: `npm run telegram:set-webhook` and `npm run telegram:webhook-info`.
- Added `TELEGRAM_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL` to `.env.example`.

### Changed

- Production Telegram processing now uses webhook delivery on Vercel, while `npm run bot:dev` keeps local polling.
- Next.js transitive `postcss` is pinned through npm overrides to avoid the current moderate audit finding.
- Vercel webhook builds now declare `ffmpeg-static` from `apps/web` and externalize it through Next.js server packages.
- Daily report now groups processed sale items by `product_id` first and by normalized product name when `product_id` is missing.
- Product names are normalized for reporting and lookup, including `хлеб` / `Хлеб` / `хлеба` and `молоко` / `молока`.
- Piece units are normalized to `шт`, including `штука`, `штуки`, `штук` and `шт.`.
- Manual correction for review items now edits product name, quantity and price, recalculates total, and moves corrected items to `processed`.

### Fixed

- Fixed Vercel web build by removing `dotenv-cli` from the `apps/web` build script.
- Fixed Vercel voice message processing so missing or failing `ffmpeg-static` falls back to the original Telegram OGG instead of failing the whole webhook flow.
- Prevented duplicate report rows caused by different product casing or piece unit spelling.
- Low confidence, missing quantity and empty product names now consistently stay in manual review instead of being treated as clean processed data.

### Tests

- Added tests for bread and milk normalization, unit normalization, report grouping, missing price status and manual correction status.
- Added tests for audio preparation fallback when `ffmpeg-static` has no binary path or ffmpeg conversion fails.

## [0.1.0] - 2026-06-16

### Added

- Initial project structure.
- Documentation files.
- Strict documentation map with `docs/overview/README.md`.
- Global product specification in `docs/specs/global.md`.
- Detailed specs under `docs/specs/`.
- Active, completed, backlog, release and risks plans under `docs/plans/`.
- Categorized rules under `docs/rules/`.
- Feature catalog under `docs/features/`.
- Role-based user stories under `docs/stories/`.
- Codex project skill under `codex-skills/voice-sales-log`.
- Supabase migration.
- Telegram bot scaffold with voice processing flow.
- Telegram voice OGG/Opus to MP3 conversion before STT.
- Next.js web dashboard with records, sellers and daily report pages.
- Shared Zod schemas, date utilities and report aggregation helpers.
- Minimal Vitest coverage for date ranges, validation, transcript status, processed records, filtering, grouping and revenue.

### Changed

- Documentation index files moved into their own folders: `docs/specs/README.md`, `docs/plans/README.md`, `docs/rules/README.md`, `docs/features/README.md`, `docs/stories/README.md`.
- AGENTS instructions now require checking the global spec and detailed planning docs.
- STT transcription now sends `voice.mp3` as `audio/mpeg` with model `STT_MODEL || whisper-large-v3-turbo`.
- Next.js Turbopack root is pinned to the repository root to avoid parent-lockfile and Cyrillic path inference issues.

### Fixed

- Removed temporary dev log folder from the workspace.
- Fixed STT rejection caused by Telegram voice being sent as `application/octet-stream`.
- Fixed `next build` root inference issue when a parent directory contains another lockfile.
