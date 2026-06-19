# Проверка

Локально проверяются:

- ручное исправление `quantity = 20`, `price = 300`, `total = 6000`, `status = processed`;
- soft delete с непустым `deleted_at`, `status = excluded` и причиной `excluded_by_owner`;
- исключение `excluded` и `needs_price` из выручки;
- включение активной `processed`-позиции в выручку;
- `npm run lint`, `npm run test` и `npm run build`.

19 июня 2026 года команды прошли: ESLint без ошибок, 6 файлов/29 тестов Vitest, production-сборка bot, web и shared.

Локальный `/daily-report` открыт на viewport 390 × 844: страница содержит сводку, фильтры, блок товаров и мобильную навигацию; `scrollWidth <= innerWidth`, browser errors и Next.js error overlay отсутствуют.

Фактическое применение migration к удалённому Supabase и браузерный сценарий с реальными строками не объявляются выполненными без внешнего доступа.
