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

1. Карандаш открывает поля `Товар`, `Количество`, `Цена, ₽`.
2. `Сохранить` обновляет Supabase row.
3. `Отмена` сбрасывает несохранённый ввод.
4. Processed sale после edit пересчитывает выручку.
5. Review sale после edit остаётся review до явного confirm.

Подтверждение в WebApp:

1. `confirmReviewSaleAction` проверяет текущий shop через Telegram WebApp session.
2. Parent sale переводится в `processed`.
3. Active review items переводятся в `processed`.
4. Total пересчитывается.
5. Report, review, records и sellers revalidate.

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
