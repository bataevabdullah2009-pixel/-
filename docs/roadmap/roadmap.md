# Roadmap

Текущий этап — production-oriented MVP голосового журнала продаж: voice pipeline, Telegram Mini App auth, server-derived shop isolation, обязательная проверка/подтверждение, отчёт, журнал и продавцы.

Ближайший эксплуатационный backlog:

- после нового production deployment выполнить mobile Telegram smoke run: `/start` → новая «Диагностика Telegram» (`hasTelegram=true`, `hasWebApp=true`, `initDataLength>0`) → «Открыть отчёт» → голос «Сникерс, 4 штуки по 100 рублей» → «Нужно проверить» → изменить поля → сохранить → подтвердить → выручка 400 ₽;
- применить/сверить целевые Supabase migrations и выполнить database advisors;
- настроить резервное восстановление и мониторинг внешних интеграций;
- добавить CI для `npm run test`, `npm run lint` и `npm run build`.

CRM, склад, касса, оплаты и клиентская база не входят в roadmap текущего продукта.
