# Changelog

## 2026-06-24 — P0 production verification hardening

- Сборка Telegram data-check-string переведена на детерминированную ordinal-сортировку ключей; исключается только `hash`.
- Добавлен фиксированный Telegram Mini App fixture с полями `signature`, `photo_url`, `chat_instance` и проверкой tamper → `401`.
- Auth API теперь логирует безопасный `initDataLength`, не выводя raw initData или токены.
- Live Supabase/Vercel smoke подтвердил для обоих активных seller один `shop_id`, `200` auth, session cookie и ненулевой report (`4 sales / 4 sale_items` за 24 июня 2026, Europe/Moscow).
- Voice/STT/parser/save pipeline и схема базы не изменялись.

## 2026-06-24 — P0: Telegram WebApp session и shop resolver

- Исправлена HMAC-проверка актуального Telegram `initData`: data-check-string теперь исключает только `hash` и сохраняет поле `signature`.
- Production API получал `initDataLength: 586`, но возвращал `401 TELEGRAM_INIT_DATA_INVALID` до чтения Telegram user id.
- Клиент проверяет `Telegram.WebApp`, raw `initData` и `initDataUnsafe.user.id`, отправляет raw строку в `x-telegram-init-data` и показывает явную auth ошибку вместо ложного нуля.
- Сервер использует только `TELEGRAM_BOT_TOKEN`; безопасные причины отказа разделены на missing initData, invalid hash, expired auth date, missing bot token и user not linked.
- Seller определяется по Telegram user id. При наличии active owner binding отсутствующий seller создаётся в том же shop.
- Report читает `sales` по server-derived `shop_id`, затем `sale_items` только по найденным sale IDs; log содержит Telegram user, seller, shop, counts, период и error reason.
- Records больше не показывает «Записей нет» при auth/DB ошибке, а report не выводит нулевые метрики как успешный результат.
- «Диагностика Telegram» и `/debug-telegram` скрыты в production без `DEBUG_TELEGRAM_WEBAPP=true`.
- Voice/STT/parser/save pipeline не изменялся.
- Проверено: `npm run lint` — passed; `npm run test` — 8 files, 79 tests passed; `npm run build` — bot/web/shared passed.
- Read-only Supabase check подтвердил совпадение bot sale `shop_id` и WebApp seller `shop_id`, а также наличие `sale_items`.

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
