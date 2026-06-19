# GitHub Actions

## Цель

Автоматически блокировать изменения, которые не проходят lint, tests, build или содержат запрещённый env-файл.

## Результат

- workflow на PR и main;
- `npm ci`, `npm run lint`, `npm run test`, `npm run build`;
- проверка `.env.local`, миграций и Markdown-ссылок;
- минимальные permissions и branch protection.

Детали: `docs/specs/technical/github-actions.md`.
