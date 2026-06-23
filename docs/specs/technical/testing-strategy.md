# Testing Strategy

Regression tests покрывают:

- parser evidence rules;
- threshold `confidence >= 0.80`;
- отсутствие обязательного review для полных voice-продаж;
- report calculation и soft delete;
- ручное сохранение processed patch;
- Telegram initData validation;
- `apiFetch` в Telegram и fallback modes;
- отсутствие client `shop_id`;
- Web App buttons;
- bot reply без internal enum.

Перед финальным ответом запускаются:

```bash
npm run lint
npm run test
npm run build
```

Если команда не запускалась или упала, это указывается явно.
