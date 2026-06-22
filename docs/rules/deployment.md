# Развёртывание

Миграции применяются до выкладки кода, который читает новые колонки. В окружении явно задаётся `DEMO_MODE=false` для production. После deploy сверяются обязательные env, webhook secret, owner/seller bindings, shop isolation, `/debug-telegram`, новая `/start` button и отсутствие service role key в клиентских assets. Реальный Telegram smoke run нельзя заменять локальным HTTP check.
