# 015 - Parser sale_items confirm revenue

Дата: 2026-07-03

## Цель

Исправить pipeline `voice transcript -> parser -> sale_items -> confirm -> revenue`, где multi-item фраза сохранялась одной неполной строкой.

## Причина

Deterministic fallback делил текст по запятой слишком рано. Фраза `Сникерс, 3 штуки по 200 рублей` превращалась в отдельные сегменты `Сникерс` и `3 штуки по 200 рублей`, из-за чего complete item не создавался. Когда LLM возвращал один длинный item, persistence получал одну позицию с полным текстом, `quantity = 1`, `price = null`, `total = null`.

## Сделано

- Fallback parser теперь ищет complete quantity/price evidence по всей фразе и не ломает запятую между названием и количеством.
- `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.` даёт две `sale_items` и total `850`.
- Поддержаны `Сникерс 5 по 100`, `Пицца 1 штука 500 рублей`, `Кола 2 бутылки по 150 рублей`, `Хлеб 3 штуки по 50, шоколад 2 штуки по 100`.
- Неполные фрагменты вроде `Корзина продуктов` сохраняются отдельными `needs_review` rows.
- Invalid LLM JSON/parser fallback тоже использует deterministic item extraction.
- Confirm logs now include sale id, found count, valid count and invalid reasons.
- Successful confirm message: `✅ Подтверждено: N позиций, сумма X ₽`.
- Superseded 2026-07-03: WebApp manual save persists item fields, recalculates `total`, sets item `processed`, and that item can enter revenue while parent `needs_review` remains for incomplete siblings.

## Проверка

- `npm.cmd run test`: 8 files, 109 tests.
- `npm.cmd run lint`.
- `npm.cmd run build`.
- `npm.cmd run web:build`.
- Read-only Supabase query showed existing pre-fix glued rows in recent sales.
- Supabase RPC smoke inserted a temporary sale with two rows:
  - `Сникерс`, `3 шт`, `200`, `600`;
  - `Буханка хлеба`, `5 шт`, `50`, `250`.
- Smoke sale total was `850`; created `sales`, `sale_items`, `voice_records` were deleted afterward and cleanup check returned zero rows.

## Backlog

- Production Telegram voice smoke after deploy.
- Optional repair/reparse tool for historical glued rows already present in Supabase.
