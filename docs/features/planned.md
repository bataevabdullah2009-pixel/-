# Запланированные функции

## Перед сдачей

- Production smoke с реальным Telegram bot и тестовой Supabase БД.
- Проверка реального audio playback из Supabase Storage.
- Проверка Vercel logs после deploy: webhook callbacks, permission errors, missing columns.
- Ручная проверка сценариев из README product smoke.

## После сдачи

- Роль владельца магазина с отдельной страницей управления продавцами.
- Экспорт отчёта в CSV/XLSX.
- Фильтр по товару в журнале записей.
- Восстановление soft-deleted items через отдельный audit-safe экран.
- Улучшенный мониторинг parser confidence и STT failures.

## Не планируется в текущем scope

- Переписывание уже работающего WebApp confirm/cancel flow.
- Переписывание STT.
- Переписывание parser.
- Замена Supabase persistence.
- Полный desktop admin dashboard.
