# Deployment Rules

Migrations применяются до выкладки кода. Production env должен явно задавать Supabase, Telegram, STT/LLM и Web App URL.

Для browser fallback:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

После deploy проверяются webhook secret, owner/seller bindings, shop isolation, `/debug-telegram`, Telegram `web_app` кнопка и отсутствие service role key в client assets.

Реальный Telegram smoke run нельзя заменять локальным build.
