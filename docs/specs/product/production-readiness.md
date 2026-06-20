# Готовность к эксплуатации

Реализовано: inline и menu `web_app` buttons, официальный Telegram SDK, ожидание WebApp object, `ready()`/`expand()`, общий initData API helper, точные auth error codes, owner/seller/shop lookup, server-derived shop isolation, webhook secret, server-only service role, RLS без анонимного чтения, RPC persistence с rollout fallback, soft delete, stage logging, безопасные сообщения UI, тесты и production build.

Перед запуском конкретного окружения необходимо применить миграции, создать магазины, владельцев и продавцов, настроить Telegram webhook, Vercel env и приватный Storage bucket. Реальный mobile Telegram smoke run после production deploy остаётся обязательным release gate. Наблюдаемость внешних сервисов и резервное восстановление остаются эксплуатационными задачами.
