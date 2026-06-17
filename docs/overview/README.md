# Documentation Map

Документация проекта организована как набор входных файлов и детальных разделов. Главная цель структуры: преподаватель или разработчик должен быстро понять проект без чтения всего кода.

## Быстрый маршрут чтения

1. [README](../../README.md) - запуск и обзор.
2. [Global Spec](../specs/global.md) - полная цель и границы проекта.
3. [Architecture](../architecture/README.md) - поток данных и сущности.
4. [Workplan](../plans/README.md) - общий статус.
5. [Mobile Workplan](../workplan.md) - итог адаптации Telegram Mini App.
6. [Active Plan](../plans/active.md) - что осталось делать.
7. [Rules](../rules/README.md) - правила изменений.
8. [Acceptance Spec](../specs/acceptance.md) - как понять, что проект готов.

## Разделы

| Раздел | Файлы |
| --- | --- |
| Specs | `docs/specs/README.md`, `docs/specs/*` |
| Plans | `docs/workplan.md`, `docs/plans/README.md`, `docs/plans/*` |
| Rules | `docs/rules/README.md`, `docs/rules/*` |
| Features | `docs/features/README.md`, `docs/features/*` |
| Stories | `docs/stories/README.md`, `docs/stories/*` |
| Architecture | `docs/architecture/README.md` |
| Roadmap | `docs/roadmap/README.md` |
| Codex skill | `codex-skills/voice-sales-log/SKILL.md` |
| Scripts | `scripts/set-telegram-webhook.ts`, `scripts/get-telegram-webhook-info.ts` |

## Документные правила

- Главные файлы в корне `docs/` являются индексами и кратким резюме.
- Детальные документы лежат в подпапках.
- Если меняется логика продукта, обновляется `docs/specs/global.md` и нужный файл из `docs/specs/`.
- Если меняется план, обновляется `docs/plans/README.md` и файлы в `docs/plans/`.
- Если меняются правила, обновляется `docs/rules/README.md` и соответствующий файл в `docs/rules/`.
- Если меняется workflow для ИИ-агента, обновляется `codex-skills/voice-sales-log/SKILL.md`.
- Если меняется Telegram production runtime, обновляются README, architecture, bot spec и plans.
