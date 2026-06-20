alter table public.sale_items
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text,
  add column if not exists deleted_previous_status text,
  add column if not exists updated_at timestamptz;

alter table public.sale_items
  alter column updated_at set default now();

update public.sale_items
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.sale_items
  alter column updated_at set not null;

alter table public.sale_items
  drop constraint if exists sale_items_status_check,
  add constraint sale_items_status_check
    check (status in ('processed', 'needs_price', 'needs_review', 'failed', 'excluded'));

alter table public.sale_items
  drop constraint if exists sale_items_deleted_reason_check,
  add constraint sale_items_deleted_reason_check
    check (
      deleted_reason is null
      or deleted_reason in ('manual', 'excluded_by_owner', 'day_reset')
    );

update public.sale_items
set
  deleted_reason = coalesce(deleted_reason, 'excluded_by_owner'),
  deleted_previous_status = coalesce(
    deleted_previous_status,
    case when status = 'excluded' then 'needs_review' else status end
  ),
  status = 'excluded',
  updated_at = coalesce(updated_at, deleted_at, now())
where deleted_at is not null;

create index if not exists sale_items_active_sale_status_idx
  on public.sale_items (sale_id, status)
  where deleted_at is null;

comment on column public.sale_items.deleted_at is
  'Soft-delete timestamp. Non-null items do not participate in active reports.';

comment on column public.sale_items.deleted_reason is
  'Soft-delete reason: excluded_by_owner or day_reset; manual is retained for legacy rows.';

comment on column public.sale_items.updated_at is
  'Timestamp of the latest server-side mutation.';

comment on table public.sale_items is
  'Sale items belong to a shop through sale_items.sale_id -> sales.id -> sales.shop_id.';

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  telegram_id bigint unique not null,
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owners_shop_id_idx on public.owners(shop_id);
create index if not exists owners_active_telegram_idx
  on public.owners(telegram_id)
  where is_active = true;

alter table public.owners enable row level security;

drop policy if exists "Service role manages owners" on public.owners;
create policy "Service role manages owners"
  on public.owners for all
  to service_role
  using (true)
  with check (true);

grant usage on schema public to service_role;
revoke all on public.owners from anon, authenticated;
grant select, insert, update, delete on public.owners to service_role;

drop policy if exists "Demo read shops" on public.shops;
drop policy if exists "Demo read sellers" on public.sellers;
drop policy if exists "Demo read products" on public.products;
drop policy if exists "Demo read voice records" on public.voice_records;
drop policy if exists "Demo read sales" on public.sales;
drop policy if exists "Demo read sale items" on public.sale_items;
drop policy if exists "Demo read audit logs" on public.audit_logs;

revoke select on public.shops from anon, authenticated;
revoke select on public.sellers from anon, authenticated;
revoke select on public.products from anon, authenticated;
revoke select on public.voice_records from anon, authenticated;
revoke select on public.sales from anon, authenticated;
revoke select on public.sale_items from anon, authenticated;
revoke select on public.audit_logs from anon, authenticated;

create or replace function public.save_voice_sale(
  p_shop_id uuid,
  p_seller_id uuid,
  p_telegram_message_id text,
  p_audio_path text,
  p_audio_url text,
  p_raw_text text,
  p_cleaned_text text,
  p_parser_json jsonb,
  p_status text,
  p_error_message text,
  p_total_amount numeric,
  p_items jsonb
)
returns table (voice_record_id uuid, sale_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_voice_record_id uuid;
  v_sale_id uuid;
begin
  if not exists (
    select 1
    from public.sellers
    where id = p_seller_id
      and shop_id = p_shop_id
      and is_active = true
  ) then
    raise exception 'Active seller does not belong to the requested shop.'
      using errcode = '42501';
  end if;

  insert into public.voice_records (
    shop_id,
    seller_id,
    telegram_message_id,
    audio_path,
    audio_url,
    raw_text,
    cleaned_text,
    parser_json,
    status,
    error_message
  )
  values (
    p_shop_id,
    p_seller_id,
    p_telegram_message_id,
    p_audio_path,
    p_audio_url,
    p_raw_text,
    p_cleaned_text,
    p_parser_json,
    p_status,
    p_error_message
  )
  returning id into v_voice_record_id;

  insert into public.sales (
    shop_id,
    seller_id,
    voice_record_id,
    raw_text,
    cleaned_text,
    total_amount,
    status
  )
  values (
    p_shop_id,
    p_seller_id,
    v_voice_record_id,
    p_raw_text,
    p_cleaned_text,
    p_total_amount,
    p_status
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    sale_id,
    product_id,
    product_name,
    quantity,
    unit,
    price,
    total,
    confidence,
    status
  )
  select
    v_sale_id,
    item.product_id,
    item.product_name,
    item.quantity,
    item.unit,
    item.price,
    item.total,
    item.confidence,
    item.status
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
    product_id uuid,
    product_name text,
    quantity numeric,
    unit text,
    price numeric,
    total numeric,
    confidence numeric,
    status text
  );

  return query select v_voice_record_id, v_sale_id;
end;
$$;

revoke all on function public.save_voice_sale(
  uuid, uuid, text, text, text, text, text, jsonb, text, text, numeric, jsonb
) from public, anon, authenticated;

grant execute on function public.save_voice_sale(
  uuid, uuid, text, text, text, text, text, jsonb, text, text, numeric, jsonb
) to service_role;
