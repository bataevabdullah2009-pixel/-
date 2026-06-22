# Архитектура

Монорепозиторий содержит Telegram-бот (`apps/bot`), Next.js App Router Web App (`apps/web`), общие типы и правила (`packages/shared`) и Supabase migrations.

Бот использует Telegram webhook или long polling, STT provider, LLM provider и серверный Supabase client. Reply, inline и menu buttons отчёта создаются как `web_app`; debug button открывает `/debug-telegram`. Next.js подключает официальный Telegram SDK через `next/script` с `beforeInteractive`; корневая страница не перенаправляет запрос до bootstrap, client component после hydration ждёт `window.Telegram.WebApp`, вызывает `ready()`/`expand()` и передаёт initData через общий `apiFetch`.

`POST /api/auth/telegram` получает `x-telegram-init-data`, проверяет HMAC и срок, находит owner/seller, отдельно отклоняет inactive binding и проверяет существование shop. Сервер хранит исходный initData в HttpOnly cookie и заново валидирует его при каждом Server Component/Server Action чтении или изменении. Новые voice items сохраняются как review-required; `processed` появляется только после отдельного подтверждения.

Данные магазина связываются через `sales.shop_id`; `sale_items` наследуют принадлежность через `sale_id`. Клиентский `shop_id` не существует в API-контракте.
