# Security Rules

- Не логировать Telegram initData payload, bot token, service role key, STT/LLM keys.
- Fallback logs содержат только `mode`, `hasDefaultShop`, `hasDefaultSeller`.
- Не доверять client `shop_id`, seller id или owner id.
- Route handlers повторно проверяют auth; UI не является границей безопасности.
- RLS остаётся включённым; бизнес-доступ выполняется server-side service role кодом с явным shop filter.
- Telegram webhook secret сравнивается constant-time.
- WebApp HMAC использует только `TELEGRAM_BOT_TOKEN`; data-check-string исключает только `hash`.
- Без `DEBUG_TELEGRAM_WEBAPP=true` production не показывает кнопку и route Telegram diagnostics.
