# Production Web App URL guard — завершено 2026-06-21

Цель: исключить повторение ошибки с пустым или временным `NEXT_PUBLIC_APP_URL` после уже реализованного initData hotfix.

Выполнено:

- Production и Preview env обновлены на `https://web-n3ji.vercel.app`;
- bot env, setWebhook и webhook-info используют общую URL-валидацию;
- запрещены HTTP, localhost, ngrok, deployment preview и git-branch Vercel URL;
- webhook-info сравнивает фактический и ожидаемый webhook URL;
- добавлены regression tests и синхронизирована документация;
- voice/STT/LLM/save pipeline и Supabase schema не изменялись.

Проверено: `npm run test` — 57/57, `npm run lint` — без ошибок, `npm run build` — успешно; webhook URL совпадает с конфигурацией, pending updates `0`, last error отсутствует. Реальный mobile Telegram сценарий остаётся внешним release gate.
