# Voice Processing

Pipeline: download Telegram file → audio preparation → Russian STT → LLM parse → deterministic evidence check/fallback split → transactional `save_voice_sale` → read-back verification → bot reply.

Правило готовности:

- product_name осмысленный;
- `quantity > 0` или распознан вес;
- `price > 0` или есть `total`, из которого можно вывести unit price;
- `confidence >= 0.80`.

Если все позиции готовы, sale и voice record становятся `processed`, а бот отвечает `✅ Запись сохранена: ...`. Общий parser-level `needs_review` не переопределяет полные уверенные items.

Если хотя бы одна позиция неполная, низкоуверенная или parser fallback сработал, sale получает `needs_review`, а бот просит подтвердить товары и цены. Под сообщением есть только `✅ Подтвердить` и `❌ Отмена`.

Parser поддерживает `шт`, `кг`, `г` и нормализует `бутылка/бутылки/бутылок` в `шт`; для `г` total считается как доля килограмма от цены за кг. Fallback разделяет `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.` на две `sale_items`, а неполные хвосты вроде `Корзина продуктов` сохраняет отдельной review-позицией. Confirm переводит sale/voice и валидные active items в `processed`; неполные active items mixed-корзины остаются `needs_review`. Cancel переводит sale/voice в `cancelled` и soft-delete active items.

Success разрешён только после проверки, что sale существует в ожидаемом `shop_id`/`seller_id`, а число вставленных `sale_items` совпадает с числом подготовленных items. Ошибка Supabase возвращает пользователю только сообщение о невозможности сохранить.

Storage upload best-effort и не блокирует продажу. Невалидный LLM response создаёт fallback-позицию «Нужно проверить».
