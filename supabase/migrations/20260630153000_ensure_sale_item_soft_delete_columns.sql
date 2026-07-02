alter table public.sale_items
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text,
  add column if not exists deleted_previous_status text,
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

alter table public.sale_items
  drop constraint if exists sale_items_deleted_previous_status_check,
  add constraint sale_items_deleted_previous_status_check
    check (
      deleted_previous_status is null
      or deleted_previous_status in ('processed', 'needs_price', 'needs_review', 'failed')
    );

alter table public.sale_items
  drop constraint if exists sale_items_deleted_metadata_check,
  add constraint sale_items_deleted_metadata_check
    check (
      (deleted_at is null and deleted_reason is null and deleted_previous_status is null)
      or (deleted_at is not null and deleted_reason is not null and deleted_previous_status is not null)
    );

create index if not exists idx_sale_items_active
  on public.sale_items (created_at, status)
  where deleted_at is null;

create index if not exists sale_items_active_sale_id_idx
  on public.sale_items (sale_id)
  where deleted_at is null;

create index if not exists sale_items_deleted_at_idx
  on public.sale_items (deleted_at desc)
  where deleted_at is not null;

comment on column public.sale_items.deleted_at is
  'Soft-delete timestamp. Non-null items are excluded from reports but can be restored.';

comment on column public.sale_items.deleted_reason is
  'Soft-delete reason: excluded_by_owner or day_reset; manual is retained for legacy rows.';

comment on column public.sale_items.deleted_previous_status is
  'Status restored when a soft-deleted item is returned to the report.';

