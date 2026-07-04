# 013 - Доставка callback, панель проверки и разделение парсера

Дата: 2026-07-02

## Цель

Устранить недоставку updates callback Telegram, вернуть проверку WebApp как полноценный рабочий экран, улучшить разделение товаров из одной голосовой расшифровки и привести документацию к фактическому коду.

## Диагностика

- Production webhook URL совпал с ожидаемым backend URL.
- `getWebhookInfo` показал `allowed_updates: ["message"]`.
- Из-за этого Telegram доставлял updates voice/message, но не доставлял `callback_query`.
- Handler callback уже существовал, но backend не мог получить нажатия кнопок.

## Telegram

- `scripts/set-telegram-webhook.ts` устанавливает `allowed_updates: ["message", "callback_query"]`.
- Webhook route пишет безопасный лог `telegram_update_received`.
- Лог содержит `has_message`, `has_voice`, `has_callback_query`, `callback_query_id`, `callback_data`, `callback_from_id`, `callback_message_id`.
- Callback data остаются короткими: `confirm:<sale_id>` и `cancel:<sale_id>`.
- Устаревший `voice_sale_review:<action>:<sale_id>` сохраняется для старых сообщений.
- После confirm/cancel Telegram message редактируется, а inline keyboard убирается.
- Повторная кнопка получает `Эта запись уже обработана` и не меняет данные повторно.
- Неправильный callback получает понятный ответ без падения handler.

## Парсер

- Одна голосовая запись может содержать много `sale_items`.
- Если LLM склеил несколько товаров в одну позицию, детерминированный слой доказательств пытается разделить расшифровку по точкам, запятым и союзам.
- Поддержаны формулировки с количеством перед товаром: `3 штуки Сникерса по 200 рублей`.
- Поддержан smoke-пример `Шоколад 5 штук по 100 рублей, хлеб 4 штуки по 50 рублей`.
- Нераспознанные цена/количество переводят в проверку только проблемную позицию.

## WebApp

- Навигация: `Отчёт`, `Проверка`, `Записи`, `Продавцы`.
- `/review` показывает только активные позиции `needs_review` текущего магазина и периода.
- Каждая позиция остаётся отдельной карточкой.
- `Подтвердить`, `Отмена` и `Подтвердить всё` вызывают серверные действия.
- Actions revalidate `/review`, `/daily-report`, `/records`, `/sellers`.
- На этом этапе была первая спокойная SaaS-версия WebApp; актуальная палитра после 014: фон `#0B1020`, поверхности `#12192B`/`#161F34` и синий акцент `#5B8CFF`.
- KPI компактные 2x2, диаграмма не растягивает один столбец, топ товаров ограничен пятью строками.

## Проверка

- `npm.cmd run telegram:webhook-info` до правки подтвердил отсутствие `callback_query`.
- `npm.cmd run telegram:set-webhook` применил новый webhook contract.
- `npm.cmd run telegram:webhook-info` после правки подтвердил `["message", "callback_query"]`.
- `npm.cmd run test` прошёл после кодовых правок.
- `npm.cmd run build` прошёл после кодовых правок.
- Финальный release gate должен повторить `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run web:build`.

## Задел

- Реальное нажатие inline-кнопок Telegram после развертывания с проверкой логов Vercel.
- Ручная smoke-проверка голоса на production-боте для двух сценариев: уверенная продажа и сомнительная продажа.
- Визуальная проверка WebApp на нескольких мобильных viewport.
