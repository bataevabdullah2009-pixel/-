# 002 - Авторизация Telegram WebApp

Статус: завершённый исторический план.

Актуальный контракт авторизации описан в [../../specs/24-technical-auth-and-shop-isolation.md](../../specs/24-technical-auth-and-shop-isolation.md). Этот документ фиксирует этап, на котором WebApp начал работать как Telegram Mini App с проверкой initData.

## Контекст

WebApp должен был открываться из Telegram и показывать данные только текущего магазина. Для этого нужно было перейти от простого браузерного сценария к Telegram WebApp session:

1. Получать raw initData от Telegram.
2. Проверять подпись initData на сервере.
3. Связывать Telegram user id с продавцом или владельцем.
4. Хранить session безопасно.
5. Не раскрывать диагностику обычному пользователю.

## Цель

Сделать вход в WebApp безопасным и совместимым с Telegram Mini App:

1. Кнопка Telegram открывает WebApp.
2. WebApp передаёт initData на сервер.
3. Сервер проверяет HMAC.
4. Сервер определяет магазин.
5. Клиент не выбирает `shop_id` самостоятельно.

## Объём работ

В план входило:

1. Кнопки Telegram `web_app`.
2. Bootstrap Telegram SDK на клиенте.
3. Валидация initData.
4. HttpOnly cookie для Telegram session.
5. Безопасная диагностика WebApp.
6. Базовые сообщения об ошибках доступа.

Не входило:

1. Полный owner/seller resolver.
2. Расширенный fallback для браузера.
3. Production hardening всех auth-ошибок.
4. Управление продавцами владельцем.

## Что было сделано

1. Добавлен вход в WebApp через Telegram.
2. Клиент начал передавать raw initData.
3. Сервер стал проверять подпись initData через `TELEGRAM_BOT_TOKEN`.
4. Session стала храниться в HttpOnly cookie.
5. Диагностический экран был ограничен.
6. WebApp получил базовую защиту от произвольного `shop_id`.

## Критерии закрытия

План считался закрытым, когда:

1. WebApp открывался из Telegram.
2. Валидная initData принималась.
3. Невалидная initData отклонялась.
4. Session сохранялась без раскрытия raw initData в UI.
5. Диагностика не показывала секреты.

## Что изменилось позже

План 005 и последующие этапы уточнили поведение:

1. Отсутствие initData больше не блокирует весь UI, если явно включён fallback.
2. Fallback требует `ALLOW_WEBAPP_FALLBACK`, `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID`.
3. Сервер проверяет соответствие fallback seller и shop.
4. Owner/seller resolver стал частью общего request context.
5. Ошибки auth больше не должны маскироваться пустым отчётом.

## Связанные документы

1. [Авторизация и изоляция магазина](../../specs/24-technical-auth-and-shop-isolation.md).
2. [Сессия Telegram WebApp](../../specs/23-technical-telegram-webapp-session.md).
3. [Роли и доступ](../../specs/11-product-roles-and-access.md).
4. [Правила безопасности](../../rules/security.md).
