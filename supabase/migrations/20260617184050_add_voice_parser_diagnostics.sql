alter table public.voice_records
  add column if not exists parser_json jsonb;

comment on column public.voice_records.parser_json is
  'Complete validated JSON returned by the sale parser for diagnostics.';
