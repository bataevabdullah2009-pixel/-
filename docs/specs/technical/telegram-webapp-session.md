# Telegram WebApp session

Статус: реализовано.

## Цель

Безопасно определить пользователя и магазин WebApp без доверия к клиентскому `shop_id`.

WebApp должен открываться внутри Telegram Mini App и в browser fallback только при явной server-side конфигурации.

## Роли

1. Telegram WebApp SDK предоставляет raw `initData`.
2. Клиент проверяет наличие SDK и user id.
3. Клиент отправляет raw initData в API.
4. Сервер проверяет HMAC.
5. Сервер определяет seller/owner binding.
6. Сервер возвращает session context.

## Client bootstrap

Клиент:

1. Загружает `telegram-web-app.js`.
2. Ждёт `window.Telegram.WebApp`.
3. Вызывает `ready()`.
4. Вызывает `expand()`.
5. Проверяет raw `initData`.
6. Проверяет `initDataUnsafe.user.id`.
7. Использует `apiFetch()`.

`apiFetch()` отправляет:

1. `x-app-mode: telegram`, если initData есть.
2. `x-telegram-init-data: <raw initData>`, если initData есть.
3. `x-app-mode: fallback`, если initData нет.

## Raw initData

Передаётся именно raw строка `Telegram.WebApp.initData`.

`initDataUnsafe` не используется для серверной подписи.

Сервер сам парсит user id из проверенной строки.

## HMAC

1. HMAC использует `TELEGRAM_BOT_TOKEN`.
2. `TELEGRAM_WEBHOOK_SECRET` не используется.
3. Data-check-string исключает только `hash`.
4. `signature` остаётся внутри data-check-string.
5. Ключи сортируются детерминированно.
6. Просроченный `auth_date` отклоняется.
7. Невалидный hash отклоняется.

Тесты содержат фиксированный Telegram fixture с `signature` и `photo_url`.

## Seller and owner resolution

Сервер:

1. Сначала ищет active seller по Telegram user id.
2. Если seller найден, использует `seller.shop_id`.
3. Если seller не найден, ищет active owner.
4. Если owner найден, создаёт seller только в owner shop.
5. Если binding отсутствует, возвращает ошибку.
6. Если shop отсутствует, возвращает ошибку.
7. Если seller inactive, возвращает ошибку.

Owner binding не позволяет создать seller в произвольном client shop.

## Browser fallback

Fallback работает только если:

1. `ALLOW_WEBAPP_FALLBACK=true`.
2. `DEFAULT_SHOP_ID` задан на сервере.
3. `DEFAULT_SELLER_ID` задан на сервере.
4. Seller существует.
5. `seller.shop_id` совпадает с `DEFAULT_SHOP_ID`.

Fallback не устанавливает Telegram identity.

Fallback не принимает shop id из query или body.

## Server APIs

`POST /api/auth/telegram`:

1. Читает `x-telegram-init-data`.
2. Проверяет HMAC.
3. Разрешает principal.
4. Ставит session cookie.

Server Components и Server Actions используют:

1. `resolveRequestContext()`.
2. `requireOwner()`.
3. `requireShopAccess()`.

Middleware и UI не считаются security boundary.

## UI states

1. Bootstrap показывает нейтральное ожидание.
2. Auth failure показывает понятную ошибку.
3. DB failure показывает понятную ошибку.
4. Ошибка не превращается в пустой отчёт.
5. «Записей нет» показывается только при успешной загрузке пустых данных.

## Diagnostics

Diagnostics не часть обычного пользовательского сценария.

`/debug-telegram` доступен в production только при:

```text
DEBUG_TELEGRAM_WEBAPP=true
```

Кнопка diagnostics в `/start` добавляется только при этом же флаге.

Diagnostics показывает только безопасные признаки и не показывает raw initData.

## Связь с confirm/cancel

Telegram confirm/cancel callback не использует WebApp session.

Callback использует Telegram update user id.

Вкладка WebApp «Проверка» использует обычную WebApp session через `requireOwner()` и повторно проверяет sale -> shop.

WebApp после refresh видит результат:

1. `processed` после confirm.
2. `cancelled` и soft-deleted items после cancel.

## Ошибки

1. Missing initData при выключенном fallback -> `TELEGRAM_INIT_DATA_MISSING`.
2. Invalid hash -> `TELEGRAM_INIT_DATA_INVALID`.
3. Expired auth date -> `TELEGRAM_INIT_DATA_INVALID`.
4. Missing bot token -> server misconfiguration.
5. Seller not linked -> access error.
6. Seller inactive -> access error.
7. Shop not found -> access error.

Raw initData и секреты не логируются.

## Acceptance criteria

1. Клиентский `shop_id` игнорируется.
2. Валидный Telegram user получает только свой магазин.
3. Fallback не включается неявно.
4. HMAC сохраняет `signature`.
5. `TELEGRAM_WEBHOOK_SECRET` не участвует в HMAC.
6. Diagnostics скрыта без флага.
7. Auth/DB error не показывается как пустой отчёт.
8. Session работает для report, records, sellers и item mutations.

## Не входит в scope

1. Login по телефону.
2. OAuth.
3. Изменение webhook secret.
4. Подтверждение записи в WebApp.
5. Client-side Supabase auth для бизнес-таблиц.
