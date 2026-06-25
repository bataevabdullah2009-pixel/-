---
name: voice-sales-log
description: Безопасно изменять и документировать репозиторий voice-sales-log: Telegram bot, voice STT/LLM pipeline, Supabase, отчёты, Mini App, fallback mode, тесты, спецификации, планы и release readiness.
---

# Voice Sales Log

Сохранять основной путь продукта:

```text
Telegram voice -> STT -> LLM parser -> evidence rules -> Supabase -> report
```

Не расширять MVP до CRM, склада, кассы, оплат или клиентской базы.

## Прочитать перед изменением

1. `../../../AGENTS.md`
2. `../../../README.md`
3. `../../../docs/overview/README.md`
4. `../../../docs/specs/global.md`
5. `../../../docs/architecture/architecture.md`
6. Все файлы в `../../../docs/plans/active/`
7. `../../../docs/rules/README.md`
8. Этот `SKILL.md`

Затем прочитать профильные specs/features/rules и последний релевантный completed plan.

Для WebApp обязательно прочитать:

- `../../../docs/specs/product/webapp-report.md`;
- `../../../docs/specs/product/sale-item-editing.md`;
- `../../../docs/specs/technical/webapp-api.md`.

Для БД обязательно прочитать `../../../docs/specs/technical/database.md`.
Для Telegram logic обязательно прочитать `../../../docs/specs/technical/telegram-webapp-session.md`.

## Workflow rules

### Telegram bot/webhook

Сохранять `POST /api/telegram/webhook`, Node.js runtime, secret header, constant-time compare и общий `processTelegramUpdate`. Кнопки отчёта — только `web_app`.

### Web App

Web App поддерживает:

- Telegram mode с `window.Telegram.WebApp.initData`;
- browser fallback mode при `ALLOW_WEBAPP_FALLBACK=true`;
- error mode только для реальных ошибок сервера/БД/конфигурации.

Client fetch выполняется через `apiFetch()`, который отправляет `x-app-mode` и, при наличии, `x-telegram-init-data`. Server-side доступ выполняется через `resolveRequestContext()` / `requireOwner()`. `shop_id` нельзя принимать от клиента.

Карточка товара показывает name/quantity/unit price/total и действия карандаш/корзина. Update/delete возвращают локальный pending/error state, а сервер повторно проверяет item → sale → shop. Исключённые rows не показываются активными.

### Voice pipeline

Не ломать STT/LLM flow. Уверенная позиция (`product_name`, `quantity > 0`, `price > 0`, `confidence >= 0.80`) сохраняется как `processed` и сразу входит в отчёт. Неполные, низкоуверенные или странные позиции сохраняются как `needs_review`. Невалидный LLM JSON создаёт fallback review item.

### Data

Service role только server-side. Исключение товара — soft delete через `deleted_at`; восстановление очищает `deleted_at`. Отчёт считает только active `processed`.

### Documentation

После каждого изменения кода обновить docs/specs/features/rules, `CHANGELOG.md`, plans и roadmap. Удалять или переписывать устаревшие формулировки. В финальном ответе перечислять изменённые документы.

## Finish

Перед финалом выполнить:

```bash
npm run lint
npm run test
npm run build
```

Если команды не запускались, упали или внешние Telegram/Vercel smoke checks недоступны, сказать это прямо.
