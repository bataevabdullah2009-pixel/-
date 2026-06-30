# Telegram Webhook and Bot Flow

Статус: реализовано.

## Endpoint

Webhook endpoint:

```text
POST /api/telegram/webhook
```

Runtime: Node.js.

Запрос принимается только при constant-time совпадении:

```text
x-telegram-bot-api-secret-token == TELEGRAM_WEBHOOK_SECRET
```

`TELEGRAM_WEBHOOK_SECRET` не используется для Telegram WebApp HMAC.

## Bot setup

`/start` отправляет:

1. Reply keyboard с `web_app` кнопкой «Открыть отчёт».
2. Inline keyboard с `web_app` кнопкой «Открыть отчёт».
3. MenuButtonWebApp с тем же WebApp URL.

Кнопка diagnostics добавляется только при:

```text
DEBUG_TELEGRAM_WEBAPP=true
```

В production без этого флага diagnostics не появляется в обычном сценарии.

## Voice update

Bot обрабатывает `message.voice`.

Этапы:

1. `voice_received`.
2. `seller_resolve`.
3. `telegram_reply` для сообщения «обрабатываю».
4. `telegram_download`.
5. `audio_prepare`.
6. Storage upload best-effort.
7. `stt`.
8. `llm`.
9. `supabase_insert`.
10. read-back verification.
11. final `telegram_reply`.

Каждый failure логируется как `voice_failed` с `stage`.

## Seller resolution

1. Bot берёт `ctx.from.id`.
2. Сервер ищет active seller.
3. При `DEMO_MODE=false` неизвестный seller не создаётся автоматически.
4. При seller access error bot отвечает, что Telegram не привязан к магазину.
5. `shop_id` не приходит из Telegram callback или клиента.

## Save success guard

Bot не отвечает «Запись сохранена», пока:

1. `save_voice_sale` не завершился без ошибки.
2. RPC не вернул `sale_id`.
3. RPC не вернул `voice_record_id`.
4. Сервер не прочитал sale обратно.
5. Сервер не прочитал ожидаемое количество sale_items.
6. Количество sale_items совпало с ожидаемым.

Если Supabase insert/read-back упал, bot отвечает:

```text
⚠️ Не удалось сохранить запись. Попробуйте ещё раз.
```

## Уверенная запись

Bot отвечает:

```text
✅ Запись сохранена: <распознанный текст>.
```

Inline confirm/cancel keyboard не добавляется.

Статусы:

1. `sales.status = processed`.
2. `voice_records.status = processed`.
3. Валидные `sale_items.status = processed`.

Запись сразу входит в отчёт.

## Сомнительная запись

Bot отвечает:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: <распознанный текст>.
```

Под сообщением inline-кнопки:

1. `✅ Подтвердить`.
2. `❌ Отмена`.
3. `Открыть отчёт`.

В этом сообщении запрещены:

1. URL-кнопки.
2. Diagnostics.
3. Любая неописанная кнопка.

`Открыть отчёт` разрешена только как Telegram `web_app` кнопка.

## Callback handler

Callback pattern:

```text
(confirm|cancel):<sale_id>
```

Handler регистрируется в bot перед общими text handlers.

Он:

1. Читает action.
2. Читает `sale_id`.
3. Читает Telegram user id из callback update.
4. Повторно разрешает seller.
5. Выполняет confirm или cancel через records service.
6. Отвечает `answerCbQuery`.
7. Пытается `editMessageText`.
8. Если edit не удался, отправляет обычный reply.

Handler также принимает legacy `voice_sale_review:(confirm|cancel):<sale_id>` для старых сообщений.

Logs:

1. `callback_received`.
2. `callback_action`.
3. Поля: `record_id`, `telegram_user_id`, `old_status`, `new_status`, `error`.

## Confirm callback

Confirm:

1. Проверяет sale по seller/shop.
2. Игнорирует already processed как успешное unchanged состояние.
3. Не восстанавливает already cancelled.
4. Валидирует active items.
5. Переводит валидные items в `processed`.
6. Ставит `confidence = 1`.
7. Обновляет sale status на `processed`.
8. Обновляет voice record status на `processed`.
9. Пересчитывает total amount.
10. Возвращает сообщение:

```text
✅ Запись подтверждена и добавлена в отчёт.
```

## Cancel callback

Cancel:

1. Проверяет sale по seller/shop.
2. Игнорирует already cancelled как успешное unchanged состояние.
3. Не откатывает already processed.
4. Soft-delete active items.
5. Ставит sale status `cancelled`.
6. Ставит voice record status `cancelled`.
7. Ставит `sales.total_amount = 0`.
8. Возвращает сообщение:

```text
❌ Запись отменена и не входит в отчёт.
```

## Идемпотентность

Первое решение выигрывает.

Повторный callback:

1. Не создаёт дубли.
2. Не выполняет физический delete.
3. Не меняет already decided sale.
4. Возвращает стабильное пользовательское сообщение.

## WebApp buttons

Кнопка «Открыть отчёт» доступна:

1. В `/start` reply keyboard.
2. В `/start` inline keyboard.
3. В menu button.
4. В review-message после сомнительной voice-записи.

Она создаётся только как `web_app`.

Обычная URL-кнопка не используется.

## Diagnostics

`/debug-telegram` показывает только безопасные признаки:

1. `hasWindow`.
2. `hasTelegram`.
3. `hasWebApp`.
4. `initDataLength`.
5. Наличие user id.
6. Platform/version.

Raw initData и токены не показываются.

Production route возвращает 404 без `DEBUG_TELEGRAM_WEBAPP=true`.

## Ошибки

1. Missing Telegram user id — пользовательское сообщение.
2. SellerAccessError — «Ваш Telegram не привязан к магазину».
3. Supabase error — server log и стабильное сообщение.
4. Telegram edit failure — fallback reply.
5. Voice save failure — save failure message.
6. Non-save pipeline failure — generic processing failure.

## Acceptance criteria

1. Webhook secret проверяется constant-time.
2. `/start` создаёт web_app кнопки.
3. Diagnostics скрыта по умолчанию.
4. Уверенная запись не получает review keyboard.
5. Сомнительная запись получает confirm/cancel callback buttons.
6. Сомнительная запись получает `Открыть отчёт` как `web_app`.
7. Confirm переводит sale в processed.
8. Cancel переводит sale в cancelled.
8. Repeat callback не ломает данные.
9. Bot success не отправляется до read-back.
10. Voice pipeline logs содержат named stages.

## Не входит в scope

1. Изменение STT provider.
2. Изменение LLM parser.
3. OAuth в Telegram.
4. Client-side shop selection.
5. WebApp confirmation buttons.
