# AGENTS.md

«Голосовой журнал продаж» — реальный MVP для малого бизнеса. Продавец отправляет голосовое сообщение в Telegram, бот распознаёт товар, количество и цену, сохраняет продажу в Supabase, а владелец видит мобильный отчёт, журнал записей и продавцов в Telegram Mini App или в явно включённом browser fallback.

## Обязательное чтение перед изменением кода

AI обязан читать по порядку:

1. `AGENTS.md`.
2. `README.md`.
3. `docs/overview/README.md`.
4. `docs/specs/global.md`.
5. `docs/architecture/architecture.md`.
6. Все файлы из `docs/plans/active/`.
7. `docs/rules/README.md`.
8. `codex/skills/voice-sales-log/SKILL.md`.

После этого нужно открыть профильные specs из `docs/INDEX.md` и последний релевантный завершённый план. Нельзя менять код на основании памяти, если в репозитории есть актуальный spec.

## Какие specs читать перед работой

- WebApp UI: `docs/specs/product/webapp-report.md`, `docs/specs/product/sale-item-editing.md`.
- Telegram confirm/cancel: `docs/specs/product/telegram-confirmation-flow.md`, `docs/specs/technical/telegram-webhook.md`.
- WebApp API и server actions: `docs/specs/technical/webapp-api.md`.
- База данных и миграции: `docs/specs/technical/database.md`, `docs/specs/data/status-lifecycle.md`.
- Telegram Mini App session: `docs/specs/technical/telegram-webapp-session.md`.
- Расчёт отчёта: `docs/specs/technical/report-calculation.md`.

Перед любым изменением кода читать `README.md`. Перед изменением БД обязательно обновлять database spec и migration. Перед изменением UI обновлять product specs. Перед изменением Telegram flow обновлять Telegram specs.

## Voice pipeline

- Не трогать STT, LLM parser, audio conversion, Storage upload и webhook без прямой задачи.
- Не ломать путь `Telegram voice -> STT -> LLM parser -> Supabase -> WebApp`.
- Storage failure или невалидный LLM JSON не скрывают распознанную продажу: создаётся запись для проверки.
- Каждый voice request логирует именованные этапы и `voice_failed` с полем `stage`.
- Бот не отвечает «Запись сохранена», пока `sales` и ожидаемое количество `sale_items` не прочитаны обратно после успешного RPC.
- Unknown seller не сохраняется в случайный магазин при `DEMO_MODE=false`.

## Статусы и подтверждение

- `processed` — подтверждённая запись или уверенное распознавание, входит в выручку.
- `needs_review` — запись распознана, но требует решения в Telegram, не входит в выручку.
- `cancelled` — пользователь отменил спорную voice-запись, не входит в выручку.
- `failed` — voice pipeline не смог завершить обработку.
- `sale_items.status = excluded` плюс `deleted_at` используется для soft delete позиции.
- Новая voice-продажа сразу становится `processed`, только если у каждой позиции есть осмысленный товар, `quantity > 0`, `price > 0`, `total > 0` и `confidence >= 0.80`.
- Сомнительная voice-запись получает Telegram inline-кнопки `✅ Подтвердить` и `❌ Отмена`.
- В сообщении сомнительной записи не добавлять кнопку «Открыть отчёт».
- Callback должен быть идемпотентным: повторное нажатие не ломает данные и не меняет уже принятое решение.
- WebApp не является местом подтверждения сомнительной voice-записи. Редактирование товара сохраняет поля, но review-запись входит в выручку только после Telegram `✅ Подтвердить`.

## WebApp

- Нижняя навигация: «Отчёт», «Записи», «Продавцы».
- Корневой WebApp URL не должен делать server redirect до инициализации Telegram SDK.
- WebApp передаёт raw `Telegram.WebApp.initData` в `x-telegram-init-data` и `x-app-mode`.
- Передаётся raw `initData`, не `initDataUnsafe`.
- Клиент отдельно проверяет наличие `Telegram.WebApp`, непустого `initData` и `initDataUnsafe.user.id`.
- Production diagnostics и кнопки диагностики доступны только при `DEBUG_TELEGRAM_WEBAPP=true`.
- Browser fallback разрешён только при `ALLOW_WEBAPP_FALLBACK=true`; `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` читаются только сервером из env.
- UI показывает внутренние статусы как «Готово», «Нужно проверить» и «Исключено».
- Карточка товара в обычном режиме показывает товар, количество, цену и сумму, справа — карандаш и корзину.
- Не возвращать постоянные большие кнопки «Подтвердить позицию» и текстовые ссылки «Исключить из отчёта» в активных карточках.
- Ошибка update/delete не очищает введённые данные и не маскируется как успех.

## Supabase и безопасность

- `shop_id` нельзя принимать от клиента. Он определяется сервером по валидному Telegram initData или через server-side fallback env.
- `SUPABASE_SERVICE_ROLE_KEY` используется только на сервере и никогда не передаётся клиенту.
- HMAC WebApp проверяется только через `TELEGRAM_BOT_TOKEN`.
- `TELEGRAM_WEBHOOK_SECRET` предназначен только для webhook header.
- В data-check-string Telegram исключается только `hash`; поле `signature` сохраняется.
- Сортировка data-check-string детерминированная по ключам, без locale-dependent comparator.
- WebApp сначала ищет seller по Telegram user id. Active owner binding может создать seller только в том же `shop_id`.
- Отчёт сначала читает `sales` по server-derived `shop_id`, затем `sale_items` по этим sale IDs.
- Auth/DB ошибка не превращается в нулевой отчёт или «Записей нет».
- Отчёт учитывает только активные `processed` позиции с `deleted_at is null`, валидной ценой и валидным количеством.
- Исключение позиции выполняется только через soft delete.
- Миграции сохраняют существующие данные и используют идемпотентные DDL-операции, где это возможно.

## Документация

После каждого изменения кода AI обязан:

1. Обновить документацию по изменённым частям.
2. Обновить `CHANGELOG.md`.
3. Обновить активный или завершённый план.
4. Удалить или переписать устаревшие сведения.
5. Обновить связанные `docs/specs`, `docs/features`, `docs/plans`, `docs/roadmap` и `codex/skills/voice-sales-log/SKILL.md`.
6. Не оставлять документы, которые противоречат коду или текущей схеме БД.
7. В финальном ответе указать список изменённых документов.

Главный документ `docs/specs/global.md` должен подробно описывать реальную систему: цель, роли, статусы, UX, бизнес-логику, API, БД, ошибки, edge cases, acceptance criteria и out of scope.

## Инженерные правила

- Не добавлять CRM, склад, кассу, оплаты и клиентскую базу.
- Не делать хаотичный рефакторинг, если точечное изменение решает задачу.
- Не переписывать рабочую логику без необходимости.
- Server actions повторно выполняют authorization; middleware или UI не являются границей доступа.
- Технические ошибки логируются на сервере, UI получает стабильное русскоязычное сообщение.
- Новая логика сопровождается regression tests.
- Перед финалом выполнить `npm run lint`, `npm run test`, `npm run build`; если есть отдельные команды, выполнить релевантные `web:*`.
- Не писать «всё работает» или «готово», если обязательные проверки не прошли.
- Перед коммитом просмотреть `git diff` и не включать секреты или несвязанные изменения.
