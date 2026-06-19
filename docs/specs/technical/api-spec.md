# Спецификация API

## HTTP route `/api/telegram/webhook`

| Поле | Контракт |
| --- | --- |
| Метод | `POST` |
| Среда выполнения | Node.js, динамический route, `maxDuration = 60` |
| Вход | Telegram Update JSON и заголовок `x-telegram-bot-api-secret-token` |
| Успех | `200 { "ok": true }` |
| Неверный секрет | `401 { "ok": false }` |
| Ошибка обработки | `200 { "ok": false }`, ошибка журналируется без секрета |
| Безопасность | Сравнение с `TELEGRAM_WEBHOOK_SECRET` через `timingSafeEqual` |

Route не дублирует логику бота и вызывает `processTelegramUpdate(update)`. Ответ `200` при ошибке предотвращает автоматический повтор Telegram, но вместе с отсутствием транзакции означает риск потери update после частичного сбоя.

## Отчёты и записи

Публичных JSON route для отчётов нет. `/daily-report`, `/records` и `/sellers` являются страницами Next.js; серверные компоненты читают данные через `records.api.ts`.

## Внутренние серверные действия

Слой `records.api.ts` предоставляет серверные функции `getReport`, `getReviewItems`, `updateSaleItem` и `excludeSaleItem`. Модули с административным Supabase-клиентом помечены как server-only; `SUPABASE_SERVICE_ROLE_KEY` не попадает в браузерный bundle.

| Действие | Вход | Результат | Основные ошибки |
| --- | --- | --- | --- |
| `updateSaleItemAction` | ID, имя, `quantity > 0`, `price > 0`, обратный URL | Обновление одной активной позиции, `total = quantity × price`, `processed`, `confidence = 1`, `updated_at`, пересчёт и аудит | Пользователь получает только безопасное сообщение сохранения |
| `excludeSaleItemAction` | ID позиции | `excludeSaleItem`: `deleted_at`, `deleted_reason = excluded_by_owner`, `status = excluded`, `updated_at` и пересчёт | Пользователь получает только безопасное сообщение исключения |
| `restoreSaleItemAction` | ID позиции | Снятие удаления и возврат предыдущего статуса | Нет позиции или окружения |
| `resetDayRevenueAction` | Сегодня, вчера или дата | Мягкое удаление всех активных позиций дня | Диапазон больше одного дня запрещён |

Это не внешний REST API. Сейчас действия используют service role без авторизации владельца и допустимы только для учебных данных.
