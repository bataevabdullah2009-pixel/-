# Готовность к production

Статус: функционально готово к release gate при успешных локальных проверках и отдельной production smoke-проверке Telegram.

## Реализовано

Telegram:

1. Reply-кнопка `web_app`.
2. Inline-кнопка `web_app` в `/start`.
3. Кнопка chat menu `web_app`.
4. Конвейер голосовых сообщений.
5. Inline-кнопки проверки.
6. Короткие данные callback `confirm:<sale_id>` и `cancel:<sale_id>`.
7. Поддержка устаревшего префикса callback.
8. Идемпотентность callback.
9. Маршрут webhook с проверкой секрета.
10. Безопасное логирование update.

WebApp:

1. `/daily-report`.
2. `/review`.
3. `/records`.
4. `/sellers`.
5. Страница `/debug-telegram` за gate.
6. Нижняя навигация.
7. Bootstrap Telegram auth.
8. HttpOnly cookie initData.
9. Fallback-режим.
10. Явные состояния ошибок auth/БД.
11. Компактные карточки item.
12. Inline edit.
13. Мягкое удаление.
14. Restore.
15. Reset day.
16. Подтверждение/отмена/массовое подтверждение проверки.

Backend:

1. Supabase service role только на сервере.
2. RLS включён на public tables.
3. Таблица `owners` для owner binding.
4. Создание seller из owner binding в том же shop.
5. `save_voice_sale` RPC.
6. Read-back проверка после RPC.
7. Parser diagnostics.
8. Metadata мягкого удаления.
9. `cancelled` parent status.
10. Правила выручки на уровне позиции.
11. Audit logs по возможности.

Testing:

1. Регрессионные тесты парсера.
2. Тесты callback/клавиатуры Telegram.
3. Сервисные тесты подтверждения/отмены.
4. Тесты сессии WebApp.
5. Тесты записей/отчёта.
6. Тесты logger.
7. Тесты audio conversion.
8. Скрипты сборки/проверки типов.

## Релизная проверка

Запустить локально:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
npm.cmd run smoke:voice
npm.cmd run smoke:webapp
npm.cmd run smoke:telegram
```

Ожидается:

1. Lint проходит.
2. Unit/regression тесты проходят.
3. Сборка workspace проходит.
4. Сборка WebApp проходит.
5. Нет новых TypeScript errors.
6. Нет раскрытия секретов в клиентском bundle.

## Проверка Supabase

Перед развертыванием:

1. Миграции применены.
2. Таблица `owners` существует.
3. Колонки мягкого удаления `sale_items` существуют.
4. `sales.status` разрешает `cancelled`.
5. `voice_records.status` разрешает `cancelled`.
6. `sale_items.status` разрешает `excluded`.
7. RPC `save_voice_sale` существует.
8. Grant выполнения RPC только для service role.
9. Storage bucket `voice-records` существует.
10. Service role key задан только на сервере.
11. Supabase project не `INACTIVE` и отвечает на read-only API query.
12. Production schema smoke видит требуемые columns, RPC `save_voice_sale` и bucket до любых выводов о готовности.

## Проверка Telegram

После развертывания:

1. Установить webhook через `npm run telegram:set-webhook`.
2. Проверить через `npm run telegram:webhook-info`.
3. Подтвердить, что production URL корректен.
4. Подтвердить, что секрет webhook активен.
5. Подтвердить, что `allowed_updates` включает `message`.
6. Подтвердить, что `allowed_updates` включает `callback_query`.
7. Подтвердить, что логи callback появляются при нажатии кнопки.

## Проверка auth WebApp

Проверить:

1. Открыть через кнопку Telegram.
2. `initDataLength > 0` в safe logs.
3. `/api/auth/telegram` возвращает успех.
4. Cookie установлена.
5. Лог auth содержит ожидаемый Telegram user id.
6. Лог auth содержит ожидаемые seller/shop.
7. Путь missing/invalid initData показывает читаемую ошибку.
8. Прямой браузер работает только если fallback включён.
9. Магазин fallback-продавца совпадает с fallback-магазином.

## Продуктовая smoke-проверка

Уверенный голос:

```text
Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей.
```

Ожидается:

1. Бот отвечает, что идёт обработка.
2. Бот отвечает успехом.
3. Sale status равен `processed`.
4. Voice status равен `processed`.
5. Существуют два items.
6. Items имеют `processed`.
7. Total равен `1100`.
8. Выручка отчёта включает `1100`.

Голос на проверке:

```text
Корзина продуктов.
```

Ожидается:

1. Бот сохраняет строку проверки.
2. Бот показывает только две кнопки проверки.
3. `/review` показывает active item.
4. Подтверждение без полной позиции возвращает сообщение no-confirmable.
5. Редактирование может сделать позицию обработанной.
6. Отмена может исключить активные позиции.

Mixed cart:

```text
Хлеб 3 штуки по 50 рублей. Корзина продуктов.
```

Ожидается:

1. Valid item может войти в revenue.
2. Incomplete item остаётся в review.
3. Родительская продажа может остаться `needs_review`.
4. Подтверждение не проваливает всю корзину.

## Smoke-проверка WebApp

1. `/daily-report` загружается.
2. Metrics показывают expected values.
3. DateFilter работает.
4. `/review` загружается.
5. Confirm action работает.
6. Cancel action работает.
7. `/records` загружается.
8. Поиск работает.
9. Фильтр продавца работает.
10. Ссылка на аудио появляется, когда аудио существует.
11. `/sellers` загружается.

Автоматическая production-проверка запускается через `npm run smoke:webapp`: она подписывает свежий initData тем же bot token без вывода значения, проверяет session cookie, четыре server-rendered страницы, Next JS/CSS assets и доступность Telegram SDK. Это не доказывает наличие `window.Telegram.WebApp` в Android/Desktop client, поэтому ручной запуск через кнопку Telegram остаётся обязательным post-deploy шагом.

Read-only Telegram control запускается через `npm run smoke:telegram` и проверяет bot identity, webhook URL/errors/allowed updates и WebApp menu button на доступном активном чате.

Production DB smoke запускается только с явным `PRODUCTION_SMOKE_CONFIRM=voice-sales-log`. Он создаёт записи с уникальным префиксом, проверяет их read-back и удаляет только созданные IDs и storage object.
12. Выручка по продавцу совпадает с отчётом.
13. Редактирование позиции сохраняется после перезагрузки.
14. Удаление позиции сохраняется после перезагрузки.
15. Восстановление позиции пересчитывает отчёт.
16. Reset day исключает только выбранный день.

## Проверка безопасности

1. Browser bundle не содержит `SUPABASE_SERVICE_ROLE_KEY`.
2. Logs не содержат raw initData.
3. Logs не содержат `TELEGRAM_BOT_TOKEN`.
4. Logs не содержат `TELEGRAM_WEBHOOK_SECRET`.
5. Logs не содержат ключи STT/LLM.
6. Клиент не может выбрать `shop_id`.
7. Cross-shop мутация позиции падает.
8. Cross-shop callback падает.
9. Неактивный продавец не может получить доступ.
10. Debug route скрыт без флага.

## Известный задел релиза

1. Production smoke с реальным Telegram-ботом после каждого развертывания.
2. Проверить подписанный URL аудио на production storage.
3. Проверить, что логи Vercel содержат только безопасные metadata.
4. Экспорт CSV/XLSX не реализован.
5. Расширенная аналитика парсера не реализована.
6. Складской учёт не реализован.

## Решение о релизе

Проект можно назвать готовым только когда:

1. Локальная release-проверка проходит.
2. Проверка Supabase проходит.
3. Проверка Telegram webhook проходит.
4. Проверка auth WebApp проходит.
5. Product smoke проходит.
6. Security-проверка не имеет блокирующих проблем.
