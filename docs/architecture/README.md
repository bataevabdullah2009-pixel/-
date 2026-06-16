# Architecture

## Общий поток данных

1. Seller sends voice message to Telegram Bot.
2. Bot receives message.
3. Bot downloads audio file.
4. Audio is uploaded to Supabase Storage.
5. Transcription service converts audio to raw text.
6. Cleanup text service improves punctuation and readability.
7. LLM parser extracts sale items as strict JSON.
8. Record service saves voice record, sale and sale items to Supabase.
9. Web dashboard reads records and sale items from Supabase.
10. Owner filters records by date, seller or search text.
11. Owner opens `/daily-report` and sees grouped products, quantity and revenue.

## Главные сущности

- `Shop`
- `Seller`
- `Product`
- `VoiceRecord`
- `Sale`
- `SaleItem`
- `AuditLog`

## Приложения

### `apps/bot`

Telegram-бот:

- регистрирует команду `/start`;
- принимает voice messages;
- скачивает аудио;
- отправляет аудио в Storage;
- вызывает STT;
- вызывает LLM cleanup/parser;
- сохраняет данные в Supabase;
- отвечает продавцу статусом обработки.

### `apps/web`

Next.js App Router веб-панель:

- `/daily-report` — таблица отчёта;
- `/records` — список записей;
- `/sellers` — список продавцов;
- server-side Supabase client;
- ручное исправление спорных позиций через server action.

### `packages/shared`

Общий пакет:

- типы;
- Zod-схемы;
- date-range утилиты;
- агрегация отчётов.

## База данных

### `shops`

- `id uuid primary key`
- `name text not null`
- `created_at timestamptz default now()`

### `sellers`

- `id uuid primary key`
- `shop_id uuid references shops(id)`
- `telegram_id bigint unique not null`
- `name text`
- `is_active boolean default true`
- `created_at timestamptz default now()`

### `products`

- `id uuid primary key`
- `shop_id uuid references shops(id)`
- `name text not null`
- `default_price numeric(12,2)`
- `unit text default 'шт'`
- `is_active boolean default true`
- `created_at timestamptz default now()`

### `voice_records`

- `id uuid primary key`
- `shop_id uuid references shops(id)`
- `seller_id uuid references sellers(id)`
- `telegram_message_id text`
- `audio_url text`
- `raw_text text`
- `cleaned_text text`
- `status text check status in ('pending', 'processed', 'needs_review', 'failed')`
- `error_message text`
- `created_at timestamptz default now()`

### `sales`

- `id uuid primary key`
- `shop_id uuid references shops(id)`
- `seller_id uuid references sellers(id)`
- `voice_record_id uuid references voice_records(id)`
- `raw_text text`
- `cleaned_text text`
- `total_amount numeric(12,2)`
- `status text check status in ('pending', 'processed', 'needs_review', 'failed')`
- `created_at timestamptz default now()`

### `sale_items`

- `id uuid primary key`
- `sale_id uuid references sales(id)`
- `product_id uuid references products(id)`
- `product_name text not null`
- `quantity numeric(12,3)`
- `unit text default 'шт'`
- `price numeric(12,2)`
- `total numeric(12,2)`
- `confidence numeric(3,2)`
- `status text check status in ('processed', 'needs_price', 'needs_review', 'failed')`
- `created_at timestamptz default now()`

### `audit_logs`

- `id uuid primary key`
- `shop_id uuid references shops(id)`
- `seller_id uuid references sellers(id)`
- `action text not null`
- `details jsonb`
- `created_at timestamptz default now()`

## Supabase security notes

- RLS включён для таблиц `public`.
- Демо-политики дают read-only доступ `anon` для веб-панели без авторизации.
- Запись данных выполняется серверным кодом через service role.
- Для production нужно заменить демо-политики на авторизацию owner/seller.
