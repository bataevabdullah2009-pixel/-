# Review and Item Editing

Review voice-запись подтверждается или отменяется в Telegram либо во вкладке WebApp «Проверка».

Под сообщением бота есть:

- `✅ Подтвердить`;
- `❌ Отмена`;
- `Открыть отчёт`.

Telegram callback data короткие: `confirm:<record_id>` и `cancel:<record_id>`.

WebApp вкладка «Проверка» показывает review records, parsed text, товары и server-side `Подтвердить` / `Отмена` actions.

Редактирование товара в WebApp:

1. Карандаш открывает поля «Товар», «Количество», «Цена, ₽».
2. `Сохранить` обновляет Supabase row.
3. `Отмена` сбрасывает несохранённый ввод.
4. Processed sale после edit пересчитывает выручку.
5. Review sale после edit остаётся review до явного confirm.

Исключение товара:

```text
status = excluded
deleted_at = now()
deleted_reason = excluded_by_owner
```

Восстановление очищает deleted metadata и возвращает previous status.
