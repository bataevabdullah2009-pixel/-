# Risks

## Technical risks

| Risk | Impact | Control |
| --- | --- | --- |
| STT returns bad text | Sale may be wrong | Use `needs_review`. |
| LLM returns invalid JSON | Parser fails | Validate with Zod. |
| Price is missing | Revenue can be wrong | Use `needs_price`, exclude from revenue. |
| Supabase keys missing | App cannot save data | `.env.example`, README, startup validation. |
| Service role leaks to browser | Security issue | Use lazy server-only admin client. |
| Webhook secret is missing or wrong | Telegram updates are rejected | Configure `TELEGRAM_WEBHOOK_SECRET` in Vercel and set Telegram `secret_token`. |
| Polling runs in production | Duplicate update processing | Keep polling local-only and use Vercel webhook. |

## Product risks

| Risk | Impact | Control |
| --- | --- | --- |
| Project becomes CRM | Scope explosion | Scope rules and out-of-scope docs. |
| Project becomes warehouse | Wrong product direction | No stock fields or stock flows. |
| Report gets overloaded | Owner loses quick view | Main table stays minimal. |

## Quality risks

| Risk | Control |
| --- | --- |
| Docs become outdated | Update docs with every logic change. |
| Workplan lies | Keep active/completed plans separate. |
| Tests miss core logic | Keep report and parser validation tests. |
