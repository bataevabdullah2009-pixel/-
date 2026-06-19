# GitHub Actions

## Обязательный workflow

На чистом runner для Pull Request и основной ветки:

1. checkout;
2. установка поддерживаемого Node.js;
3. `npm ci`;
4. проверка отсутствия tracked `.env.local` и других запрещённых env-файлов;
5. `npm run lint`;
6. `npm run test`;
7. `npm run build`;
8. проверка миграций и внутренних Markdown-ссылок после появления соответствующих инструментов.

Тесты CI используют только тестовые переменные и моки. Production secrets не передаются в workflows для PR из недоверенных веток. Workflow получает минимальные `permissions`, использует concurrency cancellation и закреплённые версии actions.

## Критерии приёмки

- workflow запускается на PR и push основной ветки;
- lint, test или build failure делает check красным;
- tracked `.env.local` гарантированно блокируется;
- сборка проходит без production-секретов;
- branch protection требует успешный check;
- cache не подменяет `npm ci` и не скрывает ошибку lockfile;
- логи workflow не содержат секретов.
