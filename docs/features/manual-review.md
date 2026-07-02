# Manual Review

Review voice-запись подтверждается или отменяется только в Telegram.

Под сообщением бота есть только:

- `✅ Подтвердить`;
- `❌ Отмена`.

Telegram callback data короткие:

- `confirm:<sale_id>`;
- `cancel:<sale_id>`.

WebApp показывает review-записи и review-items как `Нужно подтвердить в Telegram`, но не содержит confirm/cancel actions.

Редактирование товара в WebApp:

1. Карандаш открывает поля `Товар`, `Количество`, `Цена, ₽`.
2. `Сохранить` обновляет Supabase row.
3. `Отмена` сбрасывает несохранённый ввод.
4. Processed sale после edit пересчитывает выручку.
5. Review sale после edit остаётся review до Telegram confirm.

Удаление товара:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
```

Восстановление очищает deleted metadata и возвращает previous status.
