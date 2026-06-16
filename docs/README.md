# Documentation Map

Документация проекта организована как набор входных файлов и детальных разделов. Главная цель структуры: преподаватель или разработчик должен быстро понять проект без чтения всего кода.

## Быстрый маршрут чтения

1. [README](../README.md) - запуск и обзор.
2. [Global Spec](./global-spec.md) - полная цель и границы проекта.
3. [Architecture](./architecture.md) - поток данных и сущности.
4. [Workplan](./workplan.md) - общий статус.
5. [Active Plan](./plans/active.md) - что осталось делать.
6. [Rules](./rules.md) - правила изменений.
7. [Acceptance Spec](./specs/acceptance.md) - как понять, что проект готов.

## Разделы

| Раздел | Файлы |
| --- | --- |
| Specs | `docs/specs.md`, `docs/global-spec.md`, `docs/specs/*` |
| Plans | `docs/workplan.md`, `docs/plans/*` |
| Rules | `docs/rules.md`, `docs/rules/*` |
| Features | `docs/features.md`, `docs/features/*` |
| Stories | `docs/user-stories.md`, `docs/stories/*` |
| Architecture | `docs/architecture.md` |
| Roadmap | `docs/roadmap.md` |

## Документные правила

- Главные файлы в корне `docs/` являются индексами и кратким резюме.
- Детальные документы лежат в подпапках.
- Если меняется логика продукта, обновляется `docs/global-spec.md` и нужный файл из `docs/specs/`.
- Если меняется план, обновляется `docs/workplan.md` и файлы в `docs/plans/`.
- Если меняются правила, обновляется `docs/rules.md` и соответствующий файл в `docs/rules/`.
