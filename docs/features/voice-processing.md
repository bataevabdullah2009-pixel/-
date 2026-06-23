# Voice Processing

Pipeline: download Telegram file → audio preparation → Russian STT → LLM parse → deterministic evidence check → transactional `save_voice_sale` → read-back verification → bot reply.

Правило готовности:

- product_name осмысленный;
- `quantity > 0`;
- `price > 0`;
- `confidence >= 0.80`.

Если все позиции готовы, sale и voice record становятся `processed`, а бот отвечает `✅ Запись сохранена: ...`. Общий parser-level `needs_review` не переопределяет полные уверенные items. Если хотя бы одна позиция неполная, низкоуверенная или parser fallback сработал, sale получает `needs_review`, а бот просит проверить товары и цены.

Success разрешён только после проверки, что sale существует в ожидаемом `shop_id`/`seller_id`, а число вставленных `sale_items` совпадает с числом подготовленных items. Ошибка Supabase возвращает пользователю только сообщение о невозможности сохранить.

Storage upload best-effort и не блокирует продажу. Невалидный LLM response создаёт fallback-позицию «Нужно проверить».
