# Changelog

## 2026-06-22 — Telegram initData и обязательное подтверждение продаж

### Fixed

- Удалён server redirect `/ → /daily-report`, который выполнялся до Telegram SDK и мог терять WebApp launch-параметры.
- `/start` теперь отправляет новые reply и inline `web_app` buttons, задаёт `MenuButtonWebApp` и даёт безопасную кнопку `/debug-telegram`; после voice бот снова отправляет inline Web App button.
- Telegram bootstrap выполняется только после client render, ждёт SDK до 10 секунд и вызывает `ready()`/`expand()` до проверки initData.
- Добавлены безопасные WebApp diagnostics и server logs без initData payload и токенов.
- Auth различает `TELEGRAM_INIT_DATA_MISSING`, `TELEGRAM_INIT_DATA_INVALID`, `SELLER_NOT_LINKED`, `SELLER_INACTIVE` и `SHOP_NOT_FOUND`; `shop_id` остаётся server-derived.
- Бот больше не показывает raw `processed`/`needs_review`/`pending`/`failed`.

### Review workflow

- Каждая новая voice-продажа сохраняется в «Нужно проверить» и не входит в выручку автоматически.
- Сохранение товара, количества и цены оставляет позицию в review state; отдельное подтверждение переводит её в UI-состояние «Подтверждено».
- После подтверждения всех активных позиций связанные sale/voice record становятся подтверждёнными, а выручка пересчитывается.
- Исключение и reset продолжают использовать существующий soft delete `deleted_at`; новая migration не потребовалась.

### Documentation

- Актуализированы README, AGENTS, overview, architecture, product/technical/data specs, features, rules, plans, roadmap и repository skill.
- Удалены конкретные устаревшие deployment URL; учебных/кураторских формулировок и старых local tunnel URL не осталось.

### Validation

- `npm run lint`: без ошибок.
- `npm run test`: 61 тест, 8 файлов.
- `npm run build`: успешно; route `/debug-telegram` включён в production build.
- Локальный HTTP smoke: `/` возвращает `200` без redirect, `/debug-telegram` возвращает `200`.
- Штатные browser automation runtimes в текущем окружении недоступны; реальный mobile Telegram E2E остаётся release gate.

## 2026-06-21 — Production Web App URL guard

### Fixed

- Production и Preview `NEXT_PUBLIC_APP_URL` обновлены на канонический production alias через Vercel CLI.
- Общая URL-валидация запрещает пустой URL, HTTP, localhost, ngrok, Vercel deployment preview и git-branch alias.
- Bot env, `telegram:set-webhook` и `telegram:webhook-info` используют одну и ту же проверку публичного URL.
- `telegram:webhook-info` сравнивает текущий Telegram webhook с ожидаемым URL и возвращает ненулевой exit code при расхождении.

### Validation

- `npm run test`: 57 tests, 8 files.
- `npm run lint`: без ошибок.
- `npm run build`: успешно.
- Webhook на каноническом production origin: pending `0`, last error `null`, allowed updates `message`, config match `true`.
- Mobile Telegram E2E остаётся внешним release gate; его результат не подменён локальной проверкой.

## 2026-06-20 — Telegram Mini App initData hotfix

### Fixed

- Все inline и нижняя menu button «Открыть отчёт» используют Telegram `web_app` и один HTTPS `NEXT_PUBLIC_APP_URL`.
- Telegram SDK загружается до hydration; bootstrap ждёт WebApp object и вызывает `ready()`/`expand()`.
- Добавлен общий browser `apiFetch` с обязательным `x-telegram-init-data` и безопасные dev diagnostics.
- Auth API возвращает точные коды `TELEGRAM_INIT_DATA_MISSING`, `TELEGRAM_INIT_DATA_INVALID`, `SELLER_NOT_LINKED`, `SHOP_NOT_FOUND`.
- Owner/seller lookup запрещает inactive seller, проверяет существование shop и никогда не принимает client `shop_id`.
- `telegram:webhook-info` показывает URL, pending updates, last error и allowed updates; setWebhook поддерживает `PUBLIC_WEBHOOK_URL` и требует HTTPS.

### Validation

- `npm run test`: 55 тестов, 8 файлов.
- `npm run lint`: без ошибок.
- `npm run build`: успешно.
- Local production smoke: SDK загружен, `ready()`/`expand()` вызваны; missing/invalid initData дают ожидаемые `401`; подписанный initData active seller даёт `200`, cookie и отчёт без auth error.
- Production webhook на каноническом origin: pending `0`, last error `null`, allowed updates `message`.
- Mobile Telegram E2E ожидает production deploy и остаётся release gate.

## 2026-06-20 — Telegram/Web App and voice regression hotfix

### Fixed

- Восстановлена Telegram `web_app`-кнопка «Открыть отчёт»; обычная URL-кнопка не используется.
- Frontend вызывает `Telegram.WebApp.ready()`, отправляет initData в `x-telegram-init-data` и не показывает преждевременную красную ошибку до завершения bootstrap.
- `/api/auth/telegram` валидирует header, возвращает различимые ответы для отсутствующей Telegram-привязки и ошибки конфигурации, а `shop_id` получает только из БД.
- Добавлена совместимость с существующей активной seller-привязкой на время rollout таблицы `owners`, без ослабления shop isolation.
- Voice pipeline получил поэтапные события от `voice_received` до `voice_processed` и `voice_failed` с точным `stage`.
- Сбой Storage больше не блокирует STT/LLM/сохранение; невалидный или недоступный LLM переводит распознанный текст в ручную проверку.
- Пустой parser result создаёт видимый `needs_review` item, а не продажу без позиций.
- При отсутствующем в production RPC `save_voice_sale` используется совместимый server-side insert с компенсирующей очисткой; после применения migration используется RPC.
- Post-commit audit logging больше не превращает уже сохранённую продажу в ложную ошибку для пользователя.
- `needs_review` и `needs_price` вынесены в отдельный блок «Нужно проверить».

### Validation

- Добавлены regression tests для Web App button/header, Telegram initData, seller/shop isolation, parser fallback, отчёта и item mutations.
- `npm run test`: 45 тестов.
- `npm run lint`: без ошибок.
- `npm run build`: успешно.

## 2026-06-20 — Sales flow stabilization

### Fixed

- Исправлена schema `sale_items`: soft delete, `updated_at`, статус `excluded` и совместимость старых строк.
- Голосовая продажа теперь сохраняет `voice_records`, `sales` и `sale_items` одной транзакционной PostgreSQL-функцией.
- Неизвестный или неактивный Telegram seller больше не создаёт production-продажу в случайном магазине.
- Исправлено сохранение вручную изменённых товаров с пересчётом `total`, `confidence`, status и `updated_at`.
- Исправлено исключение товара: применяется soft delete без физического удаления.
- Исправлены owner authorization, shop isolation и report calculation.
- `getReport`, `getRecords`, `getReviewItems`, `getSellers`, update, exclude, restore и reset ограничены магазином владельца.
- Технические ошибки заменены безопасными сообщениями интерфейса.
- Parser guard переводит шум, отсутствующее количество и низкую уверенность в `needs_review`, отсутствие цены — в `needs_price`.

### Documentation

- Удалены устаревшие и дублирующие планы, stories, architecture notes и разрозненные specs.
- Документация собрана в каноническую структуру продукта, technical/data specs, features, rules, plan и roadmap.
- `AGENTS.md` усилен обязательным правилом Documentation sync is mandatory.
- README описывает продукт, роли, pipeline, env, migrations, Vercel, webhook и `DEMO_MODE`.
- Проект позиционируется как production-oriented MVP для магазина.

### Validation

- Добавлены regression tests для shop id, report filters, manual update, soft delete, seller access, Telegram initData и demo behavior.
- Обязательные release-команды: `npm run test` и `npm run build`.

## Earlier milestones

- Реализованы Telegram bot, voice download/conversion, STT и LLM parsing.
- Добавлены Supabase schema/storage, Telegram webhook и mobile Web App.
- Добавлены отчёт, журнал, ручное исправление и исключение позиций.
