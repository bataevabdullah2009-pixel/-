# 016 - Восстановление voice pipeline и WebApp после остановки Supabase

Статус: завершена доступная автоматическая стабилизация 16 июля 2026. Ручная отправка пользователем в Telegram Android/Desktop остаётся post-deploy проверкой.

## Симптомы

1. Любое голосовое завершалось общим сообщением `Не удалось обработать голосовое`.
2. Извлечение не запускалось.
3. WebApp не мог завершить auth/загрузку данных.

## Подтверждённая причина

Production Supabase project `jkmcnaprrnrjkefuxzmw` находился в состоянии `INACTIVE`. Vercel deployment и Telegram webhook оставались рабочими, env совпадали, STT/LLM credentials были валидны.

Voice handler сначала вызывает `requireSeller`. Поэтому недоступность Supabase останавливала pipeline на `seller_resolve` до Telegram `getFile`, OGG download, audio preparation, STT и parser. Seller ещё не был известен, поэтому сохранить `voice_records.status=failed` также было невозможно. WebApp зависел от того же Supabase для Telegram principal/shop и server-side data.

## Выполнено

1. Исходный HEAD `9efe8bd8a109a0501d4c374cf1964190e0fde348` сохранён в ветке `backup/stabilization-20260716`.
2. История сравнена с `origin/main` и последними рабочими code commits; отката кода не потребовалось.
3. Supabase восстановлен штатным Management API до `ACTIVE_HEALTHY` без reset, удаления данных и миграций.
4. Добавлены безопасные stage-логи voice pipeline и typed diagnostics внешних HTTP errors.
5. Добавлены реальные STT/parser, production DB/audio, WebApp и Telegram smoke-скрипты.
6. Проверено совпадение локальных и Vercel production env по именам и значениям без вывода секретов.
7. Проверены production Vercel deployment, canonical URL, webhook, allowed updates, menu button, signed initData/session, страницы, chunks и Telegram SDK.

## Реальные результаты

1. OGG fixture: непустой STT transcript, две позиции parser, fallback не использован.
2. Audio pipeline: `Буханка хлеба` 5 × 100 = 500 и `Сникерс` 3 × 200 = 600; production total 1100.
3. Production schema/RPC/bucket совместимы с текущим кодом.
4. Mixed sale сохранила готовую позицию `processed`, неполную `needs_price`.
5. Confirm реально изменил sale/item на `processed` и total на 180.
6. Cancel реально изменил sale/voice на `cancelled`, total на 0 и soft-delete item.
7. Все шесть временных DB-наборов и storage object удалены адресной cleanup.
8. WebApp auth вернул Telegram session; `/daily-report`, `/review`, `/records`, `/sellers` и 11 assets вернули успешный production render.
9. Telegram webhook совпал с production URL, pending updates 0, last error отсутствует, menu button `Открыть отчёт` указывает на canonical WebApp URL.

## Не выполнено автоматически

1. Отправка голоса из реального Telegram аккаунта после нового deployment.
2. Нажатие `Подтвердить`/`Отмена` именно в Telegram UI; backend-сервисы и реальные DB mutations проверены напрямую.
3. Открытие кнопки на Telegram Android и Desktop/Web с фактическим клиентским `window.Telegram.WebApp`.

Эти три проверки нельзя честно заменить signed-initData HTTP smoke и они должны быть выполнены пользователем или оператором в реальном Telegram client.
