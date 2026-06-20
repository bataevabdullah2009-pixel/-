# Архитектура

Монорепозиторий содержит Telegram-бот (`apps/bot`), Next.js App Router Web App (`apps/web`), общие типы и правила (`packages/shared`) и Supabase migrations.

Бот использует Telegram webhook или long polling, STT provider, LLM provider и серверный Supabase client. Все кнопки отчёта создаются как `web_app`. Next.js подключает официальный Telegram SDK через `next/script` с `beforeInteractive`; client bootstrap ждёт `window.Telegram.WebApp`, вызывает `ready()`/`expand()` и передаёт initData через общий `apiFetch`.

`POST /api/auth/telegram` получает `x-telegram-init-data`, проверяет HMAC и срок, находит активного owner/seller и проверяет существование shop. Сервер хранит исходный initData в HttpOnly cookie и заново валидирует его при каждом Server Component/Server Action чтении или изменении.

Данные магазина связываются через `sales.shop_id`; `sale_items` наследуют принадлежность через `sale_id`. Клиентский `shop_id` не существует в API-контракте.
