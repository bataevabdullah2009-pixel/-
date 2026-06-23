# Deployment Rules

Migrations применяются до выкладки кода. Production env должен явно задавать Supabase, Telegram, STT/LLM и Web App URL.

Для browser fallback:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

После deploy проверяются webhook secret, raw initData auth через bot token, owner/seller bindings, совпадение shop в bot/report logs, Telegram `web_app` кнопка и отсутствие service role key в client assets. `/debug-telegram` проверяется только при временно включённом `DEBUG_TELEGRAM_WEBAPP=true`.

Реальный Telegram smoke run нельзя заменять локальным build.
