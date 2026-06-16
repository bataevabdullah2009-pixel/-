# Changelog

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
