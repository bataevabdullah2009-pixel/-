# Голосовой журнал продаж

Telegram-бот и Telegram WebApp для магазина: продавец диктует продажу голосом, система распознаёт товары, количество и цены, сохраняет данные в Supabase и показывает отчёт по выручке.

Главный вход в документацию: [docs/INDEX.md](docs/INDEX.md). Главный системный документ проекта: [docs/specs/00-global.md](./docs/specs/00-global.md).

## Что уже есть

1. Telegram-бот принимает `/start`, голосовые сообщения и callback-кнопки проверки.
2. Голосовой конвейер выполняет STT, LLM cleanup/parser и детерминированную проверку результата.
3. Supabase хранит магазины, продавцов, голосовые записи, продажи и позиции продажи.
4. WebApp показывает вкладки `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
5. Выручка считается только по активным обработанным позициям продажи.
6. Сомнительные позиции подтверждаются или отменяются в Telegram либо во вкладке `Проверка`.

Подробные правила продукта, статусов, подтверждения, отмены, аналитики и приёмки описаны в [глобальной спецификации](./docs/specs/00-global.md).

## Структура проекта

```text
apps/bot              Telegram-бот и голосовой конвейер
apps/web              Next.js Telegram WebApp
packages/shared       Общие типы, схемы, парсер и утилиты отчёта
supabase/migrations   Схема БД, RPC, RLS и миграции
docs                  Документация проекта
scripts               Команды Telegram webhook
```

Каноническая архитектура находится в [docs/architecture/architecture.md](docs/architecture/architecture.md).

## Локальный запуск

```bash
npm install
npm run dev
```

Для отдельного WebApp:

```bash
npm run web:dev
```

В PowerShell, если `npm.ps1` заблокирован, используйте `npm.cmd`:

```bash
npm.cmd run test
```

## Окружение

Локальная разработка использует `.env.local`. Шаблон переменных находится в [.env.example](.env.example).

Основные группы переменных:

1. Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_WEBHOOK_URL`.
2. WebApp: `NEXT_PUBLIC_APP_URL`, `DEBUG_TELEGRAM_WEBAPP`.
3. Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
4. STT/LLM: `STT_API_KEY`, `STT_API_URL`, `STT_MODEL`, `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL`.
5. Demo/fallback: `DEMO_MODE`, `DEMO_OWNER_TELEGRAM_ID`, `DEFAULT_SHOP_NAME`, `ALLOW_WEBAPP_FALLBACK`, `DEFAULT_SHOP_ID`, `DEFAULT_SELLER_ID`.

Service role key должен использоваться только на сервере.

## Команды

```bash
npm run lint
npm run test
npm run build
npm run web:build
npm run telegram:set-webhook
npm run telegram:webhook-info
npm run smoke:voice
npm run smoke:webapp
npm run smoke:telegram
```

`smoke:voice` вызывает реальные STT/LLM endpoints, но не пишет в БД. `smoke:webapp` и `smoke:telegram` выполняют read-only production-проверки сессии, страниц, chunks, SDK, webhook и menu button.

Управляемая проверка реальной production schema, RPC, подтверждения и отмены запускается отдельно и создаёт только временные записи с последующей адресной очисткой:

```powershell
$env:PRODUCTION_SMOKE_CONFIRM="voice-sales-log"
npm.cmd run smoke:production
Remove-Item Env:PRODUCTION_SMOKE_CONFIRM
```

Перед production smoke нужно убедиться, что проект Supabase не `INACTIVE` и находится в рабочем состоянии. Локальные тесты и успешный Vercel build не обнаруживают автоматически приостановленный Supabase project.

Перед сдачей изменений запускать как минимум:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Для задачи, которая меняет только документацию, достаточно проверить ссылки и `git diff`; код приложения менять не нужно.

## Документация

1. [docs/INDEX.md](docs/INDEX.md) - главный навигатор.
2. [docs/specs/00-global.md](./docs/specs/00-global.md) - полный системный документ.
3. [docs/architecture/architecture.md](docs/architecture/architecture.md) - архитектура.
4. [docs/specs/index.md](docs/specs/index.md) - список спецификаций.
5. [docs/features/index.md](docs/features/index.md) - функции продукта.
6. [AGENTS.md](AGENTS.md) - правила для агентов и разработчиков.
7. [CHANGELOG.md](CHANGELOG.md) - журнал изменений.
