# Engineering Rules

## Before code changes

Read:

- `README.md`
- `docs/global-spec.md`
- `docs/specs.md`
- `docs/rules.md`
- `docs/workplan.md`

## During code changes

- Keep changes scoped.
- Prefer shared schemas and utilities.
- Do not duplicate business logic between bot and web.
- Do not change folder structure without docs update.

## After code changes

Update:

- `CHANGELOG.md`
- `docs/workplan.md`
- relevant spec file;
- relevant feature file, if a feature changed.

Run:

```bash
npm run lint
npm run test
npm run build
```
