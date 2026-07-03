# Error Handling

Error handling в проекте должен сохранять диагностируемость для разработчика и понятное состояние для пользователя. Нельзя заменять auth/DB failure на успешный пустой экран.

## WebApp bootstrap

Mini App показывает состояние session bootstrap.

Direct browser open получает данные только если:

1. `ALLOW_WEBAPP_FALLBACK=true`.
2. `DEFAULT_SHOP_ID` задан.
3. `DEFAULT_SELLER_ID` задан.
4. Fallback seller существует.
5. Fallback seller active.
6. Fallback seller shop matches default shop.

Иначе пользователь видит понятную auth ошибку.

## Auth errors

Telegram auth reasons:

1. Missing initData.
2. Invalid hash.
3. Expired auth date.
4. Missing bot token.
5. User not linked.
6. Seller inactive.
7. Shop not found.
8. Fallback misconfigured.

При непустом валидном raw initData UI не показывает production-блокировку `откройте через кнопку бота`.

## WebApp loading errors

Ошибки Telegram auth и Supabase не маскируются под успешный пустой результат.

Rules:

1. Report не показывает нулевые метрики при load error.
2. Records не показывает `Записей нет` при load error.
3. Sellers не показывает `Продавцов нет` при load error.
4. Review empty state показывается только при успешной загрузке без items.
5. Error message показывается через action notice или page error state.

## WebApp mutation errors

Item update/delete:

1. Validation error остаётся внутри раскрытой карточки.
2. Pending блокирует повторный submit.
3. Supabase reason логируется server-side.
4. User получает стабильное русское сообщение.
5. Raw table/column/PostgREST details не отдаются в UI.
6. Карточка не очищает ввод при ошибке.
7. Отчёт не заменяется пустым состоянием при ошибке.

Review actions:

1. Missing sale id -> readable error.
2. Sale not found -> readable error.
3. No confirmable items -> `Не удалось подтвердить: нет ни одной полной позиции.`
4. Failed sale confirm/cancel -> forbidden readable error.
5. Revalidation failure after successful mutation -> soft refresh message.
6. Cross-shop sale -> not found/access error.

## Voice pipeline errors

Stages:

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
3. Sale pipeline continues.

LLM/parser:

1. Cleanup failure falls back to simple cleanup.
2. Parser invalid JSON triggers deterministic fallback.
3. Empty STT creates review fallback.
4. Recoverable parser failure creates review items.
5. Full failure logs stage.

Persistence:

1. RPC error blocks success.
2. Missing returned ids blocks success.
3. Sale read-back failure blocks success.
4. Item count mismatch blocks success.
5. User sees save failure message.

## Bot replies

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

Processing failure:

```text
⚠️ Не удалось обработать голосовое. Попробуйте ещё раз.
```

Seller missing:

```text
Ваш Telegram не привязан к магазину.
```

Success/review replies допустимы только после persistence/read-back verification.

## Logging

Allowed:

1. Stage.
2. Telegram message id.
3. Telegram user id.
4. Seller id.
5. Shop id.
6. Parsed item count.
7. Safe parser diagnostics.
8. Supabase error message server-side.
9. Error code.

Forbidden:

1. Raw initData.
2. Bot token.
3. Webhook secret.
4. Service role key.
5. STT key.
6. LLM key.

## UI labels

Internal enum не показывается пользователю.

Mapping:

1. `processed` -> `Готово`.
2. `needs_review` -> `Нужно проверить`.
3. `needs_price` -> `Нужно проверить`.
4. `failed` -> `Нужно проверить`.
5. `pending` -> `Нужно проверить`.
6. `cancelled` -> `Исключено`.
7. `excluded` -> `Исключено`.

## Acceptance criteria

1. Auth error is visible.
2. DB error is visible.
3. Empty state only appears after successful empty load.
4. Mutation validation errors stay near the form.
5. Parser failures preserve recoverable review data.
6. Supabase persistence false success is impossible.
7. User messages avoid internal DB details.
8. Logs are useful without leaking secrets.
