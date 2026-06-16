# Changelog

## [0.1.0] - 2026-06-16

### Added

- Initial project structure.
- Documentation files.
- Strict documentation map with `docs/README.md`.
- Global product specification in `docs/global-spec.md`.
- Detailed specs under `docs/specs/`.
- Active, completed, backlog, release and risks plans under `docs/plans/`.
- Categorized rules under `docs/rules/`.
- Feature catalog under `docs/features/`.
- Role-based user stories under `docs/stories/`.
- Supabase migration.
- Telegram bot scaffold with voice processing flow.
- Next.js web dashboard with records, sellers and daily report pages.
- Shared Zod schemas, date utilities and report aggregation helpers.
- Minimal Vitest coverage for date ranges, validation, transcript status, processed records, filtering, grouping and revenue.

### Changed

- `docs/specs.md`, `docs/workplan.md`, `docs/rules.md`, `docs/features.md` and `docs/user-stories.md` now work as clean index files instead of mixed long documents.
- AGENTS instructions now require checking the global spec and detailed planning docs.

### Fixed

- Removed temporary dev log folder from the workspace.
