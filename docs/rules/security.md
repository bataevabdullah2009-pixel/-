# Security Rules

## Env

- All env names must exist in `.env.example`.
- Real secrets live only in `.env.local`.
- `.env.local` is never committed.
- `TELEGRAM_WEBHOOK_SECRET` must be configured in Vercel and passed to Telegram as `secret_token`.

## Supabase

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Browser code must use anon key only.
- RLS must be enabled on public tables.
- Storage access must not expose private audio by default.

## Code

- No hardcoded tokens.
- No API keys in tests.
- No secrets in README examples.
- Webhook route must compare `x-telegram-bot-api-secret-token` with `TELEGRAM_WEBHOOK_SECRET`.
- Logs must not include bot token, webhook secret, Supabase keys, STT key or LLM key.
