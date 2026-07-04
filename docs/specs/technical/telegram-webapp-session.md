# Техническая спецификация: сессия Telegram WebApp

## 1. Цель

1. WebApp должен понимать, какой Telegram user открыл приложение.
2. Server должен проверять raw Telegram initData.
3. Server должен вывести shop access из базы.
4. Client не должен передавать authoritative shop id.
5. Session нужна для report, review, records, sellers и sale item mutations.
6. Session не используется Telegram callback confirm/cancel.

## 2. Основные файлы

1. `apps/web/src/lib/telegram-api.ts`.
2. `apps/web/src/lib/telegram-init-data.ts`.
3. `apps/web/src/lib/telegram-principal.ts`.
4. `apps/web/src/lib/owner-auth.ts`.
5. `apps/web/src/app/api/auth/telegram/route.ts`.
6. `apps/web/src/components/TelegramAuthBootstrap.tsx`.

## 3. Bootstrap client

1. Telegram JS SDK загружается в root layout.
2. `TelegramAuthBootstrap` ждёт WebApp.
3. Client читает `window.Telegram.WebApp.initData`.
4. Client отправляет initData в auth route.
5. Server проверяет initData.
6. Client один раз перезагружается после установки session.
7. `ready()` и `expand()` вызываются, когда WebApp существует.

## 4. Проверка InitData

1. Verification использует bot token.
2. Verification строит Telegram data check string.
3. Verification проверяет hash.
4. Verification проверяет auth date freshness.
5. Некорректный hash является `TELEGRAM_INIT_DATA_INVALID`.
6. Отсутствующая initData является `TELEGRAM_INIT_DATA_MISSING`.
7. Отсутствующий bot token является explicit misconfiguration.

## 5. Резолвинг principal

1. Server извлекает Telegram user id.
2. Server сначала пробует linked seller.
3. Если seller существует и active, используется seller shop.
4. Seller shop побеждает, даже если тот же Telegram user является owner в другом месте.
5. Server может создать/привязать seller из owner shop, где код это поддерживает.
6. Inactive seller получает отказ.
7. Отсутствующий shop получает отказ.
8. Resolved principal включает shop id.

## 6. Хранение session

1. Session cookie контролируется server.
2. Cookie представляет verified Telegram principal.
3. Server components вызывают `requireOwner`.
4. Server actions вызывают `requireOwner`.
5. Session failure сопоставляется с user-friendly messages.
6. Client не может подделать session через query params.

## 7. Доступ к отчёту

1. `getReport` требует owner/seller session.
2. `getReviewItems` требует owner/seller session.
3. `getRecords` требует owner/seller session.
4. `getSellerStats` требует owner/seller session.
5. `getSellers` требует owner/seller session.
6. Fallback demo mode явный.
7. Без allowed fallback missing session показывает access notice.

## 8. Доступ к mutation

1. `updateSaleItem` требует session.
2. `excludeSaleItem` требует session.
3. `restoreSaleItem` требует session.
4. `resetDay` требует session.
5. `confirmReviewSaleAction` требует session.
6. `cancelReviewSaleAction` требует session.
7. `confirmAllReviewSalesAction` требует session.
8. Mutations резолвят shop server-side.
9. Mutations проверяют, что parent sale принадлежит resolved shop.
10. Mutations не доверяют hidden form shop fields.

## 9. Связь с Telegram confirm/cancel

1. Telegram callback не использует WebApp session.
2. Telegram callback использует Telegram `ctx.from.id`.
3. Callback резолвит seller в bot service.
4. Callback фильтрует sale по seller и shop.
5. WebApp показывает обновлённый результат после refresh.
6. WebApp `/review` может решать review sales через server actions с той же shop isolation.

## 10. Диагностика

1. Diagnostics component показывает только наличие SDK и initData metadata.
2. Diagnostics никогда не печатает raw initData.
3. Diagnostics никогда не печатает tokens.
4. `/debug-telegram` доступен в development.
5. В production `/debug-telegram` требует `DEBUG_TELEGRAM_WEBAPP=true`.
6. Diagnostics не связан с обычной navigation.
7. Report keyboard может показывать diagnostics только за debug flag.

## 11. Сопоставление ошибок

1. Отсутствует initData -> попросить пользователя открыть WebApp внутри Telegram.
2. Некорректная initData -> попросить пользователя заново открыть отчёт.
3. Истёкший auth date -> invalid session message.
4. Seller not linked -> access denied.
5. Seller inactive -> access disabled.
6. Shop not found -> shop error.
7. Auth misconfiguration -> logged server error.

## 12. Правила безопасности

1. Bot token только server-only.
2. Service role key только server-only.
3. Переменные `NEXT_PUBLIC_` не должны содержать secrets.
4. Client может отправлять initData, но не derived authority.
5. Server заново вычисляет authority.
6. Query param `shop_id` игнорируется filters отчёта.
7. Report читает items только через scoped sales.
8. Actions проверяют row ownership через sale context.

## 13. Маршруты

1. `/daily-report` требует session.
2. `/review` требует session.
3. `/records` требует session.
4. `/sellers` требует session.
5. `/` рендерит report.
6. `/debug-telegram` закрыт dev/debug gate.
7. `/api/auth/telegram` устанавливает session.
8. `/api/telegram/webhook` является bot webhook, а не WebApp auth.

## 14. Крайние случаи

1. Telegram SDK загружается медленно.
2. initData появляется после короткого ожидания.
3. User открывает WebApp вне Telegram.
4. User session истекает.
5. Seller отключён после создания session.
6. Owner и seller используют один Telegram id.
7. Shop был удалён или отсутствует.
8. Client передаёт attacker `shop_id`.
9. Browser блокирует или очищает cookies.

## 15. Критерии приемки

1. Valid initData создаёт usable session.
2. Некорректная initData отклоняется.
3. Отсутствующая initData не показывает молча другой shop.
4. Report игнорирует client shop id.
5. Seller видит только свой shop.
6. Update/delete не могут mutate another shop.
7. Debug page скрыта в production без flag.
8. Telegram callback работает без WebApp session.
9. WebApp `/review` confirm/cancel работает только с verified WebApp session.

## 16. Вне области

1. Password login.
2. OAuth login вне Telegram.
3. Multi-shop switcher.
4. Client-side direct Supabase writes.
