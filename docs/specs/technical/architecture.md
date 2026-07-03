# Техническая архитектура

Монорепозиторий использует npm workspaces:

- `apps/bot` — Telegraf bot, webhook processing, STT/LLM pipeline.
- `apps/web` — Next.js App Router Web App и route handlers.
- `packages/shared` — типы, Zod schemas, parser evidence rules, date/report utilities.
- `supabase/migrations` — Postgres schema, RLS/grants, soft delete, `save_voice_sale`.

Клиентский Web App проверяет Telegram SDK/raw initData/user id, затем вызывает `getAppAuthContext()` и `apiFetch()`. Серверный Web App использует `resolveRequestContext()`, валидирует HMAC через bot token и получает seller shop. Явные Mini App API routes не должны иметь отдельную auth-логику.

Report сначала выбирает `sales` по seller `shop_id`, затем `sale_items` по найденным sale IDs. Ошибка auth/DB остаётся ошибкой и не преобразуется в нулевой отчёт.

Parser evidence layer в `packages/shared/utils/sale-parser.ts` стоит между LLM и persistence: он проверяет STT transcript, разбивает glued multi-item output на отдельные `sale_items`, поддерживает `5 по 100` и нормализует бутылки как штучные единицы. Неполные остатки сохраняются отдельными review rows.

WebApp mutations выполняются Server Actions. Клиентская карточка хранит только UI-состояние раскрытия/pending/error; доверенная проверка item → sale → shop повторяется на сервере. Успешный update возвращает сохранённую строку, пересчитывает `sales.total_amount`, инвалидирует report/records и запускает `router.refresh()`.

WebApp `/review` подтверждает и отменяет сомнительную voice-запись через server actions. Если родительская sale ещё `needs_review`, обычный item update сохраняет товар, количество и цену, ставит item `processed`, но parent sale остаётся `needs_review` и не входит в выручку до явного confirm.

Voice sale сохраняется только через RPC `save_voice_sale`. После RPC приложение проверяет sale и точное количество sale_items чтением из Supabase. Если RPC отсутствует или read-back не подтверждает строки, бот возвращает ошибку сохранения и не пишет success.

Сомнительная voice sale получает Telegram keyboard только с `✅ Подтвердить` и `❌ Отмена`. Новые callback data: `confirm:<record_id>` и `cancel:<record_id>`. Production webhook должен быть установлен с `allowed_updates: ["message", "callback_query"]`. Confirm переводит sale/voice в `processed` и добавляет валидные items в выручку. Cancel переводит sale/voice в `cancelled` и soft-delete active items. Callback заново разрешает seller по Telegram user id и не принимает `shop_id`.
