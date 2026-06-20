# Готовность к эксплуатации

Реализовано: Web App button, initData header validation, webhook secret, owner/shop isolation, server-only service role, RLS без анонимного чтения, RPC persistence с rollout fallback, soft delete, stage logging, безопасные сообщения UI, тесты и production build.

Перед запуском конкретного окружения необходимо применить миграции, создать магазины, владельцев и продавцов, настроить Telegram webhook, Vercel env и приватный Storage bucket. Наблюдаемость внешних сервисов и резервное восстановление остаются эксплуатационными задачами.
