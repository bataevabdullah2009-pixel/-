# Error Handling

Mini App не показывает красную блокировку только из-за отсутствия Telegram initData. Direct browser open должен отрисовать интерфейс; данные берутся из fallback env, если fallback включён.

UI показывает ошибку только для реальных проблем сервера, БД или конфигурации. Auth 401 без fallback не должен навсегда скрывать интерфейс.

Voice pipeline:

- Storage upload best-effort и не блокирует продажу.
- Невалидный LLM JSON создаёт fallback item «Нужно проверить».
- Ошибки этапов логируются как `voice_failed` с `stage`, идентификаторами Telegram/seller/shop, STT text, parsed items, final status и реальной Supabase ошибкой.
- Пользователь не видит internal enum.

Bot replies:

- Готово: `✅ Запись сохранена: ...`
- Нужно проверить: `⚠️ Запись сохранена, но нужно проверить товары и цены.` и строка `Распознано: ...`
- Ошибка БД: `⚠️ Не удалось сохранить запись. Попробуйте ещё раз.`

Первые два ответа допустимы только после read-back проверки sale и sale_items.
