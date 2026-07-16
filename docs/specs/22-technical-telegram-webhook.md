# Техническая спецификация: Telegram Webhook

## 1. Цель

1. Webhook принимает Telegram updates.
2. Bot обрабатывает `/start`, voice messages и review callbacks.
3. Voice pipeline должен сохранять продажи без потери данных.
4. Review callbacks должны подтверждать или отменять сомнительные записи.
5. Webhook не должен зависеть от WebApp session.

## 2. Точки входа

1. Next.js route: `apps/web/src/app/api/telegram/webhook/route.ts`.
2. Bot update processor: `apps/bot/src/core/process-update.ts`.
3. Фабрика экземпляра bot: `createTelegramBot`.
4. Скрипт настройки webhook: `scripts/set-telegram-webhook.ts`.
5. Скрипт информации о webhook: `scripts/get-telegram-webhook-info.ts`.

## 3. Обработчики

1. `/start`: `start.handler.ts`.
2. Text: `text.handler.ts`.
3. Voice: `voice.handler.ts`.
4. Review callbacks: `review.handler.ts`.
5. Handlers регистрируются через `process-update.ts`.

## 4. `/start`

1. Резолвит seller по Telegram user id.
2. Создаёт seller в demo mode, когда это разрешено.
3. Отправляет report access.
4. Может включать WebApp button `Открыть отчёт`.
5. Может настраивать menu button.
6. Может показывать diagnostics button только при `DEBUG_TELEGRAM_WEBAPP=true`.
7. Не обрабатывает sales.

## 5. Стадии голосового потока

1. `seller_resolve`.
2. `telegram_reply`.
3. `telegram_download`.
4. `audio_prepare`.
5. `stt`.
6. `llm`.
7. `supabase_insert`.
8. `telegram_reply`.

Каждая stage логирует context для diagnostics.

## 6. Резолвинг seller

1. Telegram user id обязателен.
2. Seller display name берётся из first name или username.
3. `requireSeller` проверяет active seller.
4. В demo mode unknown seller может быть создан.
5. В non-demo unknown seller получает отказ.
6. Отсутствующий seller останавливает pipeline до STT.

## 7. Загрузка из Telegram

1. Использует Telegram file link.
2. Скачивает original voice file.
3. Хранит content как OGG input.
4. File name санитизируется.
5. Download failure логирует `VOICE_PROCESSING_FAILED` со stage `telegram_download`, HTTP status/response body без секретов.
6. Пустой скачанный файл отклоняется до audio preparation.

## 8. Подготовка audio

1. `prepareTelegramVoiceForStt` готовит audio для STT.
2. Conversion diagnostics логируются.
3. Может произойти fallback to original OGG.
4. Эта stage не должна переписываться для UI tasks.

## 9. Хранение audio

1. Upload в Supabase Storage выполняется best effort.
2. Upload failure логирует warning.
3. Upload failure не блокирует sale persistence.
4. `audio_path` и `audio_url` могут быть null.
5. Records page показывает audio link только если URL можно создать.

## 10. STT

1. `transcribeAudio` отправляет prepared audio в STT API.
2. Язык - русский.
3. STT возвращает raw transcript.
4. Runtime lifecycle log содержит только длину transcript; raw transcript сохраняется в защищённом processing audit/record, но не печатается в Vercel log.
5. Raw transcript сохраняется в voice/sale data.
6. STT failure может создать failed voice record, если sale не была persisted.

## 11. Парсер и очистка

1. `cleanupTranscript` создаёт cleaned text.
2. `parseSaleTranscript` возвращает parsed sale.
3. Parser возвращает items и flag `needs_review`.
4. Deterministic fallback проверяет transcript evidence и может разделить один glued parser item на несколько `sale_items`.
5. Fallback поддерживает точку, запятую перед quantity, союзы, newline, `5 по 100`, бутылки, килограммы и граммы.
6. Некорректный LLM JSON переключается на review с deterministic items, когда возможно, вместо hard fail.
7. Parser JSON и error message хранятся для diagnostics.

## 12. Сохранение

1. `saveProcessedSale` является alias для `saveVoiceSale`.
2. Source items нормализуются.
3. Logs включают parsed items before normalization и normalized items.
4. Если parser не возвращает items, `ensureReviewableSaleItems` создаёт fallback review item.
5. Item statuses резолвятся shared utilities.
6. Sale status становится `processed` только если все resolved items processed и нет parser error.
7. Иначе sale status становится `needs_review`.
8. Payload сохраняется через RPC `save_voice_sale`.
9. Persistence проверяет saved sale и item count и логирует inserted `sale_items` ids.

Основные lifecycle events:

1. `VOICE_RECEIVED`.
2. `SELLER_RESOLVED`.
3. `TELEGRAM_FILE_RESOLVED`.
4. `AUDIO_DOWNLOADED` и `AUDIO_PREPARED`.
5. `TRANSCRIPTION_STARTED` и `TRANSCRIPTION_COMPLETED`.
6. `EXTRACTION_STARTED` и `EXTRACTION_COMPLETED`.
7. `DATABASE_SAVE_STARTED` и `DATABASE_SAVE_COMPLETED`.
8. `VOICE_PROCESSING_COMPLETED` или `VOICE_PROCESSING_FAILED`.
10. False success выбрасывает ошибку.

## 13. Сообщение об успехе

Для `processed` sale:

```text
✅ Запись сохранена: ...
```

Правила:

1. Нет inline review keyboard.
2. Нет raw technical status.
3. Sale сразу попадает в report.

## 14. Сообщение review

Для `needs_review` sale:

```text
⚠️ Запись сохранена, но нужно подтвердить товары и цены.
Распознано: ...
```

Keyboard:

```text
✅ Подтвердить    ❌ Отмена
```

Правила:

1. Ровно две inline callback buttons.
2. Нет кнопки `Открыть отчёт`.
3. Нет diagnostics button.
4. Нет WebApp button.
5. Нет raw status.

## 15. Route callback

1. `review.handler.ts` регистрирует `bot.action`.
2. Regex принимает new callbacks.
3. Regex принимает legacy callbacks.
4. Callback извлекает action и sale id.
5. Callback резолвит Telegram seller.
6. Callback вызывает records service.
7. Callback отвечает Telegram loading state.
8. Callback редактирует message text, если возможно.
9. Callback переключается на reply, если edit fails.
10. Webhook route логирует safe `telegram_update_received` metadata before dispatch.
11. `scripts/set-telegram-webhook.ts` должен включать `callback_query` в `allowed_updates`.

## 16. Callback data

Разрешённые новые значения:

```text
confirm:<uuid>
cancel:<uuid>
```

Разрешённые legacy values:

```text
voice_sale_review:confirm:<uuid>
voice_sale_review:cancel:<uuid>
```

## 17. Сервис confirm

1. Function: `confirmVoiceSaleWithClient`.
2. Выбирает sale по id, shop и seller.
3. Already processed возвращает unchanged success.
4. Already cancelled возвращает unchanged success.
5. Failed sale возвращает error.
6. Загружает active items.
7. Валидирует active items по отдельности.
8. Если хотя бы один item valid, обновляет только confirmable items в `processed`.
9. Оставляет incomplete active items как `needs_review`.
10. Пересчитывает total from confirmable items.
11. Обновляет sale и voice record в `processed`.
12. Если ни один item не valid, возвращает `Не удалось подтвердить: нет ни одной полной позиции.`
13. Логирует sale id, found item count, valid item count и invalid reasons.
14. Сообщение об успехе: `✅ Подтверждено: N позиций, сумма X ₽`.

## 18. Сервис cancel

1. Function: `cancelVoiceSaleWithClient`.
2. Выбирает sale по id, shop и seller.
3. Already cancelled возвращает unchanged success.
4. Already processed возвращает unchanged success.
5. Failed sale возвращает error.
6. Загружает active items.
7. Выполняет soft-delete каждого active item.
8. Обновляет sale и voice record в cancelled.
9. Устанавливает total zero.

## 19. Идемпотентность

1. Повторный confirm для processed sale безопасен.
2. Повторный cancel для cancelled sale безопасен.
3. Confirm after cancel не восстанавливает sale.
4. Cancel after confirm не удаляет revenue.
5. Message edit failure не откатывает DB mutation.

## 20. Failed pipeline

1. Если seller существует и sale не была persisted, сохранить failed voice record.
2. Статус failed record - `failed`.
3. Error message включает stage.
4. User видит generic processing failure.
5. Supabase insert failure использует save failure message.
6. Ошибка `seller_resolve` не может создать `failed` voice record без известного seller; её причина должна оставаться в server log.

## 21. Безопасность

1. Webhook должен быть защищён Telegram secret или deployment config.
2. Service role key только server-only.
3. Callback не принимает shop id.
4. Callback seller identity приходит из Telegram user id.
5. Sale mutation фильтрует по seller и shop.
6. Logs не допускают утечку secrets.

## 22. Связь с WebApp

1. WebApp route отдельный.
2. WebApp session не требуется для Telegram callback.
3. WebApp показывает updated state после refresh.
4. WebApp `/review` открывает review confirm/cancel через server actions и WebApp session.
5. `/start` всё ещё может открыть WebApp report.

## 23. Записи в базу данных

1. Insert voice record.
2. Insert sale.
3. Insert sale items.
4. Update sale status on decision.
5. Update voice status on decision.
6. Update item statuses on decision.
7. Insert audit logs best effort.

## 24. Ошибки

1. Отсутствует Telegram user id.
2. Seller not linked.
3. Telegram file download failure.
4. Audio conversion failure.
5. STT failure.
6. Parser failure.
7. Supabase insert failure.
8. Telegram reply failure.
9. Callback sale not found.
10. Callback item validation failure.

## 25. Критерии приемки

1. Confident voice sale получает success message.
2. Confident sale имеет status `processed`.
3. Review voice sale получает warning message.
4. Review keyboard имеет только две кнопки.
5. Review keyboard не содержит `Открыть отчёт`.
6. Confirm callback обрабатывает sale.
7. Cancel callback отменяет sale.
8. Repeat callback не портит data.
9. Failed voice record сохраняется, когда возможно.
10. Voice pipeline tests проходят.

## 26. Вне области

1. Замена Telegraf.
2. Замена STT provider.
3. Замена LLM/parser.
4. Физическое удаление sale data.
