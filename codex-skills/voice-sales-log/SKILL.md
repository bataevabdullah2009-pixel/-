---
name: voice-sales-log
description: Project workflow and guardrails for changing the voice-sales-log repository. Use when Codex edits this project, updates Telegram voice processing, Supabase records, report logic, documentation, plans, rules, features, user stories, or prepares commits for this repository.
---

# Voice Sales Log

## Core Rule

Keep the project focused on one flow:

```text
Telegram voice -> STT -> cleaned text -> sale items -> database -> report
```

Do not turn it into CRM, warehouse, cash register, fiscal system, payment system, or full product catalog.

## Required Reading

Before changing project logic, read:

- `../../README.md`
- `../../docs/specs/global.md`
- `../../docs/specs/README.md`
- `../../docs/rules/README.md`
- `../../docs/plans/README.md`

For quick navigation, read `references/project-map.md`.

## Voice Processing

When touching Telegram voice, STT, audio storage, or transcription:

1. Read `references/voice-processing.md`.
2. Preserve explicit filename and content type for audio files.
3. Convert Telegram OGG/Opus voice to MP3 before STT unless the task explicitly changes this rule.
4. Send STT multipart `file` with `filename=voice.mp3` and `Content-Type: audio/mpeg`.
5. Log Telegram file id, downloaded size, STT filename, STT MIME type, and STT error response.

## Documentation Rules

Docs are organized by folders:

- specs: `../../docs/specs/`
- plans: `../../docs/plans/`
- rules: `../../docs/rules/`
- features: `../../docs/features/`
- stories: `../../docs/stories/`
- architecture: `../../docs/architecture/`
- roadmap: `../../docs/roadmap/`

Do not add random markdown files to `docs/` root. Put each document into the right folder.

## Completion Checklist

Before finishing:

1. Update `../../CHANGELOG.md`.
2. Update the relevant plan in `../../docs/plans/`.
3. Update specs/rules/features/stories if logic or scope changed.
4. Run:

```bash
npm run lint
npm run test
npm run build
```

For bot runtime changes, also run or explain the result of:

```bash
npm run bot:dev
```
