# Безопасность

`shop_id` определяется только сервером. Telegram initData считается недоверенным до HMAC и age validation. Service role key не имеет `NEXT_PUBLIC_` и используется только server-only модулями. Webhook требует отдельный secret token. Технические ошибки и stack trace не отображаются пользователю.
