---
name: agent-workflow
description: "Рабочий skill для этого репозитория. Использовать при изменении кода, документации, локальных правил агента, проверок, веток, commit, push или PR в main."
---

# Рабочий skill

## Назначение

Этот skill использовать как рабочий сценарий агента. `AGENTS.md` остаётся коротким чеклистом, а этот файл задаёт порядок действий: как собрать контекст, что проверить, где не ломать логику, как закончить работу через GitHub.

## 1. Контекст

Перед правкой выполнить:

```bash
git status -sb
git diff --stat
git diff
```

Прочитать:

1. `AGENTS.md`
2. `README.md`
3. `docs/specs/global.md`
4. `docs/INDEX.md`
5. `docs/architecture/architecture.md`

Дальше читать только профильные документы:

1. Telegram/callback/webhook - `docs/specs/product/telegram-confirmation-flow.md`, `docs/specs/technical/telegram-webhook.md`.
2. WebApp/report/review - `docs/specs/product/webapp-report.md`, `docs/specs/product/sale-item-editing.md`, `docs/specs/technical/webapp-api.md`.
3. БД/выручка/status - `docs/specs/technical/database.md`, `docs/specs/technical/database-schema.md`, `docs/specs/data/status-lifecycle.md`.
4. Deploy/env - `docs/rules/deployment.md`, `docs/specs/technical/deployment-vercel.md`.

## 2. Ветка

Если текущая ветка `main`, создать новую ветку:

```bash
git fetch origin main
git switch -c agent/<kratkoe-opisanie> origin/main
```

Если уже открыта подходящая ветка `agent/*`, продолжать на ней. Несвязанные изменения не трогать и не добавлять в commit.

## 3. Правка

1. Делать минимальное изменение в области задачи.
2. Использовать существующие паттерны проекта.
3. Не переписывать voice/STT/LLM/parser/webhook/WebApp/Supabase schema без прямой задачи.
4. Не доверять клиентскому `shop_id`.
5. Не логировать секреты и raw initData.
6. Не маскировать auth/DB ошибки пустыми данными.
7. Не удалять `sale_items` физически в пользовательском сценарии.

## 4. Инварианты

Проверять при любых изменениях логики:

1. Уверенная голосовая продажа становится `processed`.
2. Сомнительная позиция остаётся `needs_review`.
3. Telegram-проверка содержит только `✅ Подтвердить` и `❌ Отмена`.
4. Callback format: `confirm:<sale_id>` и `cancel:<sale_id>`.
5. Подтверждение смешанной корзины подтверждает валидные позиции и оставляет неполные.
6. Отмена переводит запись в `cancelled` и мягко удаляет активные позиции.
7. Выручка считается по активным `sale_items.status = processed`, если родительская продажа не `cancelled` и не `failed`.
8. Родительский `needs_review` не блокирует выручку обработанной соседней позиции.

## 5. Документация

Обновлять документацию в той же задаче:

1. Поведение продукта - `docs/specs/global.md` и профильные specs/features.
2. WebApp - WebApp specs и acceptance matrix.
3. БД - technical/data specs, migrations, `CHANGELOG.md`.
4. Deploy/webhook - deployment docs, webhook docs, README.
5. Только документационная задача - не менять app/bot/WebApp/Supabase код.

## 6. Проверки

Для кода:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Для документации и skills:

```bash
git diff --stat
git diff --check
```

Для этого skill:

```bash
python C:\Users\batae\.codex\skills\.system\skill-creator\scripts\quick_validate.py .Agent.skills
```

Если проверка не запускалась или упала, указать это в финальном отчёте.

## 7. Commit

Перед commit:

```bash
git status -sb
git diff --stat
git diff
```

Добавлять только файлы задачи:

```bash
git add <files>
git commit -m "<type>: <summary>"
```

Подходящие типы: `docs`, `fix`, `feat`, `test`, `chore`.

## 8. GitHub

После commit:

```bash
git push -u origin HEAD
```

Если `gh` авторизован:

```bash
gh pr create --draft --base main --head <branch> --title "[agent] <summary>" --body-file <body.md>
```

Если `gh` не авторизован или push отклонён, не обходить доступ. Сообщить точную команду для продолжения.

## 9. Финал

В финальном ответе указать:

1. Что изменено.
2. Файлы.
3. Проверки.
4. Ветку.
5. Commit hash.
6. Push status.
7. PR link или причину, почему PR не создан.
