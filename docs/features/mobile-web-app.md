# Мобильный Web App

Интерфейс рассчитан на Telegram Mini App: компактная навигация, карточки отчёта и формы с крупными действиями. Бот открывает его через inline или нижнюю `web_app` button с одним каноническим production `NEXT_PUBLIC_APP_URL`; временные local/ngrok/Vercel preview URL отклоняются до запуска bot runtime.

Официальный Telegram script загружается до hydration. Bootstrap ждёт `window.Telegram.WebApp`, видит `initData`/`initDataUnsafe`, вызывает `ready()` и `expand()`, а общий `apiFetch` добавляет `initData` в `x-telegram-init-data`. В development логируются только `hasTelegramObject`, `hasWebApp`, `hasInitDataUnsafe`, `initDataLength`, `platform`, `version`; initData и user payload не логируются. До завершения bootstrap защищённый отчёт не показывается. Секреты Supabase не попадают в browser bundle.
