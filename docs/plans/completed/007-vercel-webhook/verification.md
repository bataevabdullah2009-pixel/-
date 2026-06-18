# Vercel webhook — проверка

- Build: `npm run build` показывает dynamic route `/api/telegram/webhook`.
- Live: `npm run telegram:set-webhook`, затем `npm run telegram:webhook-info`.
- Готово, если URL верен, pending errors отсутствуют, а update обрабатывается один раз.
