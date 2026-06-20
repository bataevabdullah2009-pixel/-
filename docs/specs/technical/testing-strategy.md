# Стратегия тестирования

Vitest покрывает нормализацию, parser evidence, статусы, report calculation, manual update patch, soft delete, seller access, Telegram initData, `ready()`/`expand()`, обязательный initData header, auth error codes, inactive seller, shop lookup, отсутствие client `shop_id` и обе Telegram `web_app` button формы. Production build выполняет TypeScript и Next.js compile.

Обязательные команды:

```bash
npm run test
npm run lint
npm run build
```

Перед production rollout дополнительно нужен сквозной сценарий с реальными Telegram, STT, LLM, Supabase и Vercel.
