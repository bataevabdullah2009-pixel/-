# Стратегия тестирования

Регрессионные тесты покрывают:

- правила parser evidence;
- exact multi-item fallback: `Сникерс, 3 штуки по 200 рублей. Буханка хлеба, 5 штук по 50 рублей.` -> 2 items, total 850;
- mixed valid + incomplete fallback: valid item confirms, incomplete item stays review;
- bare quantity `5 по 100` и bottle units;
- threshold `confidence >= 0.80`;
- отсутствие обязательного review для полных voice-продаж;
- фразы «Ники четыре штуки по сто рублей» и «Сникерс 5 штук по 100 рублей»;
- read-back sale + sale_items до success и отказ при нулевом item count;
- расчёт отчёта и soft delete;
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
- WebApp `/review` decision surface и cross-shop callback denial;
- restore, reset day, records search/filter и WebApp smoke-сценарии, где они указаны в матрице приёмки.

Перед финальным ответом запускаются:

```bash
npm run lint
npm run test
npm run build
npm run web:build
```

Для внешних интеграций используются отдельные smoke-уровни:

```bash
npm run smoke:voice
npm run smoke:webapp
npm run smoke:telegram
```

1. `smoke:voice` вызывает реальные STT и LLM endpoints на OGG fixture и затем запускает parser/stabilization regression tests; БД не изменяется.
2. `smoke:webapp` проверяет production auth с корректно подписанным initData, session cookie, четыре страницы, Next assets и Telegram SDK без вывода initData/token.
3. `smoke:telegram` read-only проверяет bot, webhook и реальную WebApp menu button.
4. `smoke:production` проверяет production schema, bucket, RPC, single/multi/mixed sale, confirm/cancel и полный fixture audio pipeline. Он запускается только с `PRODUCTION_SMOKE_CONFIRM=voice-sales-log` и очищает только созданные IDs/object.
5. Ни один синтетический smoke не заменяет ручную отправку Telegram voice и запуск Mini App на поддерживаемых Telegram clients.

Дополнительный P0-контроль использует фиксированный Telegram Mini App fixture с `signature`, `chat_instance`, `photo_url` и tamper-проверкой. Production smoke проверяет `POST /api/auth/telegram`, session cookie, seller/shop в Vercel logs и совпадение live Supabase counts с rendered report.

Ручной WebApp smoke 25 июня 2026 проверил update quantity, update price, reload persistence, soft delete, reload после delete и restore. После проверки исходные значения позиции восстановлены. 2 июля 2026 локальные tests покрыли короткий callback contract, confirm/cancel, cancelled report filtering, отсутствие третьей review-кнопки, parser split и WebApp `/review` route. 3 июля 2026 тесты обновлены под item-level revenue: active `processed` item внутри parent `needs_review` считается, incomplete sibling остаётся review. 3 июля 2026 Supabase RPC smoke создал временную продажу с двумя `sale_items` и суммой `850`, затем удалил созданные rows; cleanup check показал 0 оставшихся `sales`, `sale_items`, `voice_records`. 16 июля 2026 production smoke после восстановления Supabase проверил реальный OGG -> Storage -> STT -> parser -> RPC с двумя позициями `500 + 600 = 1100`, schema/bucket, mixed review, confirm/cancel, WebApp session/pages/assets и Telegram webhook/menu; шесть временных наборов и audio object удалены. Реальное пользовательское нажатие в Telegram Android/Desktop и отправка голоса в этот запуск не входили.

Если команда не запускалась или упала, это указывается явно.
