# 010 — Telegram confirmation and product WebApp polish

Статус: завершено 30 июня 2026.

## Цель

Довести Telegram bot + WebApp «Голосовой журнал продаж» до продуктового состояния: сомнительные voice-записи решаются в Telegram, WebApp остаётся чистой мобильной панелью, редактирование и удаление товаров работают через Supabase и не ломают выручку.

## Сделано

- Добавлен sale-level Telegram callback flow `✅ Подтвердить` / `❌ Отмена`.
- Review voice-message больше не получает кнопку «Открыть отчёт».
- Confirm переводит sale/voice в `processed` и добавляет валидные items в выручку.
- Cancel переводит sale/voice в `cancelled` и soft-delete active items.
- Callback flow сделан идемпотентным: первое решение выигрывает.
- Добавлен статус `cancelled` в shared types/schema и Supabase constraints.
- WebApp удалил legacy item-confirm path.
- WebApp edit review item сохраняет поля, но не подтверждает voice-запись.
- Экран отчёта перестроен: четыре метрики, топ товаров, продажи за период, review-блок.
- Экран записей показывает раскрытие «Товары» и бейдж «Нужно подтвердить в Telegram».
- Экран продавцов показывает активность, записи и выручку за выбранный период.
- Добавлены/обновлены regression tests для confirm, cancel, keyboard contract и статусов.

## Проверка

- `npm.cmd run lint` — passed.
- `npm.cmd run test` — 8 файлов, 90 тестов passed.
- `npm.cmd run build` — bot/web/shared passed.
- `npm.cmd run web:build` — Next.js build passed.

## Границы

STT, LLM parser, audio conversion и webhook endpoint не переписывались.

CRM, склад, касса, оплаты и клиентская база не добавлялись.

## Осталось

- E2E Telegram smoke на тестовом боте после deploy.
- Visual regression WebApp на нескольких мобильных viewport.
- Метрики latency/error rate для callback и WebApp mutations.
