# Техническая архитектура

Монорепозиторий использует npm workspaces:

- `apps/bot` — Telegraf bot, webhook processing, STT/LLM pipeline.
- `apps/web` — Next.js App Router Web App и route handlers.
- `packages/shared` — типы, Zod schemas, parser evidence rules, date/report utilities.
- `supabase/migrations` — Postgres schema, RLS/grants, soft delete, `save_voice_sale`.

Клиентский Web App вызывает `getAppAuthContext()` и `apiFetch()`. Серверный Web App использует `resolveRequestContext()`. Явные Mini App API routes не должны иметь отдельную auth-логику.

Voice sale сохраняется только через RPC `save_voice_sale`. После RPC приложение проверяет sale и точное количество sale_items чтением из Supabase. Если RPC отсутствует или read-back не подтверждает строки, бот возвращает ошибку сохранения и не пишет success.
