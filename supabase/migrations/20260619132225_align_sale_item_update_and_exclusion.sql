alter table public.sale_items
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text,
  add column if not exists updated_at timestamptz not null default now();

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

create index if not exists idx_sale_items_active
  on public.sale_items (created_at, status)
  where deleted_at is null;

comment on column public.sale_items.updated_at is
  'Timestamp of the latest manual or server-side mutation of the sale item.';

comment on column public.sale_items.deleted_reason is
  'Soft-delete reason: excluded_by_owner or day_reset; manual is retained for legacy rows.';
