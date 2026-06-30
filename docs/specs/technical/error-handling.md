# Error Handling

Mini App показывает состояние session bootstrap. Direct browser open получает данные только если fallback явно включён и корректно настроен; иначе показывается понятная auth ошибка.

При непустом валидном raw initData UI не показывает production-блокировку «откройте через кнопку бота». Invalid hash, expired auth date, missing bot token и user not linked логируются отдельными безопасными reason.

Ошибки Telegram auth и Supabase не маскируются под успешный пустой результат. Report не показывает нулевые метрики, а records не показывает «Записей нет», если чтение завершилось ошибкой.

WebApp mutations:

- validation error остаётся внутри раскрытой карточки;
- pending блокирует повторный submit;
- Supabase reason логируется server-side вместе с operation и item id;
- пользователь получает стабильное сообщение без имени таблицы, колонок и PostgREST details;
- карточка не очищается и отчёт не заменяется пустым состоянием при неуспешном update/delete.

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
