# Telegram WebApp и обязательная проверка продаж — завершено 2026-06-22

Цель: устранить потерю Telegram `initData` при открытии отчёта и добавить явное подтверждение каждой голосовой продажи без изменений STT/LLM pipeline.

Выполнено:

- найдена причина: Web App открывался правильной `web_app` button, но корневой Next.js route выполнял server redirect до инициализации Telegram SDK;
- корень теперь рендерит отчёт напрямую; bootstrap ждёт SDK после hydration и только затем показывает auth error;
- проверены и добавлены reply, inline и menu Web App buttons; `/start` всегда отправляет новые кнопки;
- добавлена Web App button диагностики и route `/debug-telegram` без initData payload и токенов;
- backend добавил безопасный `webapp auth` log и `SELLER_INACTIVE`; client `shop_id` не появился;
- каждая новая voice-продажа сохраняется для проверки, ручное сохранение и подтверждение разделены;
- UI показывает только русские статусы «Нужно проверить», «Нужно проверить цену», «Подтверждено» и «Исключено»;
- существующий soft delete подтверждён как единое решение, новая migration не требуется;
- STT, LLM parser, Telegram webhook contract и voice audio pipeline не изменялись.

Проверено:

- `npm run lint` — без ошибок;
- `npm run test` — 61/61;
- `npm run build` — успешно;
- `/` — `200` без redirect, `/debug-telegram` — `200` локально;
- относительные Markdown links разрешаются.

Внешние release gates: production deploy/readback, Vercel env readback, реальный `/start`, Telegram debug и voice sale 400 ₽. Текущий Vercel CLI scope не содержит связанного проекта, поэтому создание дублирующего проекта не выполнялось.
