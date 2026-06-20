# Стратегия тестирования

Vitest покрывает нормализацию, parser evidence, статусы, report calculation, manual update patch, soft delete, seller access, Telegram initData и shop matching. Production build выполняет TypeScript и Next.js compile.

Обязательные команды:

```bash
npm run test
npm run build
```

Перед production rollout дополнительно нужен сквозной сценарий с реальными Telegram, STT, LLM, Supabase и Vercel.
