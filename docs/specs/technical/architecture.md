# Архитектура

Монорепозиторий содержит Telegram-бот (`apps/bot`), Next.js App Router Web App (`apps/web`), общие типы и правила (`packages/shared`) и Supabase migrations.

Бот использует Telegram webhook или long polling, STT provider, LLM provider и серверный Supabase client. Web App получает Telegram initData в браузере, отправляет его в `/api/auth/telegram`, а сервер хранит исходный initData в HttpOnly cookie и заново валидирует его при каждом чтении или изменении.

Данные магазина связываются через `sales.shop_id`; `sale_items` наследуют принадлежность через `sale_id`. Клиентский `shop_id` не существует в API-контракте.
