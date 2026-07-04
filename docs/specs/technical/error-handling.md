# Обработка ошибок

Обработка ошибок в проекте должна сохранять диагностируемость для разработчика и понятное состояние для пользователя. Нельзя заменять auth/DB failure на успешный пустой экран.

## Bootstrap WebApp

Mini App показывает состояние session bootstrap.

Direct browser open получает данные только если:

1. `ALLOW_WEBAPP_FALLBACK=true`.
2. `DEFAULT_SHOP_ID` задан.
3. `DEFAULT_SELLER_ID` задан.
4. Fallback seller существует.
5. Fallback seller активен.
6. Fallback seller shop совпадает с default shop.

Иначе пользователь видит понятную auth ошибку.

## Ошибки auth

Причины Telegram auth:

1. Отсутствует initData.
2. Некорректный hash.
3. Истёкший auth date.
4. Отсутствует bot token.
5. User not linked.
6. Seller inactive.
7. Shop not found.
8. Fallback misconfigured.

При непустом валидном raw initData UI не показывает production-блокировку `откройте через кнопку бота`.

## Ошибки загрузки WebApp

Ошибки Telegram auth и Supabase не маскируются под успешный пустой результат.

Правила:

1. Report не показывает нулевые метрики при load error.
2. Records не показывает `Записей нет` при load error.
3. Sellers не показывает `Продавцов нет` при load error.
4. Review empty state показывается только при успешной загрузке без items.
5. Error message показывается через action notice или page error state.

## Ошибки mutation WebApp

Item update/delete:

1. Ошибка валидации остаётся внутри раскрытой карточки.
2. Pending блокирует повторный submit.
3. Supabase reason логируется server-side.
4. User получает стабильное русское сообщение.
5. Raw table/column/PostgREST details не отдаются в UI.
6. Карточка не очищает ввод при ошибке.
7. Отчёт не заменяется пустым состоянием при ошибке.

Review actions:

1. Отсутствует sale id -> readable error.
2. Sale not found -> readable error.
3. No confirmable items -> `Не удалось подтвердить: нет ни одной полной позиции.`
4. Failed sale confirm/cancel -> forbidden readable error.
5. Revalidation failure after successful mutation -> soft refresh message.
6. Cross-shop sale -> not found/access error.

## Ошибки voice pipeline

Стадии:

1. `seller_resolve`.
2. `telegram_download`.
3. `audio_prepare`.
4. `stt`.
5. `llm`.
6. `supabase_insert`.
7. `telegram_reply`.

Storage upload:

1. Best-effort.
2. Failure logs warning.
3. Sale pipeline продолжается.

LLM/parser:

1. Cleanup failure переключается на simple cleanup.
2. Parser invalid JSON запускает deterministic fallback.
3. Empty STT создаёт review fallback.
4. Recoverable parser failure создаёт review items.
5. Full failure логирует stage.

Persistence:

1. RPC error блокирует success.
2. Отсутствующие returned ids блокируют success.
3. Sale read-back failure блокирует success.
4. Item count mismatch блокирует success.
5. User видит save failure message.

## Ответы bot

Ready:

```text
✅ Запись сохранена: ...
```

Review:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: ...
```

Save failure:

```text
⚠️ Не удалось сохранить запись. Попробуйте ещё раз.
```

Ошибка обработки:

```text
⚠️ Не удалось обработать голосовое. Попробуйте ещё раз.
```

Seller missing:

```text
Ваш Telegram не привязан к магазину.
```

Ответы success/review допустимы только после persistence/read-back verification.

## Логирование

Разрешено:

1. Stage.
2. Telegram message id.
3. Telegram user id.
4. Seller id.
5. Shop id.
6. Parsed item count.
7. Safe parser diagnostics.
8. Supabase error message server-side.
9. Error code.

Запрещено:

1. Raw initData.
2. Bot token.
3. Webhook secret.
4. Service role key.
5. STT key.
6. LLM key.

## UI-метки

Internal enum не показывается пользователю.

Сопоставление:

1. `processed` -> `Готово`.
2. `needs_review` -> `Нужно проверить`.
3. `needs_price` -> `Нужно проверить`.
4. `failed` -> `Нужно проверить`.
5. `pending` -> `Нужно проверить`.
6. `cancelled` -> `Исключено`.
7. `excluded` -> `Исключено`.

## Критерии приемки

1. Auth error видна.
2. DB error видна.
3. Empty state появляется только после successful empty load.
4. Mutation validation errors остаются рядом с form.
5. Parser failures сохраняют recoverable review data.
6. Supabase persistence false success невозможен.
7. User messages не раскрывают internal DB details.
8. Logs полезны и не раскрывают secrets.
