# Правила безопасности

- Не логировать payload Telegram initData, токен бота, service role key, ключи STT/LLM.
- Резервные логи содержат только `mode`, `hasDefaultShop`, `hasDefaultSeller`.
- Не доверять клиентским `shop_id`, seller id или owner id.
- Обработчики маршрутов повторно проверяют auth; UI не является границей безопасности.
- RLS остаётся включённым; бизнес-доступ выполняется серверным кодом service role с явным фильтром магазина.
- Секрет Telegram webhook сравнивается за constant-time.
- HMAC WebApp использует только `TELEGRAM_BOT_TOKEN`; data-check-string исключает только `hash`.
- Без `DEBUG_TELEGRAM_WEBAPP=true` production не показывает кнопку и маршрут диагностики Telegram.
