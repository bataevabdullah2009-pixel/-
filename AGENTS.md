# AGENTS.md

## Читать перед правкой

1. `README.md`
2. `docs/specs/00-global.md`
3. `docs/INDEX.md`
4. `docs/architecture/architecture.md`
5. Профильные документы из `docs/specs/`, `docs/features/`, `docs/rules/`
6. Текущий diff: `git status -sb`, `git diff --stat`, `git diff`

Если краткий документ расходится с `docs/specs/00-global.md`, свериться с кодом и исправить документацию.

## Границы проекта

1. `apps/bot` - Telegram-бот, voice pipeline, callbacks.
2. `apps/web` - Next.js WebApp, route handlers, Server Components, Server Actions.
3. `packages/shared` - типы, схемы, parser/evidence, расчёт отчёта.
4. `supabase/migrations` - схема, RLS/grants, RPC, soft delete.
5. `docs` - спецификации, правила, планы, changelog.
6. `.Agent.skills` - локальный skill агента.

## Нельзя без прямой задачи

1. Переписывать voice/STT/LLM/parser/webhook/WebApp/Supabase schema.
2. Доверять клиентскому `shop_id`.
3. Логировать или коммитить `SUPABASE_SERVICE_ROLE_KEY`, Telegram token, STT/LLM keys, raw initData.
4. Маскировать auth/DB ошибки пустым отчётом.
5. Физически удалять `sale_items` в пользовательском сценарии.
6. Оставлять документацию, противоречащую коду.
7. Делать destructive git-команды без прямой просьбы.

## Инварианты

1. Уверенная голосовая продажа -> `processed`.
2. Сомнительная позиция -> `needs_review` до решения.
3. Telegram-проверка содержит только `✅ Подтвердить` и `❌ Отмена`.
4. Callback format: `confirm:<sale_id>`, `cancel:<sale_id>`.
5. Подтверждение смешанной корзины подтверждает валидные позиции, неполные оставляет на проверке.
6. Отмена переводит запись в `cancelled` и мягко удаляет активные позиции.
7. Выручка считается по активным `sale_items.status = processed`, если родительская продажа не `cancelled` и не `failed`.
8. Родительский `needs_review` не блокирует выручку обработанной соседней позиции.
9. WebApp проверяет магазин и права на сервере.

## Документация

1. Голосовой конвейер: `docs/specs/00-global.md`, Telegram/product specs, feature-документы.
2. WebApp: WebApp specs, feature-документы, acceptance matrix.
3. БД: technical/data specs, migrations, `CHANGELOG.md`.
4. Deploy/webhook: deployment docs, Telegram webhook docs, README.
5. Выручка/проверка/подтверждение/отмена: `docs/specs/00-global.md`, data specs, feature-документы, `CHANGELOG.md`.
6. Только docs-задача: не менять app/bot/WebApp/Supabase код.

## Проверки

Для кода:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Для стабилизации voice/WebApp дополнительно:

```bash
npm.cmd run smoke:voice
npm.cmd run smoke:webapp
npm.cmd run smoke:telegram
```

`smoke:production` пишет временные данные в production и запускается только с явным `PRODUCTION_SMOKE_CONFIRM=voice-sales-log`. Скрипт обязан удалить только созданные им `sale_items`, `sales`, `voice_records` и storage object. Ручное открытие WebApp внутри Telegram и отправка голоса реальным пользователем не заменяются синтетическим initData smoke.

Для документации/skills:

```bash
git diff --stat
git diff --check
```

Для `.Agent.skills`:

```bash
python C:\Users\batae\.codex\skills\.system\skill-creator\scripts\quick_validate.py .Agent.skills
```

## GitHub-flow

1. Перед правкой с `main`:

```bash
git fetch origin main
git switch -c agent/<kratkoe-opisanie> origin/main
```

2. Перед commit:

```bash
git status -sb
git diff --stat
git diff
```

3. Коммитить только файлы задачи:

```bash
git add <files>
git commit -m "docs: update agent workflow"
```

4. После commit:

```bash
git push -u origin HEAD
gh pr create --draft --base main --head <branch> --title "[agent] <opisanie>" --body-file <body.md>
```

Если `gh` не авторизован или push отклонён, не обходить доступ; сообщить точную команду для продолжения.

## Финальный отчёт

Указать: изменения, файлы, проверки, ветку, commit hash, статус push, PR или причину отсутствия PR.
