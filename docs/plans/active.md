# Active Plan

Активный план показывает только задачи, которые ещё имеют смысл после текущего MVP.

## Сейчас

| Priority | Task | Status | Notes |
| --- | --- | --- | --- |
| P1 | Заполнить реальные `.env.local` ключи | Active | Нужны Telegram, Supabase, STT, LLM. |
| P1 | Применить Supabase migration в реальном проекте | Active | Supabase CLI локально не установлен. |
| P1 | Проверить live Telegram voice flow | Active | Требует реальные API keys. |
| P2 | Проверить signed audio URL в реальном Storage | Active | Сейчас код готов, нужна Supabase проверка. |
| P2 | Добавить интеграционный тест `records.service` | Planned | После настройки test database или mocks. |

## Definition of Done для активной задачи

Задача считается завершённой, если:

- код или документация обновлены;
- `CHANGELOG.md` обновлён;
- план отмечен;
- `npm run lint`, `npm run test`, `npm run build` проходят;
- если задача связана с логикой, обновлены specs.
