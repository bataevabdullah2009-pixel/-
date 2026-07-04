# Роли и доступ

Статус: реализовано через Telegram user id, записи Supabase и server-side resolution.

## Цель

1. Не доверять клиентскому `shop_id`.
2. Привязать пользователя Telegram к магазину.
3. Разделить Telegram bot flow и WebApp flow.
4. Разрешить owner dashboard без паролей.
5. Поддержать fallback только как явный server-side режим.
6. Не раскрывать service role key в browser.
7. Не показывать данные чужого магазина при ошибке клиента.

## Роли

### Продавец

Продавец - активная запись в таблице `sellers`.

Поля:

1. `id`.
2. `shop_id`.
3. `telegram_id`.
4. `name`.
5. `is_active`.
6. `created_at`.

Продавец может:

1. Отправлять voice-продажи в Telegram bot.
2. Открывать WebApp, если Telegram session валидна.
3. Смотреть dashboard текущего магазина.
4. Выполнять review actions через WebApp, если проект использует продавца как разрешённого пользователя dashboard.
5. Фильтроваться в статистике records/sellers.

Продавец не может:

1. Выбрать чужой `shop_id` query параметром.
2. Подтвердить callback чужой продажи.
3. Изменить item чужого магазина.
4. Использовать WebApp при `is_active = false`.

### Владелец

Владелец - активная запись в таблице `owners`.

Поля:

1. `id`.
2. `shop_id`.
3. `telegram_id`.
4. `name`.
5. `is_active`.
6. `created_at`.
7. `updated_at`.

Владелец используется WebApp resolver. Если продавец с таким Telegram id отсутствует, код может создать seller binding в магазине владельца. Это сохраняет единый downstream contract, потому что отчёт и mutations дальше работают через контекст магазина и seller-compatible access.

Владелец может:

1. Открыть dashboard своего магазина.
2. Получить seller binding в том же магазине.
3. Смотреть report, review, records и sellers.
4. Выполнять server-side mutations в рамках магазина.

Владелец не может:

1. Автоматически переключаться между магазинами.
2. Использовать неактивную запись владельца.
3. Создать продавца в другом магазине.
4. Обойти server-side проверку магазина.

### Резервный пользователь

Резервный пользователь - server-side контекст из env:

```text
ALLOW_WEBAPP_FALLBACK=true
DEFAULT_SHOP_ID=<shop uuid>
DEFAULT_SELLER_ID=<seller uuid>
```

Fallback используется для локальной разработки, browser smoke или явно разрешённого production сценария. Он не берёт `shop_id` из клиента.

Fallback resolver:

1. Проверяет, что режим включён.
2. Читает `DEFAULT_SHOP_ID`.
3. Читает `DEFAULT_SELLER_ID`.
4. Загружает seller из Supabase.
5. Проверяет `seller.is_active`.
6. Проверяет, что `seller.shop_id === DEFAULT_SHOP_ID`.
7. Возвращает контекст владельца с `mode = "fallback"`.

Если `DEFAULT_SHOP_ID` или `DEFAULT_SELLER_ID` не заданы, fallback считается неправильно настроенным и не должен молча открывать пустой dashboard.

### Демо-режим

Demo mode включается через `DEMO_MODE=true`.

Используется для demo/bootstrap сценариев:

1. Без admin client может вернуть in-memory demo context.
2. С admin client пытается найти настроенного demo owner или shop.
3. Не должен подменять реальный Telegram auth, если fallback или Telegram session доступны.

Demo mode не является production моделью доступа.

## Доступ Telegram bot

Bot flow использует `requireSeller(env, telegramId, sellerName)`.

Алгоритм:

1. Получить Telegram user id из `ctx.from.id`.
2. Найти seller по `telegram_id`.
3. Если продавец найден и активен, использовать его `shop_id`.
4. Если продавец найден, но неактивен, отказать.
5. Если продавец не найден и `DEMO_MODE=false`, отказать.
6. Если продавец не найден и `DEMO_MODE=true`, создать продавца в default shop.
7. Сохранять voice-продажу только с resolved seller/shop.

Callback confirm/cancel:

1. Не использует WebApp session.
2. Не использует client `shop_id`.
3. Резолвит продавца по Telegram callback user id.
4. Ищет sale по `id`, `shop_id`, `seller_id`.
5. Не меняет чужую продажу.

## Доступ WebApp

WebApp использует `resolveRequestContext()` / `requireOwner()`.

Источники:

1. Header `x-telegram-init-data`.
2. Server cookie `voice_sales_telegram_init_data`.
3. Fallback env, если разрешён.
4. Demo mode, если применимо.

Telegram mode:

1. Client читает raw `Telegram.WebApp.initData`.
2. Client отправляет raw initData в `/api/auth/telegram`.
3. Server проверяет HMAC через `TELEGRAM_BOT_TOKEN`.
4. Server проверяет freshness `auth_date`.
5. Server извлекает Telegram user id.
6. Server ищет активного продавца.
7. Если продавец отсутствует, server ищет активного владельца.
8. Владелец может создать seller binding в том же магазине.
9. Server ставит httpOnly cookie.
10. Server возвращает `{ ok: true, mode: "telegram" }`.

Cookie не делает client источником полномочий. Server actions всё равно вызывают `requireOwner()`.

## Изоляция магазина

Правило: текущий магазин всегда выводится на сервере.

Запрещённые источники:

1. Query `shop_id`.
2. Form `shop_id`.
3. JSON body `shop_id`.
4. Header с переданным клиентом shop id.
5. LocalStorage/sessionStorage.
6. Client Supabase user metadata.

Разрешённые источники:

1. Активная строка продавца.
2. Активная строка владельца.
3. Проверенный fallback seller/shop env.
4. Demo context.

## Права на данные

Business-таблицы читаются и изменяются server-side:

1. `shops`.
2. `owners`.
3. `sellers`.
4. `products`.
5. `voice_records`.
6. `sales`.
7. `sale_items`.
8. `audit_logs`.

Browser client не выполняет business writes напрямую. Public anon access к business-таблицам не используется как граница безопасности.

## RLS и service role

RLS включён на public tables. Мутации во время выполнения используют service role на сервере, но это не отменяет application-level проверок магазина.

Требования:

1. Service role key только server-side.
2. `NEXT_PUBLIC_` env не содержит секретов.
3. Service role client не импортируется в client components.
4. Server mutations проверяют владение строкой.
5. Audit logs не содержат tokens/initData.

## Сопоставление ошибок

WebApp:

1. Отсутствует initData -> `TELEGRAM_INIT_DATA_MISSING`.
2. Некорректная initData -> `TELEGRAM_INIT_DATA_INVALID`.
3. Отсутствует bot token -> `AUTH_MISCONFIGURED`.
4. Seller missing -> `SELLER_NOT_LINKED`.
5. Seller inactive -> `SELLER_INACTIVE`.
6. Shop missing -> `SHOP_NOT_FOUND`.
7. Fallback mismatch -> `AUTH_MISCONFIGURED`.

UI получает понятные сообщения:

1. Откройте WebApp внутри Telegram.
2. Сессия недействительна или устарела.
3. Нет доступа к магазину.
4. Доступ отключён.
5. Магазин не найден.
6. Не удалось выполнить действие.

## Диагностика

Логи могут содержать:

1. `mode`.
2. `telegramUserId`.
3. `sellerId`.
4. `shopId`.
5. `initDataLength`.
6. `errorReason`.
7. `hasDefaultShop`.
8. `hasDefaultSeller`.

Логи не должны содержать:

1. Raw initData.
2. `TELEGRAM_BOT_TOKEN`.
3. `TELEGRAM_WEBHOOK_SECRET`.
4. `SUPABASE_SERVICE_ROLE_KEY`.
5. STT/LLM keys.

## Критерии приемки

1. Активный продавец открывает только свой магазин.
2. Неактивный продавец не получает доступ.
3. Активный владелец без продавца получает seller binding только в магазине владельца.
4. Fallback работает только с server env.
5. Fallback mismatch блокирует доступ.
6. Callback чужого продавца не меняет продажу.
7. WebApp item mutation чужого магазина не проходит.
8. Report игнорирует client `shop_id`.
9. Records search/filter не расширяет границу магазина.
10. Sellers stats считаются только в текущем магазине.
11. Auth/DB errors не превращаются в empty state.
12. Service role key не попадает в browser bundle.

## Вне области

1. Password login.
2. OAuth login вне Telegram.
3. Multi-shop switcher.
4. Public admin API.
5. Client-side Supabase writes в business-таблицы.
