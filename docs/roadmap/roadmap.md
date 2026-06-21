# Roadmap

Текущий этап — production-oriented MVP голосового журнала продаж: voice pipeline, Telegram Mini App auth, server-derived shop isolation, отчёт, журнал, продавцы и ручная коррекция.

Ближайший эксплуатационный backlog:

- после нового production deployment выполнить mobile Telegram smoke run и подтвердить initData: `/start` → «Открыть отчёт» → голос «Сникерс, 4 штуки по 100 рублей» → продажа 400 ₽ → вкладки «Отчёт», «Записи», «Продавцы»; URL-конфигурация и webhook уже сверяются автоматически;
- применить/сверить целевые Supabase migrations и выполнить database advisors;
- настроить резервное восстановление и мониторинг внешних интеграций;
- добавить CI для `npm run test`, `npm run lint` и `npm run build`.

CRM, склад, касса, оплаты и клиентская база не входят в roadmap текущего продукта.
