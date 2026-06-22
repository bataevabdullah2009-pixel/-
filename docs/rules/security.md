# Безопасность

`shop_id` определяется только сервером. Telegram initData считается недоверенным до HMAC и age validation. Любой явный browser API fetch проходит через `apiFetch` с `x-telegram-init-data`; Server Components и Server Actions повторно валидируют HttpOnly initData cookie. Service role key не имеет `NEXT_PUBLIC_` и используется только server-only модулями. Webhook требует отдельный secret token. Debug UI и `webapp auth` logs не содержат initData, токенов или user payload. Технические ошибки и stack trace не отображаются пользователю.
