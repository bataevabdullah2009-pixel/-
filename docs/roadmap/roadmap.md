# Roadmap

## Сейчас

Production-oriented MVP голосового журнала продаж:

- Telegram bot принимает voice;
- STT/LLM parser извлекает товар, количество и цену;
- уверенные позиции сразу входят в отчёт;
- bot success выдаётся только после подтверждённой записи sale + sale_items;
- сомнительные voice-записи получают Telegram кнопки `✅ Подтвердить`, `❌ Отмена`, `Открыть отчёт`;
- callback data короткие: `confirm:<record_id>` и `cancel:<record_id>`;
- confirm переводит запись в `processed` и добавляет валидные товары в выручку;
- cancel переводит запись в `cancelled` и soft-delete товары;
- Mini App работает в Telegram и browser fallback modes;
- Telegram session валидируется по raw initData через bot token;
- report, records и sellers используют server-derived shop;
- WebApp не маскирует auth/DB ошибки пустыми данными;
- отчёт показывает dark premium dashboard, четыре метрики, sparkline, топ товаров, последние продажи и review-блок;
- журнал записей раскрывает товары и показывает audio, если оно сохранено;
- вкладка «Проверка» показывает needs_review записи и server-side confirm/cancel;
- продавцы показывают активность, последнюю запись, записи и выручку за период;
- карточки товара имеют inline update, loading/error state и soft delete через корзину;
- WebApp edit review item не подтверждает voice-запись без явного confirm;
- diagnostics скрыты от обычного production-пользователя.

## Backlog

- E2E Telegram/WebApp smoke check для confirm/cancel после production deploy.
- E2E WebApp mutations в отдельной тестовой Supabase среде.
- Наблюдаемость webhook/STT/LLM/callback latency и ошибок.
- Метрики latency/error rate для ручных update/delete.
- Улучшение parser prompts на реальных записях.
- Удобное управление sellers/owners в панели.
- Визуальная регрессия для нескольких мобильных viewport.

## Не входит в MVP

CRM, склад, касса, онлайн-оплата и клиентская база.

## Production verification

24 июня 2026 server-side smoke подтвердил raw initData auth, session cookie, единый seller shop и ненулевые `sales/sale_items` counts.

30 июня 2026 локальная проверка подтвердила tests и workspace build для коротких callback data, `/review`, dark premium WebApp и ensure soft-delete migration.

В backlog остаётся автоматизация запуска smoke из реального Telegram-клиента после deploy.
