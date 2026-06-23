# Records Journal

Журнал показывает продажи магазина, продавца, исходный и очищенный текст, пользовательский статус, итог и временную signed URL аудио.

Internal enum не показываются. Labels:

- `processed` → «Готово»;
- `needs_review`, legacy `needs_price`, `failed`, `pending` → «Нужно проверить»;
- `excluded` → «Исключено».

Поддерживаются период, продавец и текстовый поиск. Seller filter не расширяет shop boundary.
