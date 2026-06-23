# AGENTS.md

Voice Sales Log — реальный MVP-продукт для малого бизнеса. Продавец отправляет голосовое сообщение в Telegram, система распознаёт товар, количество и цену, сохраняет продажу в Supabase, а владелец видит отчёт и корректирует спорные позиции в Telegram Mini App или browser fallback режиме.

## Обязательное чтение перед изменением кода

AI обязан прочитать по порядку:

1. `AGENTS.md`.
2. `README.md`.
3. `docs/overview/README.md`.
4. `docs/specs/global.md`.
5. `docs/architecture/architecture.md`.
6. Все файлы из `docs/plans/active/`.
7. `docs/rules/README.md`.
8. `codex/skills/voice-sales-log/SKILL.md`.

Затем нужно прочитать профильные product/technical/data specs и последний релевантный завершённый план. Каноническая карта находится в `docs/INDEX.md`.

## Неподвижные границы

- Не добавлять CRM, склад, кассу, оплаты и клиентскую базу.
- Не ломать Telegram bot, webhook, STT, LLM parser, Supabase и mobile UI.
- `shop_id` нельзя принимать от клиента. Он определяется только на сервере: по валидному Telegram initData либо через server-side fallback env.
- `SUPABASE_SERVICE_ROLE_KEY` используется только сервером и никогда не передаётся клиенту.
- Unknown seller не сохраняется в случайный магазин при `DEMO_MODE=false`.
- Новая voice-продажа сразу становится `processed`, если у каждой позиции есть осмысленный товар, количество больше 0, цена больше 0 и `confidence >= 0.80`.
- Проверка нужна только для неполных, низкоуверенных или странных распознаваний. В UI внутренние статусы показываются как «Готово», «Нужно проверить» и «Исключено».
- Отчёт учитывает только активные `processed` позиции с `deleted_at is null`.
- Исключение позиции выполняется только через soft delete.
- Кнопка отчёта в Telegram создаётся только как `web_app`, не как обычная URL-кнопка.
- Web App передаёт `Telegram.WebApp.initData` в `x-telegram-init-data`, а также `x-app-mode`.
- Передаётся raw `initData`, не `initDataUnsafe`. Клиент отдельно проверяет наличие `Telegram.WebApp`, непустого `initData` и `initDataUnsafe.user.id`.
- HMAC WebApp проверяется только через `TELEGRAM_BOT_TOKEN`; `TELEGRAM_WEBHOOK_SECRET` предназначен только для webhook header. В data-check-string исключается только `hash`, поле `signature` сохраняется.
- WebApp сначала ищет seller по Telegram user id. Active owner binding может создать seller только в том же `shop_id`; произвольный client shop запрещён.
- Отчёт сначала читает `sales` по server-derived `shop_id`, затем `sale_items` по этим sale IDs. Auth/DB ошибка не должна превращаться в нулевой отчёт или «Записей нет».
- Production-кнопка и route диагностики доступны только при `DEBUG_TELEGRAM_WEBAPP=true`.
- Browser fallback разрешён только при `ALLOW_WEBAPP_FALLBACK=true`; `DEFAULT_SHOP_ID` и `DEFAULT_SELLER_ID` читаются только на сервере из env.
- Корневой Web App URL не должен выполнять server redirect до инициализации Telegram SDK.
- Сбой Storage или невалидный LLM JSON не должен скрывать распознанную продажу: создаётся запись «Нужно проверить».
- Каждый voice request логирует именованные этапы и `voice_failed` с полем `stage`.
- Бот не имеет права отвечать «Запись сохранена», пока `sales` и ожидаемое количество `sale_items` не подтверждены read-back запросом после успешного RPC.

## Documentation Sync Rule

После каждого изменения кода AI обязан:

1. Обновить документацию по изменённым частям.
2. Обновить `CHANGELOG.md`.
3. Обновить активный/завершённый план.
4. Удалить или переписать устаревшие сведения.
5. В финальном ответе указать список изменённых документов.
6. Не писать «всё работает», если не запускал `lint`/`test`/`build`.
7. AI не имеет права завершать работу словами «всё работает», пока не покажет:
   - какие файлы изменены;
   - какие тесты запущены;
   - результат `lint`/`test`/`build`;
   - какие документы обновлены.

Если реализация и документация расходятся, задача не завершена.

## Инженерные правила

- Миграции сохраняют существующие данные и используют идемпотентные DDL-операции, где это возможно.
- Server actions повторно выполняют authorization; middleware или UI не являются границей доступа.
- Технические ошибки логируются на сервере, UI получает стабильное русскоязычное сообщение.
- Новая логика сопровождается regression tests.
- Перед коммитом просмотреть `git diff` и не включать секреты или несвязанные изменения.
