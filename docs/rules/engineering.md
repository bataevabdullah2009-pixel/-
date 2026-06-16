# Engineering Rules

## Before code changes

Read:

- `README.md`
- `docs/specs/global.md`
- `docs/specs/README.md`
- `docs/rules/README.md`
- `docs/plans/README.md`

## During code changes

- Keep changes scoped.
- Prefer shared schemas and utilities.
- Do not duplicate business logic between bot and web.
- Keep Telegram update handling in `processTelegramUpdate(update)` so polling and webhook use the same logic.
- Keep polling local-only through `npm run bot:dev`.
- Do not change folder structure without docs update.

## After code changes

Update:

- `CHANGELOG.md`
- `docs/plans/README.md`
- relevant spec file;
- relevant feature file, if a feature changed.

Run:

```bash
npm run lint
npm run test
npm run build
```
