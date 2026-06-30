# Sellers

Страница «Продавцы» показывает продавцов текущего server-derived магазина.

Для каждого продавца выводится:

- имя;
- активность;
- количество записей за выбранный период;
- выручка за выбранный период.

Период выбирается тем же компактным DateFilter, что и в отчёте.

Выручка продавца считается только по active `processed` items.

Review, cancelled, failed и deleted rows в выручку продавца не входят.

WebApp сначала ищет active seller по Telegram user id.

Если seller отсутствует, но существует active owner с тем же Telegram id, WebApp создаёт seller только в owner shop.

Fallback WebApp использует `DEFAULT_SELLER_ID` только как server-side context.

Страница не принимает `shop_id` от клиента.
