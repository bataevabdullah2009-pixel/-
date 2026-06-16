# Testing Spec

## Назначение тестов

Тесты проверяют базовую бизнес-логику, которая не должна ломаться при изменении UI или интеграций.

## Текущие тесты

| Файл | Что проверяет |
| --- | --- |
| `tests/bot.test.ts` | Date range и фильтрация по дате. |
| `tests/transcript.test.ts` | Zod-валидация, статус пустого transcript, processed cleaned_text. |
| `tests/records.test.ts` | Нормализация товаров и единиц, группировка товаров, needs_price, ручная правка, расчёт выручки. |

## Обязательные проверки

- Пустой transcript получает `needs_review`.
- Processed запись имеет `cleaned_text`.
- Date range корректно фильтрует записи.
- Одинаковые товары группируются.
- `хлеб 3 штуки` и `Хлеб 2 шт` попадают в одну строку отчёта.
- `Хлеб 4 штуки` нормализуется в `Хлеб`, `4`, `шт`.
- `Молоко 2 штуки` нормализуется в `Молоко`, `2`, `шт`.
- Позиции без цены не попадают в выручку.
- Позиции без цены получают `needs_price`.
- После ручного исправления позиция получает `processed`.
- Выручка считается как `quantity * price`.

## Команды

```bash
npm run lint
npm run test
npm run build
```

## Что добавить позже

- Интеграционный тест `records.service`.
- Mock Telegram voice flow.
- Mock STT response.
- Mock LLM parser response.
- Browser smoke test для `/daily-report`.
