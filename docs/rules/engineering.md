# Engineering Rules

- Сначала читать локальные specs и текущий diff.
- Не переписывать несвязанные изменения.
- Для shared logic добавлять focused regression tests.
- Все Mini App browser requests идут через `apiFetch()`.
- Все Web App server reads/mutations идут через `resolveRequestContext()` / `requireOwner()`.
- После кода обновить README, specs/features/rules, plans, roadmap и changelog.
- Перед финалом запускать `npm run lint`, `npm run test`, `npm run build` или честно указать, что команда не запускалась/упала.
