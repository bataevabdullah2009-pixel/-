# Changelog

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
