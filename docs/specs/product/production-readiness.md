# Production Readiness

Реализовано:

- Telegram reply/inline/menu `web_app` buttons;
- безопасная `/debug-telegram` страница;
- отсутствие раннего root redirect;
- client `getAppAuthContext()` и общий `apiFetch()`;
- проверка WebApp/raw initData/unsafe user id до session bootstrap;
- HMAC с актуальным Telegram `signature` и `TELEGRAM_BOT_TOKEN`;
- server `resolveRequestContext()` с Telegram и fallback modes;
- server-derived shop isolation;
- seller creation из active owner binding в том же shop;
- двухшаговое чтение report: shop sales, затем их sale_items;
- явные report/records errors вместо ложных пустых состояний;
- production diagnostics только при `DEBUG_TELEGRAM_WEBAPP=true`;
- service role только на сервере;
- RPC persistence с обязательной read-back проверкой sale и sale_items;
- автоматический `processed` для уверенных voice-позиций;
- review только для реальных проблем распознавания;
- Telegram confirm/cancel для `needs_review` voice-записей;
- `cancelled` для отменённых voice-записей;
- WebApp `/review` подтверждает и отменяет review-записи через server actions;
- WebApp edit review item без скрытого подтверждения;
- soft delete, restore и reset day;
- records с раскрытием товаров;
- sellers со статистикой за период;
- русские UI labels без internal enum;
- regression tests.

Release gate:

- `npm run lint`;
- `npm run test`;
- `npm run build`;
- `npm run web:build`;
- прямое открытие Web App в fallback mode;
- открытие через Telegram кнопку;
- отсутствие `401 TELEGRAM_INIT_DATA_INVALID` при непустом актуальном initData;
- совпадение seller/shop в auth log и report log;
- два voice smoke сценария: готовая продажа и сомнительная продажа;
- confirm сомнительной записи;
- cancel сомнительной записи;
- ручное edit/delete/restore с пересчётом отчёта.
