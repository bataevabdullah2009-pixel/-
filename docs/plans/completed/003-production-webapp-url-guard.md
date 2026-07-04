# 003 - Production-защита URL WebApp

Статус: завершённый исторический план.

Актуальные правила развертывания описаны в [../../rules/deployment.md](../../rules/deployment.md) и [../../specs/technical/deployment-vercel.md](../../specs/technical/deployment-vercel.md).

## Контекст

Telegram WebApp и webhook зависят от корректного публичного HTTPS URL. Ошибка в URL приводит к тому, что:

1. Кнопка `Открыть отчёт` открывает неправильный адрес.
2. Telegram webhook не доставляет updates.
3. Диагностика показывает неверный endpoint.
4. Production-пользователь не может открыть WebApp.

## Цель

Сделать проверку публичного URL явной:

1. Один production URL используется для WebApp.
2. Webhook URL собирается предсказуемо.
3. Бот не публикует невалидную кнопку WebApp.
4. Ошибка конфигурации видна до production smoke.

## Объём работ

В план входило:

1. Проверка `NEXT_PUBLIC_APP_URL`.
2. Проверка URL для Telegram buttons.
3. Поддержка `PUBLIC_WEBHOOK_URL`.
4. Документирование production URL.
5. Диагностика настройки webhook.

Не входило:

1. Полный rollback-процесс.
2. Проверка всех production env.
3. Расширенная security matrix.
4. Изменение логики Telegram bot.

## Что было сделано

1. Уточнён контракт публичного URL WebApp.
2. Runtime бота стал использовать корректный WebApp URL для кнопок.
3. Настройка webhook стала учитывать отдельный public webhook URL.
4. Диагностика стала показывать проблемы URL раньше.
5. Документация зафиксировала обязательность корректного HTTPS URL.

## Критерии закрытия

План считался закрытым, когда:

1. WebApp button строился из production URL.
2. Webhook route можно было настроить отдельно.
3. Невалидный URL не проходил незаметно.
4. Диагностика помогала проверить текущий webhook.

## Что актуально сейчас

Текущий код по-прежнему требует:

1. Корректный `NEXT_PUBLIC_APP_URL` для WebApp.
2. Корректный webhook endpoint.
3. HTTPS URL для Telegram.
4. Проверку `npm.cmd run telegram:webhook-info` после настройки webhook.

Fallback WebApp не меняет контракт Telegram webhook.

## Что изменилось позже

Последующие планы добавили:

1. `allowed_updates` с `callback_query`.
2. Production smoke для callback-кнопок.
3. Более строгую проверку WebApp session.
4. Отдельные deployment и security rules.

## Связанные документы

1. [Правила развертывания](../../rules/deployment.md).
2. [Развертывание Vercel](../../specs/technical/deployment-vercel.md).
3. [Telegram webhook](../../specs/technical/telegram-webhook.md).
4. [Правила безопасности](../../rules/security.md).
