# Roadmap

## Current release state

Продукт готовится к сдаче как Telegram bot + WebApp для реального магазина.

Актуально реализовано:

- voice pipeline сохраняет уверенные продажи как `processed`;
- сомнительные продажи сохраняются как `needs_review`;
- Telegram review-message содержит только `✅ Подтвердить` и `❌ Отмена`;
- WebApp показывает `Отчёт`, `Проверка`, `Записи`, `Продавцы`;
- WebApp `/review` подтверждает и отменяет review voice-записи через server actions;
- edit/delete товаров сохраняются в Supabase и пересчитывают отчёт;
- soft delete исключает товары из active revenue;
- диагностика Telegram скрыта от обычного пользователя.

## Release checklist

1. Прогнать `npm run lint`.
2. Прогнать `npm run test`.
3. Прогнать `npm run build`.
4. Прогнать `npm run web:build`.
5. Проверить production env vars.
6. Проверить webhook URL.
7. Проверить Supabase migrations.
8. Проверить Storage bucket для audio.
9. Выполнить ручной Telegram smoke.
10. Проверить WebApp на мобильном viewport.

## Near-term backlog

- Реальный Telegram smoke для confirm/cancel после deploy и просмотра `telegram_update_received`.
- Проверка логов Vercel и Supabase после первых production voice messages.
- Экспорт отчёта в CSV/XLSX.
- Более подробная аналитика parser confidence.
- Улучшенный экран восстановления soft-deleted items.

## Out of scope for current release

- Замена STT provider.
- Замена parser/LLM contract.
- Большой desktop admin dashboard.
- Сложная складская учётная модель.

## Decision log

2026-07-02:

- Review decision доступен в Telegram и на WebApp вкладке `Проверка`.
- Третья кнопка `Открыть отчёт` удалена из review-message.
- `/review` снова является пользовательским экраном для active `needs_review`.
- Revenue защищён от processed-looking items внутри `needs_review` sale.
