# Voice Processing

Pipeline: download Telegram file → audio preparation → STT → LLM parse → deterministic evidence check → Supabase sale → bot reply.

Правило готовности:

- product_name осмысленный;
- `quantity > 0`;
- `price > 0`;
- `confidence >= 0.80`.

Если все позиции готовы, sale и voice record становятся `processed`, а бот отвечает `✅ Запись сохранена: ...`. Если хотя бы одна позиция неполная или parser fallback сработал, sale получает `needs_review`, а бот просит проверить товары и цены.

Storage upload best-effort и не блокирует продажу. Невалидный LLM response создаёт fallback-позицию «Нужно проверить».
