# AI Processing Spec

## Назначение

AI pipeline состоит из двух разных задач:

1. STT превращает аудио в raw text.
2. LLM очищает текст и извлекает позиции продажи.

## STT

STT API должен быть Whisper-compatible.

Вход:

- audio file;
- model name, если требуется API;
- API key из env.

Выход:

- строка raw transcript.

Если transcript пустой:

- запись получает `needs_review`;
- sale item не должен создаваться из воздуха.

## Cleanup

Cleanup service может:

- исправить регистр;
- добавить пунктуацию;
- сделать текст читаемым.

Cleanup service не может:

- добавлять товары;
- добавлять цены;
- добавлять количество;
- добавлять категории;
- менять смысл.

## Parser

Parser service возвращает только JSON:

```json
{
  "items": [],
  "raw_text": "",
  "cleaned_text": "",
  "needs_review": true
}
```

## Confidence rules

| Условие | Решение |
| --- | --- |
| Цена названа | Использовать названную цену. |
| Цена не названа | Искать в `products.default_price`. |
| Цена не найдена | `status = needs_price`. |
| Количество не названо | `quantity = 1`, confidence ниже. |
| Текст неясный | `needs_review = true`. |
| Confidence ниже 0.75 | `sale_items.status = needs_review`. |

## Запреты

- Не выдумывать цену.
- Не выдумывать товар.
- Не выдумывать количество, кроме правила `quantity = 1`.
- Не делать аналитику.
- Не присваивать категорию.
- Не создавать `processed`, если цена неизвестна.
