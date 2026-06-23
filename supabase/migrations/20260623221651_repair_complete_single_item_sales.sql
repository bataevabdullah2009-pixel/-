with repairable_items as (
  select
    si.id as sale_item_id,
    vr.parser_json -> 'items' -> 0 as parsed_item,
    case
      when strpos(coalesce(vr.cleaned_text, ''), ',') > 0
        then nullif(trim(split_part(vr.cleaned_text, ',', 1)), '')
      else null
    end as cleaned_product_name
  from public.sales s
  join public.voice_records vr on vr.id = s.voice_record_id
  join public.sale_items si on si.sale_id = s.id
  where si.deleted_at is null
    and si.status in ('needs_review', 'needs_price')
    and jsonb_array_length(
      case
        when jsonb_typeof(vr.parser_json -> 'items') = 'array'
          then vr.parser_json -> 'items'
        else '[]'::jsonb
      end
    ) = 1
    and (
      select count(*)
      from public.sale_items sale_item_count
      where sale_item_count.sale_id = s.id
        and sale_item_count.deleted_at is null
    ) = 1
    and jsonb_typeof(vr.parser_json -> 'items' -> 0 -> 'quantity') = 'number'
    and jsonb_typeof(vr.parser_json -> 'items' -> 0 -> 'price') = 'number'
    and jsonb_typeof(vr.parser_json -> 'items' -> 0 -> 'confidence') = 'number'
    and trim(coalesce(vr.parser_json -> 'items' -> 0 ->> 'product_name', '')) <> ''
    and (vr.parser_json -> 'items' -> 0 ->> 'quantity')::numeric > 0
    and (vr.parser_json -> 'items' -> 0 ->> 'price')::numeric > 0
    and (vr.parser_json -> 'items' -> 0 ->> 'confidence')::numeric >= 0.8
    and coalesce(vr.cleaned_text, '') ~* '(шт\.?|штук(а|и)?|кг\.?|килограмм(а|ов)?)'
    and coalesce(vr.cleaned_text, '') ~* '(руб(ль|ля|лей|\.)?|₽)'
)
update public.sale_items si
set
  product_name = coalesce(
    repairable.cleaned_product_name,
    trim(repairable.parsed_item ->> 'product_name')
  ),
  quantity = (repairable.parsed_item ->> 'quantity')::numeric,
  unit = coalesce(nullif(trim(repairable.parsed_item ->> 'unit'), ''), si.unit),
  price = (repairable.parsed_item ->> 'price')::numeric,
  total = round(
    (repairable.parsed_item ->> 'quantity')::numeric
      * (repairable.parsed_item ->> 'price')::numeric,
    2
  ),
  confidence = (repairable.parsed_item ->> 'confidence')::numeric,
  status = 'processed',
  updated_at = now()
from repairable_items repairable
where si.id = repairable.sale_item_id;

update public.sales s
set
  total_amount = si.total,
  status = 'processed'
from public.sale_items si
where si.sale_id = s.id
  and si.deleted_at is null
  and si.status = 'processed'
  and si.total is not null
  and not exists (
    select 1
    from public.sale_items other_item
    where other_item.sale_id = s.id
      and other_item.deleted_at is null
      and other_item.id <> si.id
  );

update public.voice_records vr
set status = 'processed'
from public.sales s
where s.voice_record_id = vr.id
  and s.status = 'processed';

comment on column public.sale_items.deleted_at is
  'Soft-delete timestamp. Non-null items do not participate in active reports.';
