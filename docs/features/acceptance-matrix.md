# Feature Acceptance Matrix

| Feature | User value | Acceptance check | Status |
| --- | --- | --- | --- |
| Telegram voice input | Seller speaks instead of typing | Bot accepts voice message | Done |
| STT transcript | Voice becomes text | Raw text saved | Done |
| Cleanup text | Text is readable | Cleaned text saved | Done |
| JSON parser | Text becomes sale items | Items validate by Zod | Done |
| Products default price | Missing voice price can be resolved | `products.default_price` used | Done |
| `needs_price` | Unknown price is visible | Item appears in review block | Done |
| Records page | Owner sees original records | `/records` renders list | Done |
| Daily report | Owner sees day totals | `/daily-report` renders table | Done |
| Grouping | Same products are summed | Test checks bread 3 + bread 2 | Done |
| Revenue | Owner sees money total | Tests check revenue calculation | Done |
| Manual correction | Owner can fix disputed item | Form updates item | Done |
| Documentation | Teacher understands project | Docs map and specs exist | Done |
| Tests | Core logic is protected | `npm run test` passes | Done |
