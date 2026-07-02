# Mobile Web App

Web App оптимизирован для мобильного Telegram и прямого browser fallback открытия.

Auth modes:

- Telegram mode: bootstrap проверяет `window.Telegram.WebApp`, непустой raw `initData` и `initDataUnsafe.user.id`; `apiFetch` отправляет `x-app-mode: telegram` и raw строку в `x-telegram-init-data`.
- Fallback mode: initData нет, `apiFetch` отправляет `x-app-mode: fallback`, сервер загружает fallback seller и проверяет совпадение его `shop_id` с `DEFAULT_SHOP_ID`.

Во время bootstrap UI показывает состояние проверки. Ошибка Telegram или сервера отображается явно и не заменяется нулевым отчётом. Если raw initData валиден, production-блокировка «откройте через кнопку бота» не показывается.

Auth log содержит только безопасные признаки: `initDataLength`, Telegram user id, seller id, shop id и error reason. Raw initData, bot token и webhook secret не логируются.

Debug page и кнопка `/debug-telegram` доступны в production только при `DEBUG_TELEGRAM_WEBAPP=true`.

Навигация: отчёт, проверка, записи, продавцы.

Отчёт выполнен в calm premium SaaS стиле: background `#0B1020`, surfaces `#12192B`/`#161F34`, основной accent `#5B8CFF`, warning только для review. Он показывает четыре компактные метрики: выручка, количество товаров, записи и «Нужно проверить». На мобильном экране они раскладываются в две колонки и не занимают половину экрана.

Карточки товара используют touch targets 44×44 px. На мобильном экране действия расположены справа, форма раскрывается внутри карточки, а фильтры периода остаются в одной горизонтально прокручиваемой строке.

Вкладка `Проверка` показывает active `needs_review` позиции отдельными компактными карточками и объясняет, чего не хватает: цены, количества/веса или отдельного товара. Подтверждение, отмена и `Подтвердить всё` выполняются через server actions и синхронизируются с теми же статусами, что Telegram inline-кнопки; mixed sale подтверждает валидные items и оставляет неполные в review.
