# Telegram Mini App auth hotfix — завершено 2026-06-20

Цель: устранить ложную ошибку «Откройте отчёт через кнопку в Telegram-боте» без изменения рабочего voice pipeline.

Выполнено:

- подтверждено, что inline-кнопки используют `Markup.button.webApp`;
- `/start` задаёт нижнюю `MenuButtonWebApp` с тем же `NEXT_PUBLIC_APP_URL`;
- `NEXT_PUBLIC_APP_URL` валидируется как HTTPS;
- Telegram SDK перенесён в `<head>` с `beforeInteractive`;
- bootstrap ждёт `window.Telegram.WebApp`, вызывает `ready()` и `expand()`;
- добавлены безопасные development diagnostics без initData payload;
- browser fetch централизован в `apiFetch` с `x-telegram-init-data`;
- backend различает missing/invalid initData, unlinked seller и missing shop;
- inactive seller запрещён, `shop_id` берётся только из БД;
- webhook diagnostics дополнены `allowed_updates`;
- voice/STT/LLM/save pipeline и Supabase schema не менялись.

Проверено локально: 55 tests, lint без ошибок, production build успешен. Production server smoke подтвердил вызовы `web_app_ready`/`web_app_expand`, ответы missing/invalid `401` с правильными кодами, успешный `200` auth существующего active seller, выдачу cookie и загрузку `/daily-report` без auth error. Read-only external check подтвердил production deployment `Ready`, webhook `https://web-n3ji.vercel.app/api/telegram/webhook`, pending `0`, last error `null`, allowed updates `message`.

Не проверено локально: реальный mobile Telegram smoke run и появление продажи 400 ₽ после production deploy. Это release gate, а не основание менять voice pipeline.
