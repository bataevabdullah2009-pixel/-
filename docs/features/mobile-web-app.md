# Mobile Web App

WebApp оптимизирован для Telegram Mini App на телефоне и для явно разрешённого browser fallback. Основной пользовательский экран - не landing page, а рабочая панель отчёта.

## Entry points

Пользователь открывает WebApp через:

1. Telegram menu button `Открыть отчёт`.
2. Reply keyboard button `Открыть отчёт`.
3. Inline WebApp button из `/start`.
4. Direct browser fallback only when server env allows it.

Review voice message не содержит кнопку `Открыть отчёт`; под ним остаются только `✅ Подтвердить` и `❌ Отмена`.

## Auth bootstrap

Telegram mode:

1. Root layout загружает Telegram SDK.
2. `TelegramAuthBootstrap` ждёт `window.Telegram.WebApp`.
3. Client проверяет raw `initData`.
4. Client проверяет `initDataUnsafe.user.id`.
5. Client отправляет raw initData в `/api/auth/telegram`.
6. Server проверяет HMAC.
7. Server ставит httpOnly cookie.
8. Client reloads after session.

Fallback mode:

1. Raw initData отсутствует.
2. Server проверяет `ALLOW_WEBAPP_FALLBACK=true`.
3. Server читает `DEFAULT_SHOP_ID`.
4. Server читает `DEFAULT_SELLER_ID`.
5. Server загружает seller.
6. Server проверяет seller active.
7. Server проверяет seller shop matches fallback shop.
8. UI получает mode `fallback`.

## Auth errors

WebApp явно показывает:

1. Missing initData.
2. Invalid/expired initData.
3. Seller not linked.
4. Seller inactive.
5. Shop not found.
6. Fallback misconfiguration.
7. Supabase load error.

Ошибка не заменяется нулевым отчётом.

## Navigation

Нижняя навигация:

1. `Отчёт`.
2. `Проверка`.
3. `Записи`.
4. `Продавцы`.

Навигация должна быть компактной и доступной большим пальцем. Diagnostics не входит в обычную навигацию.

## Visual system

Current style:

1. Background `#0B1020`.
2. Surface `#12192B`.
3. Secondary surface `#161F34`.
4. Main accent `#5B8CFF`.
5. Warning `#F59E0B` только для review.
6. Danger `#EF4444` только для destructive actions.

Цель интерфейса - спокойная рабочая SaaS-панель, а не промо-страница.

## Report mobile layout

На мобильном экране:

1. Метрики раскладываются компактно.
2. DateFilter остаётся в горизонтальной строке.
3. Chart не растягивает один столбец на весь экран.
4. Top products остаются читаемыми.
5. Последние продажи показываются компактными карточками.
6. Review block не смешивается с revenue.
7. Deleted items прячутся в details panel.

## Review mobile layout

Вкладка `Проверка`:

1. Показывает отдельные cards для active review items.
2. Показывает причины review.
3. Содержит `Подтвердить`.
4. Содержит `Отмена`.
5. Содержит `Подтвердить всё`, если есть sale ids.
6. Использует server actions.
7. Показывает mutation result через notice.
8. Не требует ручного reload после успешной операции.

Mixed sale подтверждает валидные items и оставляет неполные в review.

## Sale item card UX

1. Touch targets для action buttons должны быть около 44 px.
2. Edit открывается только по карандашу.
3. Delete открывается только по корзине.
4. В обычном режиме нет больших постоянных action buttons под карточкой.
5. Form раскрывается внутри карточки.
6. Ошибка сохранения не очищает ввод.
7. Pending state блокирует повторный submit.
8. Delete требует локальное подтверждение.

## Records and sellers

Records:

1. Поддерживает период.
2. Поддерживает seller filter.
3. Поддерживает search.
4. Показывает audio link при наличии.
5. Раскрывает товары.
6. Не показывает confirm/cancel.

Sellers:

1. Показывает active/inactive state.
2. Показывает last activity.
3. Показывает records count.
4. Показывает revenue.
5. Использует тот же DateFilter.

## Diagnostics

`/debug-telegram`:

1. Доступен в development.
2. Доступен в production только при `DEBUG_TELEGRAM_WEBAPP=true`.
3. Не связан из обычной навигации.
4. Не показывает raw initData.
5. Не показывает secrets.

Auth logs могут содержать только safe metadata: initData length, Telegram user id, seller id, shop id, mode, error reason.

## Acceptance criteria

1. WebApp opens inside Telegram.
2. Valid initData establishes session.
3. Direct browser shows fallback only when enabled.
4. Missing session shows readable access message.
5. Navigation has exactly four main sections.
6. Report cards fit mobile viewport.
7. Review actions are usable on mobile.
8. Edit/delete do not shift layout unpredictably.
9. Auth/DB errors remain visible.
10. Diagnostics stay gated in production.
