# Развёртывание

Миграции применяются до выкладки кода, который читает новые колонки. В окружении явно задаётся `DEMO_MODE=false` для production. После deploy сверяются webhook secret, owner/seller bindings, shop isolation и отсутствие service role key в клиентских assets.
