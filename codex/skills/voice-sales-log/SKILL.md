---
name: voice-sales-log
description: Безопасно изменять и документировать репозиторий voice-sales-log. Использовать для задач Telegram webhook и bot, голосового STT/LLM-конвейера, Supabase, отчётов, Web App, тестов, спецификаций, планов и подготовки curator/production release.
---

# Voice sales log

Сохранять основной путь проекта:

```text
Telegram voice → webhook/polling → STT → LLM parser → validation → Supabase → report
```

Не расширять продукт до CRM, склада, кассы, фискализации или онлайн-оплаты.

## Прочитать перед изменением

От корня skill (`codex/skills/voice-sales-log`) прочитать по порядку:

1. `../../../README.md`;
2. `../../../docs/INDEX.md`;
3. `../../../docs/specs/global.md`;
4. `../../../docs/specs/technical/README.md`;
5. `../../../docs/rules/README.md`;
6. `../../../docs/architecture/README.md`;
7. `../../../docs/plans/active/README.md` и четыре файла указанного там единственного плана;
8. этот `SKILL.md`.

Затем прочитать профильную спецификацию и проверить Git-состояние. Не перезаписывать несвязанные изменения пользователя.

## Выбрать workflow

### Telegram webhook или bot

Прочитать `telegram-webhook.md`, `api-spec.md`, `deployment-vercel.md` и `idempotency.md`. Сохранять `POST /api/telegram/webhook`, Node.js runtime, секретный заголовок, безопасное сравнение и общий `processTelegramUpdate`. Polling разрешён только локально.

### Voice, STT или LLM parser

Прочитать `voice-processing.md`, `stt-provider.md`, `llm-parser.md` и правила AI-парсера. Не придумывать значения. Сохранять строгий JSON/Zod, сверку с расшифровкой, порядок позиций, confidence и расчёт итогов приложением. Любое изменение parser требует регрессионных тестов.

### Supabase и данные

Прочитать schema/data specs, все миграции, `auth-and-shop-isolation.md`, `idempotency.md` и `transactions.md`. Создавать новую миграцию для каждого изменения schema. Не переписывать применённые миграции. Держать service role только на сервере. Не выдавать demo RLS за production-безопасность.

### Отчёт и Web App

Прочитать `report-calculation.md`, `frontend-mobile.md`, роли и product acceptance. Сохранять источник отчёта в активных допустимых `sale_items`, server actions для мутаций, пересчёт, аудит, soft delete и исходный диагностический след. Для UI проверять мобильный viewport и отсутствие overflow.

### Документация и планы

Использовать `docs/INDEX.md` как единственную глобальную карту. Не дублировать спецификации. Одновременно оставлять не более одного плана в `docs/plans/active`; завершённый переносить в `completed`, будущий хранить в `backlog`. Задачу вне MVP не реализовывать до отдельной активации.

### Release и production-readiness

Не смешивать curator-ready MVP с production-ready. Для curator release проверять фактические Vercel, Telegram и Supabase шаги. Для production использовать `production-readiness.md` и профильные technical specs; внешнюю проверку не заменять локальной сборкой.

## Непереговорные ограничения

- Не менять webhook без доказанной причины.
- Не менять LLM parser без тестов.
- Не менять schema без migration.
- Не читать и не выводить `.env.local` без необходимости; никогда не коммитить его.
- Не передавать `SUPABASE_SERVICE_ROLE_KEY` клиенту.
- Не физически удалять голос, аудио или продажу при исключении позиции.
- Не доверять `shop_id` клиента как авторизации.
- Не заявлять идемпотентность, транзакционность, monitoring, backup или CI до их реализации и проверки.

## Завершить работу

1. Обновить профильные specs, features/rules и `CHANGELOG.md`.
2. Обновить единственный активный plan; завершённую работу перенести в `completed`.
3. Проверить внутренние ссылки, пустые каталоги и отсутствие устаревших путей.
4. Выполнить `npm run lint`, `npm run test`, `npm run build`.
5. Для UI выполнить browser check; для интеграций перечислить фактически проверенные и непроверенные внешние шаги.
