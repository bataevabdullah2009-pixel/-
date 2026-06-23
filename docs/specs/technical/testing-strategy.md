# Testing Strategy

Regression tests покрывают:

- parser evidence rules;
- threshold `confidence >= 0.80`;
- отсутствие обязательного review для полных voice-продаж;
- фразы «Ники четыре штуки по сто рублей» и «Сникерс 5 штук по 100 рублей»;
- read-back sale + sale_items до success и отказ при нулевом item count;
- report calculation и soft delete;
- review отдельно от active revenue;
- единый seller shop для bot и WebApp;
- московские границы даты;
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
