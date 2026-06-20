# Мобильный Web App

Интерфейс рассчитан на Telegram Mini App: компактная навигация, карточки отчёта и формы с крупными действиями. Бот открывает его через `web_app`; Telegram script вызывает `ready()`, а frontend передаёт `initData` в `x-telegram-init-data`. До завершения bootstrap защищённый отчёт не показывается. Секреты Supabase не попадают в browser bundle.
