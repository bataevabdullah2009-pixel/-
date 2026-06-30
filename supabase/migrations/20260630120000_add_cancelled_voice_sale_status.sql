alter table public.voice_records
  drop constraint if exists voice_records_status_check,
  add constraint voice_records_status_check
    check (status in ('pending', 'processed', 'needs_review', 'cancelled', 'failed'));

alter table public.sales
  drop constraint if exists sales_status_check,
  add constraint sales_status_check
    check (status in ('pending', 'processed', 'needs_review', 'cancelled', 'failed'));

comment on constraint voice_records_status_check on public.voice_records is
  'Voice status lifecycle: pending, processed, needs_review, cancelled, failed.';

comment on constraint sales_status_check on public.sales is
  'Sale status lifecycle: pending, processed, needs_review, cancelled, failed.';
