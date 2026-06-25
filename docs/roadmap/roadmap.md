# Roadmap

## Сейчас

Production-oriented MVP голосового журнала продаж:

- Telegram bot принимает voice;
- STT/LLM parser извлекает товар, количество и цену;
- уверенные позиции сразу входят в отчёт;
- bot success выдаётся только после подтверждённой записи sale + sale_items;
- спорные позиции идут в «Нужно проверить»;
- Mini App работает в Telegram и browser fallback modes;
- Telegram session валидируется по raw initData через bot token, включая актуальное поле `signature`;
- report и records используют тот же seller shop, в который бот сохраняет продажи, и не маскируют ошибки пустыми данными;
- есть отчёт, записи, продавцы, корректировка, исключение и восстановление товаров.
- карточки товара имеют inline update, loading/error state и soft delete через корзину;
- пустая продажа после исключения всех items остаётся валидной записью и показывает empty state.

## Backlog

- Наблюдаемость webhook/STT/LLM latency и ошибок.
- Улучшение parser prompts на реальных записях.
- Удобное управление sellers/owners в панели.
- E2E Telegram smoke check для raw initData, session cookie и report counts после production deploy.
- E2E WebApp mutations в отдельной тестовой Supabase среде.
- Метрики latency/error rate для ручных update/delete.

## Не входит в MVP

CRM, склад, касса, онлайн-оплата и клиентская база.

## Production verification

24 июня 2026 server-side smoke подтвердил raw initData auth, session cookie, единый seller shop и ненулевые `sales/sale_items` counts. В backlog остаётся только автоматизация запуска smoke из реального Telegram-клиента после deploy.
