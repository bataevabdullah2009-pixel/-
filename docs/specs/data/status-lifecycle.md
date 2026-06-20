# Жизненный цикл статусов

- `processed`: осмысленный товар, известное количество и цена, рассчитан total, confidence не ниже 0.75.
- `needs_price`: товар и количество известны, цена отсутствует.
- `needs_review`: низкая уверенность, отсутствующее количество, неинформативное имя, пустой/невалидный LLM result либо неоднозначный transcript.
- `failed`: pipeline завершился до возможности сохранить редактируемую позицию.
- `excluded`: позиция исключена владельцем или reset дня.

Если STT дал текст, но LLM недоступен или вернул невалидный JSON, создаётся fallback-позиция `needs_review` с `quantity = 1`, `price = null`, `total = null`, `confidence = 0`. Она видна владельцу и не входит в выручку.

Ручное сохранение устанавливает `processed`, `confidence = 1`, `total = quantity × price`, `updated_at = now()`. Исключение устанавливает `excluded`, `deleted_at = now()`, `deleted_reason = excluded_by_owner`, `updated_at = now()` и сохраняет предыдущий status для восстановления.
