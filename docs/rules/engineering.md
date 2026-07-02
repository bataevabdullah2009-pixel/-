# Engineering Rules

- Сначала читать `README.md`, локальные specs и текущий diff.
- Перед WebApp изменением читать `docs/specs/product/webapp-report.md` и `docs/specs/product/sale-item-editing.md`.
- Перед БД изменением читать `docs/specs/technical/database.md`.
- Перед Telegram изменением читать `docs/specs/technical/telegram-webapp-session.md`.
- Не переписывать несвязанные изменения.
- Для shared logic добавлять focused regression tests.
- Все Mini App browser requests идут через `apiFetch()`.
- Все Web App server reads/mutations идут через `resolveRequestContext()` / `requireOwner()`.
- После каждого изменения кода агент обязан обновлять документацию, changelog, активные планы и технические спецификации так, чтобы они соответствовали фактическому состоянию проекта. Запрещено оставлять документацию, противоречащую текущему коду.
- Не оставлять устаревшие документы и не заявлять готовность до успешных release checks.
- Не трогать voice/STT/parser/webhook и не делать большие переписывания без прямой необходимости.
- Перед финалом запускать `npm run lint`, `npm run test`, `npm run build` или честно указать, что команда не запускалась/упала.
