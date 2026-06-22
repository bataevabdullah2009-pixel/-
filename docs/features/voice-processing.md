# Обработка голоса

Бот принимает voice только от активного seller. Telegram id сравнивается с `sellers.telegram_id`; `shop_id` берётся из `seller.shop_id`. При `DEMO_MODE=false` неизвестный или неактивный seller получает «Ваш Telegram не привязан к магазину» и продажа не создаётся.

Pipeline: download Telegram file → audio preparation → STT → LLM parse/evidence check → sale → review-required sale items → bot reply. Storage upload выполняется best-effort и не блокирует продажу. STT/LLM реализация не изменена. Любой LLM result сохраняется для обязательной ручной проверки; невалидный response создаёт fallback `needs_review`.

Runtime logs:

`voice_received`, `seller_resolved`, `shop_resolved`, `telegram_file_downloaded`, `audio_prepared`, `stt_started`, `stt_finished`, `llm_parse_started`, `llm_parse_finished`, `sale_created`, `sale_items_created`, `voice_processed`.

Ошибка: `voice_failed` с `stage = seller_resolve | telegram_download | audio_prepare | stt | llm | supabase_insert | telegram_reply`. Сохранённая продажа не считается ошибочной из-за отдельного сбоя audit log.

Целевой persistence path — RPC `save_voice_sale`. Пока migration разворачивается, отсутствие RPC автоматически включает server-side совместимый insert с компенсирующим удалением частично созданных строк. После успешного сохранения бот показывает только русское пользовательское сообщение и Web App button, без internal enum.
