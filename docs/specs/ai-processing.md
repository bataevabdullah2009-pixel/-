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

Telegram voice перед STT должен быть подготовлен так:

- исходный Telegram файл считается `audio/ogg`;
- исходное имя файла имеет расширение `.ogg`;
- перед STT файл конвертируется в MP3 через ffmpeg;
- в multipart/form-data отправляется `file` с filename `voice.mp3`;
- MIME type для STT: `audio/mpeg`;
- model: `STT_MODEL` или `whisper-large-v3-turbo`.

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
| `quantity = null` или количество не распознано | `quantity = 1`, `status = needs_review`. |
| `product_name` пустой | `status = needs_review`. |
| Текст неясный | `needs_review = true`. |
| Confidence ниже 0.75 | `sale_items.status = needs_review`. |

## Normalization

После LLM-ответа система нормализует данные детерминированно:

- `product_name` обрезается по краям;
- поиск товара использует lower-case normalized key;
- `хлеб`, `Хлеб`, `хлеба` сопоставляются с `Хлеб`;
- `молоко`, `молока` сопоставляются с `Молоко`;
- `штука`, `штуки`, `штук`, `шт.` приводятся к `шт`;
- если unit не указан, используется `шт`.

## Запреты

- Не выдумывать цену.
- Не выдумывать товар.
- Не выдумывать количество, кроме правила `quantity = 1`.
- Не делать аналитику.
- Не присваивать категорию.
- Не создавать `processed`, если цена неизвестна.
