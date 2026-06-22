---
name: voice-sales-log
description: Безопасно изменять и документировать репозиторий voice-sales-log. Использовать для задач Telegram webhook и bot, голосового STT/LLM-конвейера, Supabase, отчётов, Web App, тестов, спецификаций, планов и production release.
---

# Voice sales log

Сохранять основной путь проекта:

```text
Telegram voice → webhook/polling → STT → LLM parser → validation → Supabase → report
```

Не расширять продукт до CRM, склада, кассы, фискализации или онлайн-оплаты.

## Прочитать перед изменением

От корня skill (`codex/skills/voice-sales-log`) прочитать по порядку:

1. `../../../AGENTS.md`;
2. `../../../README.md`;
3. `../../../docs/overview/README.md`;
4. `../../../docs/specs/global.md`;
5. `../../../docs/architecture/architecture.md`;
6. все файлы в `../../../docs/plans/active/`;
7. `../../../docs/rules/README.md`;
8. этот `SKILL.md`.

Затем прочитать профильную спецификацию и проверить Git-состояние. Не перезаписывать несвязанные изменения пользователя.

## Выбрать workflow

### Telegram webhook или bot

Прочитать `telegram-webhook.md`, `api-spec.md`, `deployment-vercel.md` и `auth-and-shop-isolation.md`. Сохранять `POST /api/telegram/webhook`, Node.js runtime, секретный заголовок, безопасное сравнение и общий `processTelegramUpdate`. Polling разрешён только локально. Перед release запускать `telegram:webhook-info` и требовать `webhook_matches_expected=true`; Web App button не может использовать local/ngrok/Vercel preview URL.

### Voice, STT или LLM parser

Прочитать `docs/features/voice-processing.md`, `docs/rules/ai.md` и `status-lifecycle.md`. Не придумывать значения. Сохранять строгий JSON/Zod, сверку с расшифровкой, порядок позиций, confidence и расчёт итогов приложением. Любое изменение parser требует регрессионных тестов.

### Supabase и данные

Прочитать schema/data specs, все миграции и `auth-and-shop-isolation.md`. Создавать новую миграцию для каждого изменения schema. Не переписывать применённые миграции. Держать service role только на сервере. Не выдавать demo mode за production-безопасность.

### Отчёт и Web App

Прочитать `report-calculation.md`, `auth-and-shop-isolation.md`, `telegram-webhook.md`, `docs/features/mobile-web-app.md` и роли. Reply, inline и menu buttons отчёта должны быть только `web_app` и использовать один `NEXT_PUBLIC_APP_URL`. Первый document request нельзя перенаправлять до Telegram bootstrap. Browser fetch выполняется через общий `apiFetch`, который добавляет `x-telegram-init-data`; Server Components и Server Actions используют HttpOnly cookie с повторной HMAC-проверкой. `/debug-telegram` не выводит initData или user payload. Каждая новая voice-продажа должна попасть в «Нужно проверить»; сохранение и подтверждение являются отдельными действиями. Сохранять источник отчёта в активных подтверждённых `sale_items`, пересчёт, аудит, soft delete и исходный диагностический след. Для UI проверять мобильный viewport и отсутствие overflow.

### Документация и планы

Использовать `docs/INDEX.md` как единственную глобальную карту. Не дублировать спецификации. Одновременно оставлять не более одного плана в `docs/plans/active`; завершённые результаты фиксировать в `CHANGELOG.md` и Git history. Задачу вне MVP не реализовывать без отдельного согласованного плана.

### Release и production-readiness

Локальная готовность не равна production readiness. Для release подтверждать фактические Vercel, Telegram и Supabase шаги, использовать `production-readiness.md` и профильные technical specs; внешний smoke run не заменять локальной сборкой.

## Непереговорные ограничения

- Не менять webhook без доказанной причины.
- Не менять LLM parser без тестов.
- Не менять schema без migration.
- Не читать и не выводить `.env.local` без необходимости; никогда не коммитить его.
- Не передавать `SUPABASE_SERVICE_ROLE_KEY` клиенту.
- Не физически удалять голос, аудио или продажу при исключении позиции.
- Не доверять `shop_id` клиента как авторизации.
- Не показывать пользователю internal enum `processed`, `needs_review`, `pending` или `failed`.
- Не заявлять идемпотентность, транзакционность, monitoring, backup или CI до их реализации и проверки.

## Завершить работу

1. Обновить профильные specs, features/rules и `CHANGELOG.md`.
2. Обновить единственный активный plan; завершённую работу перенести в `completed`.
3. Проверить внутренние ссылки, пустые каталоги и отсутствие устаревших путей.
4. Выполнить `npm run lint`, `npm run test`, `npm run build`.
5. Для UI выполнить browser check; для интеграций перечислить фактически проверенные и непроверенные внешние шаги.
