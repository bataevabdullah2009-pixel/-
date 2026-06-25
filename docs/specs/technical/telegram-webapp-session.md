# Telegram WebApp session

Статус: реализовано; в текущем изменении логика сессии не менялась.

## Цель

Безопасно определить пользователя и магазин WebApp, не доверяя данным `shop_id` от клиента.

## Пользовательские сценарии

- Открытие отчёта из Telegram `web_app` кнопки.
- Повторное открытие с действующей session cookie.
- Browser fallback при явной server-side конфигурации.
- Понятная ошибка при отсутствующем, просроченном или невалидном initData.

## Роли

- Telegram WebApp SDK — предоставляет raw `initData` и `initDataUnsafe.user.id`.
- Клиент — проверяет наличие SDK/данных и отправляет raw строку.
- Сервер — проверяет HMAC и разрешает principal/shop.
- Seller/owner binding — связывает Telegram id с магазином.

## UI/UX

Во время bootstrap показывается нейтральное состояние проверки. Auth failure показывает понятное пользовательское сообщение и не подменяется пустым отчётом. Telegram SDK может добавлять CSS variables в `<html>` до hydration; root layout использует `suppressHydrationWarning` только для этого внешнего изменения.

## API и серверная логика

- `POST /api/auth/telegram` принимает `x-telegram-init-data`.
- HMAC использует `TELEGRAM_BOT_TOKEN`, исключает только `hash`.
- `signature` остаётся в data-check-string.
- `TELEGRAM_WEBHOOK_SECRET` не участвует в WebApp auth.
- `resolveRequestContext()` сначала использует header/cookie, затем явно разрешённый fallback.
- Fallback требует `ALLOW_WEBAPP_FALLBACK=true`, `DEFAULT_SHOP_ID`, `DEFAULT_SELLER_ID` и проверку совпадения shop.

## Таблицы БД

- `owners`;
- `sellers`;
- `shops`.

Бизнес-данные затем читаются только по server-derived `shop_id`.

## Ошибки и edge cases

- Missing initData при выключенном fallback → `TELEGRAM_INIT_DATA_MISSING`.
- Invalid hash/expired auth date → `TELEGRAM_INIT_DATA_INVALID`.
- Неактивный seller → `SELLER_INACTIVE`.
- Несвязанный пользователь → `SELLER_NOT_LINKED`.
- Отсутствующий shop → `SHOP_NOT_FOUND`.
- Секреты и raw initData не логируются.

## Acceptance criteria

- Клиентский `shop_id` игнорируется.
- Валидный Telegram user получает данные только своего магазина.
- Fallback не активируется неявно.
- Diagnostics route и кнопка скрыты без `DEBUG_TELEGRAM_WEBAPP=true`.
- Auth/DB error не превращается в пустой отчёт.

## Не входит в scope

Изменение webhook, Telegram bot token lifecycle, login по номеру телефона, OAuth и изменение voice pipeline.
