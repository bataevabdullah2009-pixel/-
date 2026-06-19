# Monitoring и alerting

## Что логировать

- correlation ID, `update_id`, `voice_record_id`, `sale_id` и безопасный `shop_id`;
- начало, завершение и длительность download, Storage, STT, LLM, validation и Supabase;
- HTTP status webhook без тела с секретами;
- переходы статусов и причины `needs_review`/`failed`;
- результат server action и аудит административной операции.

Запрещено логировать токены, секреты, service role, полный init data и чувствительное аудио. Тексты сообщений логируются только по утверждённой политике хранения.

## Ошибки и сигналы

- failed STT и рост latency/timeout;
- failed LLM, невалидный JSON и рост validation failures;
- Supabase ошибки, нарушения constraint, Storage и RPC failures;
- webhook 4xx/5xx, очередь Telegram и `last_error_message`;
- рост `failed` и `needs_review`, отсутствие успешных продаж при наличии update;
- ошибки авторизации и попытки доступа к чужому `shop_id`.

Для каждого alert нужны порог, окно, владелец реакции и runbook. Логи дополняются метриками и error tracking; один только `console.error` не считается мониторингом.

## Критерии приёмки

- контролируемый сбой каждого внешнего этапа виден в monitoring;
- alert создаётся в заданное время и содержит correlation ID;
- оператор находит связанный update без доступа к секретам;
- есть dashboard успешности и latency по этапам;
- runbook описывает диагностику webhook, STT, LLM и Supabase;
- проверка alert проводится регулярно и фиксируется.
