# Web App fallback и автоготовые продажи — завершено 2026-06-23

## Цель

Убрать жёсткую блокировку Mini App без Telegram initData и вернуть нормальную voice-логику: готовые продажи сразу входят в отчёт, проверка нужна только для реальных проблем.

## Сделано

- Добавлены `getAppAuthContext()` и единый `apiFetch()`.
- Добавлен `resolveRequestContext()` с Telegram и fallback modes.
- `/api/auth/telegram` использует общий server helper.
- Browser fallback использует только `ALLOW_WEBAPP_FALLBACK`, `DEFAULT_SHOP_ID`, `DEFAULT_SELLER_ID` на сервере.
- Убрана красная auth-gate блокировка интерфейса.
- Voice persistence сохраняет уверенные позиции как `processed`.
- Неполные позиции сохраняются как `needs_review`.
- Ручное сохранение валидной позиции сразу делает её «Готово».
- Soft delete/restore оставлены единым механизмом исключения.
- Обновлены docs, specs, rules, roadmap, changelog и Codex skill.

## Проверка

- `npm.cmd run test` — 62 passed.
- `npm run lint` и `npm run build` выполняются перед финальным коммитом.
- Внешние Vercel/Telegram smoke checks требуют доступной production ссылки и реального Telegram клиента.
