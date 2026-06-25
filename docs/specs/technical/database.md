# База данных

Статус: реализовано; новая миграция для текущего изменения не требуется.

## Цель

Описать фактическую схему данных, используемую голосовым сохранением и WebApp, без вымышленных колонок.

## Пользовательские сценарии

- Сохранение распознанной продажи.
- Чтение отчёта по магазину и периоду.
- Редактирование отдельной позиции.
- Исключение и восстановление позиции.
- Сохранение продажи с нулём активных позиций после soft delete.

## Роли

- `service_role` — серверные чтения и мутации bot/WebApp.
- `anon`/`authenticated` — не получают прямой доступ к бизнес-таблицам после hardening migration.
- Пользовательская авторизация и изоляция магазина выполняются прикладным сервером до service-role запроса.

## Таблицы

### `sales`

Ключевые поля: `id`, `shop_id`, `seller_id`, `voice_record_id`, `raw_text`, `cleaned_text`, `total_amount`, `status`, `created_at`.

### `sale_items`

| Поле | Назначение |
| --- | --- |
| `id` | UUID позиции |
| `sale_id` | ссылка на `sales.id` |
| `product_id` | необязательная ссылка на каталог |
| `product_name` | отображаемое название |
| `quantity` | положительное количество |
| `unit` | единица, по умолчанию `шт` |
| `price` | цена за единицу |
| `total` | сумма позиции |
| `confidence` | уверенность распознавания/подтверждения |
| `status` | `processed`, review-статусы или `excluded` |
| `deleted_at` | timestamp soft delete |
| `deleted_reason` | причина исключения |
| `deleted_previous_status` | статус для восстановления |
| `created_at` | время создания |
| `updated_at` | время последней мутации |

В проекте нет колонок `name`, `unit_price` или `total_price` в `sale_items`. Код использует `product_name`, `price`, `total`.

## Серверная логика

- Voice persistence остаётся в `save_voice_sale`.
- WebApp update выполняется server-side через Supabase client с service role.
- `sales.total_amount` пересчитывается по активным `processed` items.
- При отсутствии активных items `sales` сохраняется, `total_amount = 0`, статус становится `needs_review` по текущей модели.

## Soft delete

Удаление товара:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
deleted_previous_status = <previous status>
updated_at = now()
```

Физический `DELETE` не используется.

## Ошибки и edge cases

- Несуществующая колонка должна выявляться build/live schema check до релиза.
- `UPDATE` считается успешным только после возврата изменённой строки.
- Строка с `deleted_at is not null` или `status = excluded` не является активной.
- FK `sale_items.sale_id -> sales.id` не разрешает потерять родительскую связь.
- Reset базы и destructive migrations запрещены для этой функции.

## Acceptance criteria

- Live select подтверждает все используемые поля.
- Update сохраняет `product_name`, `quantity`, `price`, `total`, `updated_at`.
- Soft delete сохраняет строку.
- После reload отчёт читает актуальные значения.
- Миграции остаются идемпотентными и не удаляют данные.

## Не входит в scope

Новая схема каталога, триггеры складского учёта, физическое удаление продаж, reset/seed production базы.
