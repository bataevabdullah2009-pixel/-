# Roadmap

## Сейчас

Production-oriented MVP голосового журнала продаж:

- Telegram bot принимает voice;
- STT/LLM parser извлекает товар, количество и цену;
- уверенные позиции сразу входят в отчёт;
- bot success выдаётся только после подтверждённой записи sale + sale_items;
- спорные позиции идут в «Нужно проверить»;
- Mini App работает в Telegram и browser fallback modes;
- есть отчёт, записи, продавцы, корректировка, исключение и восстановление товаров.

## Backlog

- Наблюдаемость webhook/STT/LLM latency и ошибок.
- Улучшение parser prompts на реальных записях.
- Удобное управление sellers/owners в панели.
- E2E browser checks для основных Mini App flows.

## Не входит в MVP

CRM, склад, касса, онлайн-оплата и клиентская база.
