# Changelog

## 2026-06-24 — P0: подтверждённое сохранение и корректный отчёт

- Устранён ложный success: бот подтверждает запись только после RPC и read-back проверки `sales` и точного количества `sale_items`.
- Удалён неатомарный server fallback insert при отсутствии `save_voice_sale`; отсутствие RPC теперь является ошибкой сохранения.
- Supabase ошибки логируются с реальными `code/message/details/hint`, без токенов и ключей.
- Pipeline logs содержат `telegramMessageId`, `telegramUserId`, `sellerId`, `shopId`, `sttText`, parsed items, sale id, item count, final status и error message.
- STT явно получает русский язык и контекст продажи; evidence validator использует совпадающий очищенный русский текст при латинской транслитерации.
- Полная уверенная позиция больше не остаётся в review только из-за общего parser-level флага.
- Telegram WebApp выбирает seller shop раньше owner shop; fallback seller проверяется против `DEFAULT_SHOP_ID`.
- Report учитывает готовые позиции, показывает review отдельно и использует московские календарные границы.
- Save/confirm/exclude/restore/reset проверяют фактически изменённые строки; сбой audit log не маскируется как сбой основной мутации.
- Добавлена миграция `20260623221651_repair_complete_single_item_sales.sql` для старых однозначных записей.
- Добавлены regression tests parser/save/read-back/report/review/shop/timezone/STT.
- Проверено: `npm run lint` — passed; `npm run test` — 8 files, 72 tests passed; `npm run build` — bot/web/shared passed.
- Live Supabase read-back за 24 июня 2026 (`Europe/Moscow`) показывает `Ники`, 4 × 100, выручка 400.

## 2026-06-23 — Web App fallback и автоготовые voice-продажи

- Убрана жёсткая клиентская блокировка Mini App без Telegram initData: `TelegramAuthBootstrap` больше не заменяет интерфейс красной ошибкой.
- Добавлен единый client auth helper `getAppAuthContext()` и общий `apiFetch()`, который отправляет `x-app-mode` и добавляет `x-telegram-init-data` только в Telegram mode.
- Добавлен server helper `resolveRequestContext()`: Telegram mode валидирует initData и ищет owner/seller, fallback mode использует только server env `ALLOW_WEBAPP_FALLBACK`, `DEFAULT_SHOP_ID`, `DEFAULT_SELLER_ID`.
- `/api/auth/telegram` переведён на общий helper; fallback не устанавливает Telegram cookie и не принимает `shop_id` от клиента.
- Отсутствие initData больше не превращает отчёт в блокирующую ошибку. Если fallback выключен, auth endpoint может вернуть 401, а UI остаётся доступным.
- Voice persistence больше не переводит каждую новую позицию в review. Полные позиции с товаром, количеством, ценой и `confidence >= 0.80` сохраняются как `processed`.
- Отсутствующая цена, отсутствующее количество, низкая уверенность, странный текст или частично неполная multi-item продажа дают `needs_review`.
- Бот отвечает `✅ Запись сохранена: ...` для готовых продаж и предупреждением с «Распознано: ...» для проверки.
- Ручное сохранение валидных товара, количества и цены сразу переводит позицию в `processed`, пересчитывает sale и отчёт.
- UI-статусы сведены к пользовательским labels: «Готово», «Нужно проверить», «Исключено».
- Soft delete через `deleted_at` оставлен единым механизмом исключения и восстановления.
- Обновлены README, AGENTS, specs, features, rules, roadmap, active/completed plans и Codex skill.
- Проверено: `npm.cmd run test` — 62 tests passed. `lint` и `build` выполняются перед коммитом.

## Предыдущая история

- 2026-06-22: стабилизированы Telegram WebApp initData, reply/inline/menu `web_app` buttons, debug route и cookie bootstrap.
- 2026-06-21: добавлена проверка production Web App URL и webhook diagnostics.
- 2026-06-20: добавлены soft delete fields, `owners`, `save_voice_sale`, shop isolation, report calculation, records journal и regression tests.
- 2026-06-16: создан базовый Telegram bot, voice download/conversion, STT/LLM parsing, Supabase schema/storage, webhook и mobile Web App.
