# Testing Strategy

Regression tests покрывают:

- parser evidence rules;
- exact multi-item fallback: `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.` -> 2 items, total 850;
- mixed valid + incomplete fallback: valid item confirms, incomplete item stays review;
- bare quantity `5 по 100` and bottle units;
- threshold `confidence >= 0.80`;
- отсутствие обязательного review для полных voice-продаж;
- фразы «Ники четыре штуки по сто рублей» и «Сникерс 5 штук по 100 рублей»;
- read-back sale + sale_items до success и отказ при нулевом item count;
- report calculation и soft delete;
- review отдельно от active revenue;
- Telegram review keyboard из `✅ Подтвердить` и `❌ Отмена`;
- короткие callback data `confirm:<id>` / `cancel:<id>`;
- confirm callback переводит sale/voice/items в processed и добавляет revenue;
- cancel callback переводит sale/voice в cancelled и soft-delete items;
- повторные callback идемпотентны;
- единый seller shop для bot и WebApp;
- московские границы даты;
- ручное сохранение processed patch;
- ручное сохранение `Буханка хлеба`, quantity `5`, price `50` -> total `250`, item `processed`, confirm succeeds;
- сохранение `product_name`, `quantity`, `price` и пересчёт `total`;
- пересчёт отчёта после update и delete;
- отсутствие excluded/deleted items в active UI;
- sale без активных items;
- очистку transient mutation notice из period links;
- Telegram initData validation;
- актуальное initData с полем `signature`;
- invalid hash → 401 mapping, expired auth date и missing bot token reasons;
- `apiFetch` в Telegram и fallback modes;
- Telegram user → seller → shop и seller creation из owner binding;
- report sale_items только из sales того же shop;
- ненулевой report при существующих sales/sale_items;
- отсутствие debug button без `DEBUG_TELEGRAM_WEBAPP`;
- отсутствие client `shop_id`;
- Web App buttons;
- bot reply без internal enum;
- WebApp `/review` decision surface и cross-shop callback denial.

Перед финальным ответом запускаются:

```bash
npm run lint
npm run test
npm run build
```

Дополнительный P0-контроль использует фиксированный Telegram Mini App fixture с `signature`, `chat_instance`, `photo_url` и tamper-проверкой. Production smoke проверяет `POST /api/auth/telegram`, session cookie, seller/shop в Vercel logs и совпадение live Supabase counts с rendered report.

Ручной WebApp smoke 25 июня 2026 проверил update quantity, update price, reload persistence, soft delete, reload после delete и restore. После проверки исходные значения позиции восстановлены. 2 июля 2026 локальные tests покрыли короткий callback contract, confirm/cancel, cancelled report filtering, `needs_review` parent sale filtering, отсутствие третьей review-кнопки, parser split и WebApp `/review` route. 3 июля 2026 Supabase RPC smoke создал временную продажу с двумя `sale_items` и суммой `850`, затем удалил созданные rows; cleanup check показал 0 оставшихся `sales`, `sale_items`, `voice_records`.

Если команда не запускалась или упала, это указывается явно.
