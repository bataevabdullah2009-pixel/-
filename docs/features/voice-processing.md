# Voice Processing

Voice processing превращает Telegram voice message в структурированные `sale_items`. Основная цель - не потерять продажу и не включить сомнительные позиции в выручку без проверки.

## Pipeline

```text
Telegram voice
  -> seller resolution
  -> Telegram file download
  -> audio preparation
  -> best-effort audio upload
  -> Russian STT
  -> transcript cleanup
  -> LLM sale parser
  -> deterministic evidence check
  -> fallback item split
  -> Supabase RPC save_voice_sale
  -> read-back verification
  -> Telegram reply
```

## Seller resolution

1. Bot получает Telegram user id из `ctx.from.id`.
2. `requireSeller()` ищет active seller по `telegram_id`.
3. Если seller inactive, voice не сохраняется.
4. Если seller отсутствует и demo mode выключен, пользователь получает сообщение о непривязанном Telegram.
5. Если demo mode включён, seller может быть создан в default shop.
6. Все последующие записи получают `seller.id` и `seller.shopId` с сервера.

## Audio handling

1. Bot скачивает Telegram audio по file link.
2. `prepareTelegramVoiceForStt()` пытается конвертировать OGG в MP3 через `ffmpeg-static`.
3. Если ffmpeg недоступен, STT получает исходный OGG.
4. Если конвертация падает, STT получает исходный OGG.
5. Диагностика conversion логируется без секретов.
6. Upload original voice в Supabase Storage выполняется best-effort.
7. Ошибка upload не блокирует продажу.
8. Records journal использует signed URL, если `audio_path` сохранён.

## STT and cleanup

1. STT вызывается с подготовленным audio file.
2. Raw transcript сохраняется в `voice_records.raw_text`.
3. Raw transcript пишется в audit log best-effort.
4. Cleanup LLM исправляет регистр и пунктуацию.
5. Cleanup не должен добавлять товар, цену или количество.
6. Если cleanup request падает, используется simple cleanup.
7. Empty STT transcript переводится в review fallback.

## Parser

LLM parser должен вернуть JSON по схеме:

```json
{
  "items": [
    {
      "product_name": "string",
      "quantity": 1,
      "unit": "шт",
      "price": 100,
      "total": 100,
      "confidence": 0.95
    }
  ],
  "raw_text": "string",
  "cleaned_text": "string",
  "needs_review": false
}
```

Parser rules:

1. Не выдумывать товар.
2. Не выдумывать количество.
3. Не выдумывать цену.
4. Не включать количество/цену в `product_name`.
5. Сохранять порядок товаров.
6. Ставить low confidence при неоднозначности.
7. Возвращать `needs_review=true`, если данные неполные.

## Deterministic evidence layer

`enforceTranscriptEvidence()` проверяет LLM output against transcript.

Поддерживается:

1. Цифры.
2. Числа словами.
3. Decimal comma.
4. `шт`, `штука`, `штуки`, `штук`.
5. `кг`, `килограмм`, `килограмма`, `килограммов`.
6. `г`, `гр`, `грамм`, `грамма`, `граммов`.
7. `бутылка`, `бутылки`, `бутылок` как `шт`.
8. Price with `руб`, `рублей`, `₽`.
9. Bare price phrase `по 100`.
10. Bare quantity before price: `5 по 100`.

Fallback разделяет:

```text
Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.
```

на две позиции:

1. `Сникерс`, `3`, `шт`, `200`, `600`.
2. `Буханка хлеба`, `5`, `шт`, `50`, `250`.

Неполный хвост вроде `Корзина продуктов` сохраняется отдельной review-позицией и не блокирует валидные items.

## Readiness rule

Item получает `processed`, если выполнены условия:

1. `product_name` осмысленный.
2. `quantity > 0` или распознан вес.
3. `price > 0` или есть `total`, из которого можно вывести unit price.
4. `total` валиден.
5. `confidence >= 0.80`.

Item получает `needs_review`, если:

1. Нет осмысленного товара.
2. Нет количества или веса.
3. Нет цены и total.
4. Confidence ниже порога.
5. Parser fallback не смог подтвердить evidence.
6. Текст похож на общий контейнер без товара.

## Units and totals

1. `шт` считается как `quantity * price`.
2. `кг` считается как `quantity * price`.
3. `г` считается как `(quantity / 1000) * price`.
4. `бутылки` нормализуются в `шт`.
5. `price` хранит unit price.
6. `total` хранит итог item row.
7. Unit price может быть восстановлен из `total / quantity` при confirm.

## Persistence

`saveVoiceSale()`:

1. Обеспечивает хотя бы одну reviewable item row.
2. Нормализует каждую item.
3. Ищет optional product catalog match.
4. Вычисляет item status.
5. Вычисляет sale status.
6. Вычисляет sale total по processed items.
7. Вызывает RPC `save_voice_sale`.
8. Проверяет returned ids.
9. Читает sale обратно.
10. Читает item count обратно.
11. Сравнивает count с payload length.
12. Пишет audit logs best-effort.

Если read-back не совпал, bot не отправляет success.

## Telegram replies

Уверенная запись:

```text
✅ Запись сохранена: ...
```

Сомнительная запись:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: ...
```

Review keyboard:

1. `✅ Подтвердить`.
2. `❌ Отмена`.

В review-message нет `Открыть отчёт`.

## Failure handling

Stages:

1. `seller_resolve`.
2. `telegram_download`.
3. `audio_prepare`.
4. `stt`.
5. `llm`.
6. `supabase_insert`.
7. `telegram_reply`.

Если failure случился до persisted sale и seller известен, bot пытается сохранить `voice_records.status = failed` с diagnostic `error_message`.

## Acceptance criteria

1. Полная фраза сохраняется как processed.
2. Multi-item фраза создаёт несколько `sale_items`.
3. Неполный хвост создаёт review row.
4. Invalid LLM JSON не теряет продажу.
5. Audio upload failure не блокирует sale.
6. Supabase false success невозможен из-за read-back verification.
7. Review message содержит только две кнопки.
8. `cancelled` и `failed` не попадают в report.
9. Active processed item в parent `needs_review` sale может входить в revenue.
