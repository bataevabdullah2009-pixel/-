# Changelog

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
- Production webhook: `https://web-n3ji.vercel.app/api/telegram/webhook`, pending `0`, last error `null`, allowed updates `message`.
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
