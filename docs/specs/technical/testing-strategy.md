# Стратегия тестирования

Vitest покрывает нормализацию, parser evidence, обязательный review state, отсутствие raw-статусов в сообщении бота и UI, report calculation, manual update patch, soft delete, seller access, Telegram initData, `ready()`/`expand()`, обязательный initData header, auth error codes включая inactive seller, shop lookup, отсутствие client `shop_id`, reply/inline/menu `web_app` buttons, debug URL, канонический публичный URL и построение webhook URL. Production build выполняет TypeScript и Next.js compile.

Обязательные команды:

```bash
npm run test
npm run lint
npm run build
```

Перед production rollout дополнительно нужен сквозной сценарий с реальными Telegram, STT, LLM, Supabase и Vercel.
