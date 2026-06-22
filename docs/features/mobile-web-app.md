# Мобильный Web App

Интерфейс рассчитан на Telegram Mini App: компактная навигация, карточки отчёта и формы с крупными действиями. Бот открывает его через reply, inline или menu `web_app` button с одним каноническим production `NEXT_PUBLIC_APP_URL`; непубличные и временные URL отклоняются до запуска bot runtime. `/start` всегда отправляет новые кнопки.

Официальный Telegram script загружается до hydration. Корневой URL сразу рендерит отчёт без server redirect. Bootstrap ждёт `window.Telegram.WebApp` до 10 секунд, видит `initData`/`initDataUnsafe`, вызывает `ready()` и `expand()`, а общий `apiFetch` добавляет `initData` в `x-telegram-init-data`. `/debug-telegram` показывает `hasWindow`, `hasTelegram`, `hasWebApp`, `initDataLength`, наличие user id, platform, version и `openedFromTelegram`; initData и user payload не выводятся. До завершения bootstrap защищённый отчёт не показывается. Секреты Supabase не попадают в browser bundle.
