# Sellers

Страница продавцов показывает active/inactive sellers текущего server-derived магазина.

Telegram bot создаёт seller только в разрешённых сценариях. При `DEMO_MODE=false` unknown seller не создаётся автоматически и получает сообщение о непривязанном Telegram.

Fallback Web App использует `DEFAULT_SELLER_ID` только как server-side context, не как client input.
