# Правила развертывания

Миграции применяются до выкладки кода. Production-окружение должно явно задавать Supabase, Telegram, STT/LLM и URL WebApp.

Для браузерного резервного режима:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

После развертывания проверяются секрет webhook, авторизация raw initData через токен бота, привязки owner/seller, совпадение магазина в логах бота/отчёта, кнопка Telegram `web_app` и отсутствие service role key в клиентских ассетах. `/debug-telegram` проверяется только при временно включённом `DEBUG_TELEGRAM_WEBAPP=true`.

Реальную smoke-проверку Telegram нельзя заменять локальной сборкой.
