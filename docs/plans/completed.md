# Completed Plan

## Завершено

| Area | Completed |
| --- | --- |
| Repo setup | npm workspaces, TypeScript, ESLint, Vitest. |
| Documentation | README, AGENTS, CHANGELOG, specs, rules, stories, plans, roadmap, architecture. |
| Documentation structure | Root docs markdown moved into themed folders with README index files. |
| Codex skill | Added `codex-skills/voice-sales-log` with project workflow references. |
| Shared package | Types, Zod schemas, date range, report aggregation. |
| Supabase | Migration, seed, RLS, Storage bucket policy. |
| Bot | `/start`, text handler, voice handler, Telegram download, STT, LLM, records service. |
| Bot runtime | Shared `processTelegramUpdate(update)`, local polling and Vercel webhook entrypoint. |
| Voice STT fix | Telegram OGG/Opus is converted to MP3 and sent to STT as `audio/mpeg` with `voice.mp3`. |
| Vercel voice fallback | If `ffmpeg-static` is unavailable or conversion fails, original Telegram OGG is sent to STT as `audio/ogg` with `voice.ogg`. |
| Web | `/daily-report`, `/records`, `/sellers`, filters, cards, forms. |
| Mobile web | Telegram Mini App layout, report cards, sticky summary, compact filters, bottom navigation and loading states. |
| Webhook scripts | `telegram:set-webhook` and `telegram:webhook-info`. |
| Reports | Grouping by product id or normalized name, total revenue, review block, manual correction. |
| Stabilization | Product normalization, unit normalization, confidence/status rules. |
| Voice parsing diagnostics | Raw/cleaned text, full parser JSON, status/error storage and stage audit logs. |
| Deterministic parser validation | Explicit quantity/price markers, kg support, total recalculation and multi-item preservation. |
| Tests | Date ranges, validation, transcript status, processed record, grouping, revenue, manual correction. |
| Checks | `npm run lint`, `npm run test`, `npm run build`. |

## Verified commands

```bash
npm run lint
npm run test
npm run build
```

## Last verified result

- Lint: passed.
- Tests: 25 passed.
- Build: passed for bot, web and shared workspaces.
- Bot dev: not re-run for this stabilization to avoid duplicate Telegram polling; bot build passed.
