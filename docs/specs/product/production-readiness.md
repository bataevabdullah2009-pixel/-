# Production Readiness

Реализовано:

- Telegram reply/inline/menu `web_app` buttons;
- безопасная `/debug-telegram` страница;
- отсутствие раннего root redirect;
- client `getAppAuthContext()` и общий `apiFetch()`;
- server `resolveRequestContext()` с Telegram и fallback modes;
- server-derived shop isolation;
- service role только на сервере;
- RPC persistence с server fallback insert;
- автоматический `processed` для уверенных voice-позиций;
- review только для реальных проблем распознавания;
- soft delete, restore и reset day;
- русские UI labels без internal enum;
- regression tests.

Release gate:

- `npm run lint`;
- `npm run test`;
- `npm run build`;
- прямое открытие Web App в fallback mode;
- открытие через Telegram кнопку;
- два voice smoke сценария: готовая продажа и неполная продажа;
- ручное save/exclude/restore с пересчётом отчёта.
