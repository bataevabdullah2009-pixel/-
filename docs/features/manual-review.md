# Manual Review

Review voice-запись подтверждается или отменяется в Telegram либо на вкладке WebApp `Проверка`.

Под сообщением бота есть только:

- `✅ Подтвердить`;
- `❌ Отмена`.

Telegram callback data короткие:

- `confirm:<sale_id>`;
- `cancel:<sale_id>`.

WebApp `Проверка` показывает только active `needs_review` позиции, держит каждую позицию отдельной карточкой и содержит actions `Подтвердить`, `Отмена` и `Подтвердить всё`.

Редактирование товара в WebApp:

1. Карандаш открывает поля `Товар`, `Количество`, `Единица`, `Цена, ₽`.
2. `Сохранить` обновляет Supabase row.
3. `Отмена` сбрасывает несохранённый ввод.
4. Processed sale после edit пересчитывает выручку.
5. Review sale после edit остаётся review до явного confirm.

Подтверждение в WebApp:

1. `confirmReviewSaleAction` проверяет текущий shop через Telegram WebApp session.
2. Confirm validates active items individually.
3. Если есть хотя бы один валидный item, parent sale переводится в `processed`.
4. Валидные review items переводятся в `processed`; неполные остаются `needs_review`.
5. Если нет ни одной полной позиции, возвращается `Не удалось подтвердить: нет ни одной полной позиции.`
6. Total пересчитывается по валидным items.
7. Report, review, records и sellers revalidate.

Отмена в WebApp:

1. `cancelReviewSaleAction` проверяет текущий shop через Telegram WebApp session.
2. Parent sale переводится в `cancelled`.
3. Active items переводятся в `excluded`.
4. Запись не входит в выручку.

Удаление товара:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
```

Восстановление очищает deleted metadata и возвращает previous status.
