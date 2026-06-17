# Workplan

Этот файл является главным рабочим планом проекта. Детальные планы вынесены отдельно:

- [Active Plan](./active.md) - что делать дальше.
- [Completed Plan](./completed.md) - что уже сделано.
- [Backlog](./backlog.md) - идеи после MVP.
- [Release Plan](./release-plan.md) - путь к версии 1.0.
- [Risks](./risks.md) - риски и контроль качества.

## Статус проекта

| Блок | Статус | Комментарий |
| --- | --- | --- |
| Документация | Готово | Добавлены specs, rules, stories, roadmap, architecture, features. |
| База данных | Готово | Есть Supabase migration и seed. |
| Telegram-бот | MVP готов | Нужны реальные ключи для live-проверки. |
| Vercel webhook | Код готов | Нужен deploy, env в Vercel и `npm run telegram:set-webhook`. |
| AI pipeline | MVP готов | Есть STT, cleanup, parser и fallback-статусы. |
| Веб-панель | Mobile-ready | Есть адаптивные отчётные карточки, sticky summary, loading/empty states и нижняя навигация. |
| Отчёты | MVP стабилизирован | Есть группировка по `product_id`/normalized name, нормализация unit и блок проверки. |
| Тесты | Готово | 25 тестов проходят, включая нормализацию, confidence rules и ручное исправление. |
| Codex skills | Готово | Добавлен `codex-skills/voice-sales-log`. |
| Production auth | Не входит в MVP | После сдачи можно добавить роли owner/seller. |

## Этап 1 - Подготовка проекта

- [x] Создать структуру папок.
- [x] Настроить TypeScript.
- [x] Настроить npm workspaces.
- [x] Добавить `.env.example`.
- [x] Добавить локальный `.env.local`.
- [x] Добавить README.md.
- [x] Добавить AGENTS.md.
- [x] Добавить CHANGELOG.md.
- [x] Добавить docs index и карту документации.
- [x] Разложить root docs markdown по тематическим папкам.
- [x] Добавить Codex skill из проектной документации.

## Этап 2 - Документация

- [x] Добавить global spec.
- [x] Добавить product spec.
- [x] Добавить bot spec.
- [x] Добавить AI processing spec.
- [x] Добавить data spec.
- [x] Добавить reports spec.
- [x] Добавить web dashboard spec.
- [x] Добавить testing spec.
- [x] Добавить acceptance spec.
- [x] Добавить rules index.
- [x] Добавить feature catalog.
- [x] Добавить user stories по ролям.
- [x] Добавить active/completed/backlog plans.

## Этап 3 - База данных

- [x] Создать Supabase migration.
- [x] Создать таблицу `shops`.
- [x] Создать таблицу `sellers`.
- [x] Создать таблицу `products`.
- [x] Создать таблицу `voice_records`.
- [x] Создать таблицу `sales`.
- [x] Создать таблицу `sale_items`.
- [x] Создать таблицу `audit_logs`.
- [x] Добавить индексы по `created_at`.
- [x] Добавить индексы по `seller_id`.
- [x] Добавить RLS policies.
- [x] Добавить seed-данные.

## Этап 4 - Telegram-бот

- [x] Подключить Telegram Bot API.
- [x] Добавить команду `/start`.
- [x] Принимать voice messages.
- [x] Отвечать “Голосовое получено, обрабатываю.”
- [x] Скачивать аудио из Telegram.
- [x] Сохранять аудио в Supabase Storage.
- [x] Передавать аудио в STT.
- [x] Получать raw transcript.
- [x] Очищать текст через LLM.
- [x] Извлекать товарные позиции через LLM.
- [x] Сохранять `voice_records`.
- [x] Сохранять `sales`.
- [x] Сохранять `sale_items`.
- [x] Отправлять подтверждение продавцу.
- [x] Сохранять ошибки в `audit_logs`.
- [x] Конвертировать Telegram OGG/Opus voice в MP3 перед STT.
- [x] Отправлять STT файл с filename `voice.mp3` и MIME `audio/mpeg`.
- [x] На Vercel fallback-ить на исходный `voice.ogg`, если `ffmpeg-static` недоступен или конвертация упала.
- [x] Логировать file id, размер файла, STT filename, STT MIME и error response.
- [x] Вынести общий `processTelegramUpdate(update)`.
- [x] Оставить polling только для локального `npm run bot:dev`.
- [x] Добавить Vercel webhook route `/api/telegram/webhook`.
- [x] Проверять Telegram webhook `secret_token`.
- [x] Добавить scripts для `setWebhook` и `getWebhookInfo`.

## Этап 5 - Веб-панель

- [x] Создать Next.js App Router приложение.
- [x] Создать главную переадресацию на `/daily-report`.
- [x] Создать страницу `/records`.
- [x] Создать страницу `/sellers`.
- [x] Создать страницу `/daily-report`.
- [x] Добавить фильтр “Сегодня”.
- [x] Добавить фильтр “Вчера”.
- [x] Добавить фильтр “Неделя”.
- [x] Добавить фильтр “Месяц”.
- [x] Добавить фильтр “Год”.
- [x] Добавить ручной выбор даты.
- [x] Добавить поиск по тексту.
- [x] Добавить фильтр по продавцу.
- [x] Добавить карточку записи.
- [x] Добавить пустое состояние.
- [x] Адаптировать отчёт и записи под Telegram Mini App.
- [x] Добавить sticky summary и ручное обновление отчёта.
- [x] Добавить нижнюю навигацию на mobile.
- [x] Добавить loading states и мобильные карточки продаж.

## Этап 6 - Отчёты

- [x] Добавить расчёт total для позиции.
- [x] Добавить дневной отчёт.
- [x] Добавить недельный отчёт.
- [x] Добавить месячный отчёт.
- [x] Добавить годовой отчёт.
- [x] Добавить группировку одинаковых товаров.
- [x] Добавить итоговую строку.
- [x] Добавить блок “Нужно проверить”.
- [x] Исключать позиции без цены из выручки.
- [x] Добавить ручное исправление позиции.
- [x] Нормализовать названия товаров для отчёта и поиска.
- [x] Нормализовать единицы `штука`/`штуки`/`штук`/`шт.` в `шт`.
- [x] Группировать отчёт по `product_id`, затем по normalized product name.

## Этап 7 - Стабильность

- [x] Добавить Zod-схемы.
- [x] Добавить shared utilities.
- [x] Добавить обработку ошибок.
- [x] Добавить unit-тесты.
- [x] Добавить тесты нормализации, `needs_price` и ручного исправления.
- [x] Проверить `npm run lint`.
- [x] Проверить `npm run test`.
- [x] Проверить `npm run build`.
- [x] Проверить `npm run bot:dev`.

## Активные задачи

См. [Active Plan](./active.md).

## Завершённые задачи

См. [Completed Plan](./completed.md).
