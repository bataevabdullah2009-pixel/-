# Карта документации

`voice-sales-log` принимает голосовые продажи из Telegram, преобразует их через STT и LLM-парсер в проверяемые позиции, сохраняет данные в Supabase и показывает владельцу отчёты в Web App. Это учебный MVP голосового журнала, а не CRM, склад, касса или платёжная система.

Этот файл — главный навигатор документации. Корневой [README.md](../README.md) остаётся входом для человека, а [AGENTS.md](../AGENTS.md) — входом для ИИ-агента.

## Порядок чтения

1. [Обзор проекта](overview/README.md).
2. [Глобальная спецификация](specs/global.md).
3. [Роли и доступ](specs/product/roles-and-access.md) и [production-readiness](specs/product/production-readiness.md).
4. [Технические спецификации](specs/technical/README.md).
5. [Архитектура](architecture/README.md).
6. [Правила](rules/README.md).
7. [Единственный активный план](plans/active/README.md).
8. [Roadmap](roadmap/roadmap.md) и [журнал изменений](../CHANGELOG.md).

## Разделы

| Раздел | Назначение |
| --- | --- |
| [Overview](overview/README.md) | Короткий маршрут чтения для куратора, разработчика и эксплуатации. |
| [Specs](specs/README.md) | Главная, продуктовые, технические и data-спецификации. |
| [Technical specs](specs/technical/README.md) | Контракты webhook, STT, LLM, БД, отчётов, безопасности и проверок. |
| [Features](features/README.md) | Реализованные, планируемые и исключённые возможности. |
| [Architecture](architecture/README.md) | Компоненты, потоки данных, доверительные границы и технический долг. |
| [Rules](rules/README.md) | Непереговорные правила scope, AI, БД, безопасности, deploy и docs. |
| [Plans](plans/README.md) | Единственный активный план, завершённые результаты и backlog. |
| [Roadmap](roadmap/roadmap.md) | Версии 0.1–1.3 и порядок production-hardening. |
| [Stories](stories/README.md) | Сценарии продавца, владельца и куратора. |
| [Codex skill](../codex/skills/voice-sales-log/SKILL.md) | Проектный workflow и ограничения для Codex. |

## Источники правды

- Текущее поведение продукта: [specs/global.md](specs/global.md).
- Роли и production-ограничения: [specs/product](specs/product/README.md).
- Технические контракты: [specs/technical](specs/technical/README.md).
- Таблицы, статусы и аудит: [specs/data](specs/data/README.md).
- Работа, выполняемая сейчас: [plans/active](plans/active/README.md).
- Будущая работа: [plans/backlog](plans/backlog/README.md).

Планируемое нельзя описывать как реализованное. Если новая задача не входит в MVP, она сначала попадает в backlog, а не в код.
