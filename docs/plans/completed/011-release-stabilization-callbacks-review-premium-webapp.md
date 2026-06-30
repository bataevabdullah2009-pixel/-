# 011 — Release stabilization: callbacks, review page and premium WebApp

Статус: завершено 30 июня 2026.

## Цель

Стабилизировать продукт перед сдачей: Telegram callback flow, WebApp update/delete, review decisions, магазинную изоляцию, dark premium UI и документацию.

## Сделано

- Callback data сокращены до `confirm:<record_id>` и `cancel:<record_id>`.
- Handler принимает новые callback data и legacy `voice_sale_review:<action>:<id>` для старых сообщений.
- Callback всегда отвечает `answerCbQuery` и логирует `callback_received` / `callback_action` с `record_id`, `telegram_user_id`, `old_status`, `new_status`, `error`.
- Review-message содержит `✅ Подтвердить`, `❌ Отмена`, `Открыть отчёт` как `web_app`.
- Добавлена вкладка `/review` с needs_review записями, parsed text, товарами, edit/delete и confirm/cancel.
- WebApp mutations возвращают `statusCode`/`code` для 401/403/404/422/500 сценариев.
- Добавлена idempotent migration `20260630153000_ensure_sale_item_soft_delete_columns.sql`.
- WebApp переведён на dark premium dashboard: KPI, sparkline, топ товаров, последние продажи и 4-tab nav.
- Продавцы показывают последнюю активность.
- Regression tests обновлены под callback contract, cancelled report filtering и cross-shop denial.

## Проверка

- `npm.cmd run test` — 8 файлов, 92 теста passed.
- `npm.cmd run build` — bot/web/shared passed.

## Осталось

- Реальный Telegram smoke на тестовом боте после deploy.
- Проверка Vercel logs после deploy: callback errors, Supabase permission errors, `deleted_at`.
- Visual regression на нескольких мобильных viewport.

