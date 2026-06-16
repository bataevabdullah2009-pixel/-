with demo_shop as (
  insert into public.shops (name)
  values ('Демо-магазин')
  on conflict (lower(name)) do update set name = excluded.name
  returning id
),
demo_seller as (
  insert into public.sellers (shop_id, telegram_id, name)
  select id, 100001, 'Магомед'
  from demo_shop
  on conflict (telegram_id) do update set name = excluded.name
  returning id, shop_id
),
demo_products as (
  insert into public.products (shop_id, name, default_price, unit)
  select demo_shop.id, product.name, product.default_price, product.unit
  from demo_shop
  cross join (
    values
      ('Хлеб', 40, 'шт'),
      ('Молоко', 90, 'шт'),
      ('Чай', 150, 'шт'),
      ('Сахар', 80, 'шт')
  ) as product(name, default_price, unit)
  on conflict (shop_id, lower(name)) do update
    set default_price = excluded.default_price,
        unit = excluded.unit,
        is_active = true
  returning id
),
demo_voice as (
  insert into public.voice_records (
    shop_id,
    seller_id,
    telegram_message_id,
    raw_text,
    cleaned_text,
    status,
    created_at
  )
  select
    demo_seller.shop_id,
    demo_seller.id,
    'demo-telegram-message',
    'хлеб 3 по 40 молоко 2 по 90 чай 1 штука',
    'Хлеб — 3 штуки по 40 рублей, молоко — 2 штуки по 90 рублей, чай — 1 штука.',
    'needs_review',
    now()
  from demo_seller
  returning id, shop_id, seller_id, raw_text, cleaned_text, created_at
),
demo_sale as (
  insert into public.sales (
    shop_id,
    seller_id,
    voice_record_id,
    raw_text,
    cleaned_text,
    total_amount,
    status,
    created_at
  )
  select
    shop_id,
    seller_id,
    id,
    raw_text,
    cleaned_text,
    300,
    'needs_review',
    created_at
  from demo_voice
  returning id
)
insert into public.sale_items (
  sale_id,
  product_name,
  quantity,
  unit,
  price,
  total,
  confidence,
  status,
  created_at
)
select id, 'Хлеб', 3, 'шт', 40, 120, 0.95, 'processed', now()
from demo_sale
union all
select id, 'Молоко', 2, 'шт', 90, 180, 0.95, 'processed', now()
from demo_sale
union all
select id, 'Чай', 1, 'шт', null, null, 0.7, 'needs_price', now()
from demo_sale;
