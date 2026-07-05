# Правила безопасности

Этот документ описывает угрозы, границы доверия и checklist безопасности проекта. Подробности авторизации WebApp описаны в [../specs/24-technical-auth-and-shop-isolation.md](../specs/24-technical-auth-and-shop-isolation.md).

## 1. Главный принцип

UI не является границей безопасности. Все права на магазин, продавца, продажу и позицию проверяются на сервере.

## 2. Активы, которые нужно защищать

1. `TELEGRAM_BOT_TOKEN`.
2. `TELEGRAM_WEBHOOK_SECRET`.
3. `SUPABASE_SERVICE_ROLE_KEY`.
4. `STT_API_KEY`.
5. `LLM_API_KEY`.
6. Raw Telegram initData.
7. Данные продаж и выручки магазина.
8. Аудиозаписи продаж.
9. Привязки owner/seller к магазину.

## 3. Границы доверия

Доверенные источники:

1. Серверная проверка Telegram initData.
2. Серверная строка seller.
3. Серверная строка owner.
4. Явно разрешённый fallback env.
5. Service role client только на сервере.

Недоверенные источники:

1. Query parameters.
2. Form fields.
3. JSON body от клиента.
4. LocalStorage.
5. Client-side Supabase session metadata.
6. Любой `shop_id`, переданный браузером.

## 4. Threat model

### Угроза: доступ к чужому магазину

Риск: пользователь меняет `shop_id` в форме или URL.

Защита:

1. `shop_id` не принимается от клиента.
2. Server Actions повторно резолвят магазин.
3. Reads выбирают данные только по server-derived shop.
4. Mutations проверяют parent sale/item shop.

### Угроза: подделка Telegram WebApp session

Риск: пользователь подставляет чужие initData.

Защита:

1. Проверять HMAC через `TELEGRAM_BOT_TOKEN`.
2. Проверять свежесть `auth_date`.
3. Не использовать `TELEGRAM_WEBHOOK_SECRET` для WebApp auth.
4. Не логировать raw initData.

### Угроза: вызов Telegram webhook не Telegram

Риск: внешний запрос отправляет fake update.

Защита:

1. Проверять `x-telegram-bot-api-secret-token`.
2. Сравнивать secret constant-time.
3. Логировать только безопасную metadata.
4. Не выполнять бизнес-действия без seller lookup.

### Угроза: утечка service role key

Риск: ключ попадает в клиентский bundle или лог.

Защита:

1. Использовать service role только server-side.
2. Не импортировать admin client в client components.
3. Проверять client assets перед релизом.
4. Не логировать env values.

### Угроза: повреждение выручки через повторные действия

Риск: повторный callback создаёт дубли или меняет уже обработанную запись.

Защита:

1. Confirm/cancel должны быть идемпотентными.
2. Уже обработанные и отменённые записи возвращают безопасный результат.
3. Пересчёт sale выполняется после мутаций.
4. Выручка считается по active `sale_items`.

### Угроза: раскрытие аудио

Риск: аудиозаписи доступны публично без контроля.

Защита:

1. Хранить audio path в Supabase.
2. Создавать signed URL server-side.
3. Не раскрывать bucket credentials.
4. Не показывать аудио при ошибке доступа.

### Угроза: диагностика раскрывает секреты

Риск: debug page или logs показывают initData, tokens или API keys.

Защита:

1. `/debug-telegram` закрыт в production без `DEBUG_TELEGRAM_WEBAPP=true`.
2. Логи содержат только безопасные поля.
3. Raw initData не выводится.
4. Токены не выводятся даже в ошибках.

## 5. Разрешённые поля логов

Можно логировать:

1. `mode`.
2. `telegramUserId`.
3. `sellerId`.
4. `shopId`.
5. `saleId`.
6. `itemId`.
7. `hasDefaultShop`.
8. `hasDefaultSeller`.
9. `initDataLength`.
10. `errorReason`.
11. Stage voice pipeline.

Нельзя логировать:

1. Raw initData.
2. Bot token.
3. Webhook secret.
4. Supabase service role key.
5. STT key.
6. LLM key.
7. Полные Authorization headers.
8. Signed URL дольше, чем нужно для диагностики.

## 6. RLS и service role

Правила:

1. RLS остаётся включённым.
2. Service role используется только серверным кодом.
3. Business authorization выполняется в application service layer.
4. Browser client не должен выполнять business mutations напрямую.
5. Любая мутация должна проверять текущий магазин.

## 7. Checklist для изменений WebApp

Перед merge проверить:

1. Нет доверия к client `shop_id`.
2. Server Action резолвит текущий context.
3. Item/sale принадлежит текущему магазину.
4. Ошибка auth не превращается в пустой отчёт.
5. Client component не импортирует service role client.
6. Sensitive data не выводится в UI.

## 8. Checklist для изменений Telegram

Перед merge проверить:

1. Webhook secret проверяется.
2. Callback использует Telegram user id.
3. Sale фильтруется по seller и shop.
4. Callback data не содержит лишних прав.
5. Повторный callback безопасен.
6. Logs не содержат токенов и raw update с секретами.

## 9. Checklist для изменений Supabase

Перед merge проверить:

1. Есть миграция для новой колонки или constraint.
2. Нет destructive reset без отдельного решения.
3. Grants/RLS не открывают бизнес-таблицы публично.
4. RPC доступна только нужной роли.
5. Документация БД обновлена.
6. Тесты покрывают изменение выручки или статуса.

## 10. Checklist перед production

1. Проверить env без вывода значений.
2. Проверить отсутствие service role key в client assets.
3. Проверить `telegram:webhook-info`.
4. Проверить WebApp auth в реальном Telegram.
5. Проверить fallback выключен или явно согласован.
6. Проверить debug route выключен.
7. Проверить логи после smoke.
8. Проверить, что аудио доступно только через server-side signed URL.

## 11. Запрещённые решения

1. Доверять `shop_id` из браузера.
2. Логировать raw initData.
3. Логировать токены или ключи.
4. Встраивать service role key в client code.
5. Скрывать auth/DB ошибки пустым отчётом.
6. Открывать production diagnostics без флага.
7. Физически удалять пользовательские продажи вместо soft delete без отдельного решения.

## 12. Критерии готовности безопасности

Изменение считается безопасным для релиза, если:

1. Оно не расширяет доверие к клиенту.
2. Оно сохраняет server-side shop isolation.
3. Оно не раскрывает секреты.
4. Оно не ломает idempotency подтверждения/отмены.
5. Оно не даёт чужому продавцу доступ к продаже.
6. Оно имеет обновлённую документацию и проверочные сценарии.
