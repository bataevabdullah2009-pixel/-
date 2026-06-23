# 003 — Production Web App URL guard

Закрыто: единая проверка публичного Web App URL для bot runtime, webhook setup и diagnostics.

Текущий код по-прежнему требует корректный публичный `NEXT_PUBLIC_APP_URL` для Telegram buttons. Browser fallback не меняет Telegram webhook contract.
