# Review and Item Editing

Review voice-запись подтверждается или отменяется в Telegram.

Под сообщением бота есть только:

- `✅ Подтвердить`;
- `❌ Отмена`.

WebApp не показывает confirm/cancel controls для review-записи.

WebApp показывает review items отдельно и сообщает, что запись нужно подтвердить в Telegram.

Редактирование товара в WebApp:

1. Карандаш открывает поля «Товар», «Количество», «Цена, ₽».
2. `Сохранить` обновляет Supabase row.
3. `Отмена` сбрасывает несохранённый ввод.
4. Processed sale после edit пересчитывает выручку.
5. Review sale после edit остаётся review до Telegram confirm.

Исключение товара:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
```

Восстановление очищает deleted metadata и возвращает previous status.
