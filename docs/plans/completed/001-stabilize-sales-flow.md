# Стабилизация потока продаж — завершено 2026-06-20

Исправлен regression после введения owner auth и RPC persistence без расширения продуктового scope.

Выполнено:

- восстановлена Telegram Web App button и передача initData в header;
- устранён преждевременный auth error на первом render;
- сохранена server-derived shop isolation с совместимостью существующей seller-привязки;
- добавлены детальные voice stage logs;
- невалидный LLM result переводится в видимый `needs_review` item;
- Storage/audit failures больше не ломают сохранение продажи;
- добавлен persistence fallback до rollout RPC migration;
- отчёт, save, exclude и reset используют server-side auth и автоматическую revalidation;
- обновлены tests, specs, feature docs, README, AGENTS и CHANGELOG.

Проверка: `npm run test`, `npm run lint`, `npm run build` проходят. Production webhook указывает на текущий `NEXT_PUBLIC_APP_URL` и не сообщает pending/error. Отдельной новой migration не потребовалось: поля soft delete уже присутствуют в production; migration `20260620135556_stabilize_sales_flow.sql` остаётся целевой для `owners` и `save_voice_sale`.

Backlog: применить целевую migration через авторизованный Supabase CLI/Dashboard и проверить Vercel production env в аккаунте проекта; текущая CLI-сессия Vercel не видит этот проект.
