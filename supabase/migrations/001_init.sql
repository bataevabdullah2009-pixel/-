create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists shops_name_unique_idx
  on public.shops (lower(name));

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  telegram_id bigint unique not null,
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  name text not null,
  default_price numeric(12, 2),
  unit text not null default 'шт',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint products_default_price_non_negative check (default_price is null or default_price >= 0)
);

create unique index if not exists products_shop_name_unique_idx
  on public.products (shop_id, lower(name));

create table if not exists public.voice_records (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  seller_id uuid not null references public.sellers(id) on delete restrict,
  telegram_message_id text,
  audio_path text,
  audio_url text,
  raw_text text,
  cleaned_text text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  constraint voice_records_status_check check (status in ('pending', 'processed', 'needs_review', 'failed'))
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  seller_id uuid references public.sellers(id) on delete set null,
  voice_record_id uuid references public.voice_records(id) on delete set null,
  raw_text text,
  cleaned_text text,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint sales_total_amount_non_negative check (total_amount >= 0),
  constraint sales_status_check check (status in ('pending', 'processed', 'needs_review', 'failed'))
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'шт',
  price numeric(12, 2),
  total numeric(12, 2),
  confidence numeric(3, 2) not null default 0,
  status text not null default 'needs_review',
  created_at timestamptz not null default now(),
  constraint sale_items_quantity_positive check (quantity > 0),
  constraint sale_items_price_non_negative check (price is null or price >= 0),
  constraint sale_items_total_non_negative check (total is null or total >= 0),
  constraint sale_items_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint sale_items_status_check check (status in ('processed', 'needs_price', 'needs_review', 'failed'))
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete set null,
  seller_id uuid references public.sellers(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sellers_shop_id_idx on public.sellers(shop_id);
create index if not exists sellers_created_at_idx on public.sellers(created_at);

create index if not exists products_shop_id_idx on public.products(shop_id);
create index if not exists products_created_at_idx on public.products(created_at);

create index if not exists voice_records_created_at_idx on public.voice_records(created_at);
create index if not exists voice_records_seller_id_idx on public.voice_records(seller_id);
create index if not exists voice_records_shop_created_at_idx on public.voice_records(shop_id, created_at desc);

create index if not exists sales_created_at_idx on public.sales(created_at);
create index if not exists sales_seller_id_idx on public.sales(seller_id);
create index if not exists sales_shop_created_at_idx on public.sales(shop_id, created_at desc);
create index if not exists sales_voice_record_id_idx on public.sales(voice_record_id);

create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items(product_id);
create index if not exists sale_items_status_idx on public.sale_items(status);
create index if not exists sale_items_created_at_idx on public.sale_items(created_at);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);
create index if not exists audit_logs_seller_id_idx on public.audit_logs(seller_id);

alter table public.shops enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.voice_records enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.audit_logs enable row level security;

create policy "Demo read shops"
  on public.shops for select
  to anon, authenticated
  using (true);

create policy "Demo read sellers"
  on public.sellers for select
  to anon, authenticated
  using (true);

create policy "Demo read products"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "Demo read voice records"
  on public.voice_records for select
  to anon, authenticated
  using (true);

create policy "Demo read sales"
  on public.sales for select
  to anon, authenticated
  using (true);

create policy "Demo read sale items"
  on public.sale_items for select
  to anon, authenticated
  using (true);

create policy "Demo read audit logs"
  on public.audit_logs for select
  to authenticated
  using (true);

create policy "Service role manages shops"
  on public.shops for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages sellers"
  on public.sellers for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages products"
  on public.products for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages voice records"
  on public.voice_records for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages sales"
  on public.sales for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages sale items"
  on public.sale_items for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages audit logs"
  on public.audit_logs for all
  to service_role
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated, service_role;

grant select on public.shops to anon, authenticated;
grant select on public.sellers to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.voice_records to anon, authenticated;
grant select on public.sales to anon, authenticated;
grant select on public.sale_items to anon, authenticated;

grant select on public.audit_logs to authenticated;

grant select, insert, update on public.shops to service_role;
grant select, insert, update on public.sellers to service_role;
grant select, insert, update on public.products to service_role;
grant select, insert, update on public.voice_records to service_role;
grant select, insert, update on public.sales to service_role;
grant select, insert, update on public.sale_items to service_role;
grant select, insert, update on public.audit_logs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-records',
  'voice-records',
  false,
  10485760,
  array['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can read voice audio"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'voice-records');

create policy "Service role manages voice audio"
  on storage.objects for all
  to service_role
  using (bucket_id = 'voice-records')
  with check (bucket_id = 'voice-records');
