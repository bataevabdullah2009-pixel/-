# P0 подтверждённое сохранение и отчёт — завершено 2026-06-24

## Причина

Evidence validator отбрасывал корректные quantity/price при латинской транслитерации STT, а приложение доверяло RPC identifiers без проверки фактического числа `sale_items`. WebApp мог начать auth в fallback до появления initData.

## Исправлено

- русский язык и контекст для STT;
- совпадающий cleaned-text evidence для транслитерации;
- status только по полноте и confidence конкретных items;
- RPC без неатомарного direct fallback;
- read-back sale и точного item count до bot success;
- полные pipeline logs с безопасной redaction;
- seller-first shop resolution и проверенный fallback seller;
- report/review/timezone и подтверждение WebApp mutations;
- backfill migration для однозначных старых записей;
- parser, persistence, report, review, shop и timezone tests.

## Release gate

- `npm run lint` — passed;
- `npm run test` — 8 files, 72 tests passed;
- `npm run build` — bot/web/shared passed;
- live Supabase candidate preview и read-back — 2 строки исправлены, текущая выручка 400.
