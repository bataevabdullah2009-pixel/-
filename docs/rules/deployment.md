# Правила развертывания

Этот документ описывает порядок безопасного развертывания Telegram-бота и WebApp. Системные правила продукта находятся в [../specs/00-global.md](../specs/00-global.md), технические детали deployment - в [../specs/29-technical-deployment-vercel.md](../specs/29-technical-deployment-vercel.md).

## 1. Главный принцип

Миграции, окружение и webhook должны быть готовы до production-трафика. Реальную smoke-проверку Telegram нельзя заменять только локальной сборкой.

## 2. Что разворачивается

1. Next.js WebApp.
2. Telegram webhook route.
3. Server Actions WebApp.
4. Supabase schema и RPC.
5. Storage bucket для голосового аудио.
6. Скрипты настройки Telegram webhook.

## 3. Матрица окружения

### Telegram

1. `TELEGRAM_BOT_TOKEN` - обязателен.
2. `TELEGRAM_WEBHOOK_SECRET` - обязателен для production webhook.
3. `PUBLIC_WEBHOOK_URL` - обязателен, если webhook отличается от `NEXT_PUBLIC_APP_URL`.

### WebApp

1. `NEXT_PUBLIC_APP_URL` - публичный HTTPS URL WebApp.
2. `DEBUG_TELEGRAM_WEBAPP` - выключен по умолчанию в production.

### Supabase

1. `SUPABASE_URL` - обязателен.
2. `SUPABASE_ANON_KEY` - используется клиентом только для безопасных публичных сценариев.
3. `SUPABASE_SERVICE_ROLE_KEY` - только server-side.
4. `SUPABASE_STORAGE_BUCKET` - bucket для аудио, обычно `voice-records`.

### STT/LLM

1. `STT_API_KEY`.
2. `STT_API_URL`.
3. `STT_MODEL`.
4. `LLM_API_KEY`.
5. `LLM_API_URL`.
6. `LLM_MODEL`.

### Demo/fallback

1. `DEMO_MODE` - только для контролируемого режима.
2. `DEMO_OWNER_TELEGRAM_ID` - только для demo/bootstrap.
3. `DEFAULT_SHOP_NAME` - только для demo/bootstrap.
4. `ALLOW_WEBAPP_FALLBACK` - в production включать только осознанно.
5. `DEFAULT_SHOP_ID` - нужен для fallback.
6. `DEFAULT_SELLER_ID` - нужен для fallback.

Fallback требует:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

Сервер обязан проверить, что `DEFAULT_SELLER_ID` принадлежит `DEFAULT_SHOP_ID`.

## 4. Порядок развертывания

1. Проверить, что рабочая ветка содержит только ожидаемые изменения.
2. Проверить changelog и документацию.
3. Прогнать локальные проверки качества.
4. Применить Supabase migrations.
5. Проверить наличие bucket для аудио.
6. Развернуть WebApp.
7. Проверить production URL.
8. Установить Telegram webhook.
9. Проверить webhook info.
10. Выполнить production smoke.
11. Проверить логи Vercel и Supabase.

## 5. Команды качества

Перед релизом:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run web:build
```

Webhook:

```bash
npm.cmd run telegram:set-webhook
npm.cmd run telegram:webhook-info
```

Если команда не запускалась или завершилась ошибкой, это должно быть явно зафиксировано в отчёте о релизе.

## 6. Чеклист перед выкладкой

1. Все обязательные env заданы.
2. `NEXT_PUBLIC_APP_URL` указывает на production HTTPS.
3. `PUBLIC_WEBHOOK_URL` корректен или не нужен.
4. `TELEGRAM_WEBHOOK_SECRET` совпадает между приложением и Telegram.
5. `SUPABASE_SERVICE_ROLE_KEY` отсутствует в клиентском bundle.
6. Миграции Supabase применены.
7. RPC `save_voice_sale` доступна server-side.
8. Bucket аудио существует.
9. Fallback выключен или явно согласован.
10. Debug route выключен в production.

## 7. Чеклист после выкладки

1. Открыть WebApp URL.
2. Проверить открытие WebApp из Telegram.
3. Отправить уверенную голосовую продажу.
4. Проверить появление продажи в `Отчёте`.
5. Отправить сомнительную голосовую продажу.
6. Проверить сообщение с двумя кнопками.
7. Нажать `✅ Подтвердить`.
8. Нажать `❌ Отмена` на отдельной тестовой записи.
9. Проверить вкладку `Проверка`.
10. Проверить вкладку `Записи`.
11. Проверить вкладку `Продавцы`.
12. Проверить аудио в журнале, если Storage доступен.
13. Проверить логи без секретов.

## 8. Webhook

Production webhook должен:

1. Указывать на правильный route.
2. Использовать `TELEGRAM_WEBHOOK_SECRET`.
3. Принимать `message`.
4. Принимать `callback_query`.
5. Не зависеть от WebApp session.

Если callback-кнопки не работают, сначала проверить `allowed_updates`.

## 9. Rollback

Rollback нужен, если:

1. Webhook перестал принимать сообщения.
2. WebApp не открывается из Telegram.
3. Продажи не сохраняются.
4. Подтверждение или отмена портят выручку.
5. Есть риск утечки секретов.

Порядок rollback:

1. Остановить продвижение релиза.
2. Зафиксировать симптом и время.
3. Вернуть предыдущий deployment WebApp.
4. Проверить, не требуются ли обратимые миграции.
5. Проверить webhook URL после отката.
6. Выполнить минимальный smoke: `/start`, голосовая запись, WebApp.
7. Записать причину rollback в changelog или release notes.

Нельзя делать destructive reset базы без отдельного решения.

## 10. Release gate

Релиз можно считать готовым, если:

1. Локальные проверки качества пройдены.
2. Миграции применены.
3. Webhook info показывает нужный URL и updates.
4. Реальная уверенная продажа сохраняется.
5. Реальная сомнительная продажа попадает в проверку.
6. Подтверждение и отмена работают.
7. WebApp в Telegram показывает правильный магазин.
8. Логи не содержат секретов.
9. Документация соответствует фактическому поведению.

## 11. Что нельзя делать при релизе

1. Разворачивать код, который требует неприменённой миграции.
2. Включать fallback в production без явной причины.
3. Включать debug route для обычного пользователя.
4. Менять Telegram webhook без проверки `telegram:webhook-info`.
5. Считать локальную сборку заменой production smoke.
6. Публиковать service role key в браузер.
