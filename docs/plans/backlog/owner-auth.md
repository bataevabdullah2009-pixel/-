# Авторизация владельца

## Цель

Закрыть Web App и server actions проверенной серверной сессией владельца.

## Результат

- проверка Telegram init data или выбранного production-механизма;
- сущность/связь owner → shop;
- отказ неавторизованному и просроченному запросу;
- actor в `audit_logs`;
- негативные интеграционные тесты.

Детали: `docs/specs/technical/auth-and-shop-isolation.md`.
