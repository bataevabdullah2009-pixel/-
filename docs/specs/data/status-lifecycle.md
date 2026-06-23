# Status Lifecycle

## Voice item

```text
recognized complete + confidence >= 0.80 -> processed
missing product/quantity/price or low confidence -> needs_review
user excludes -> excluded + deleted_at
user restores -> previous status or needs_review
user saves valid fields -> processed
```

## Sale and voice record

`processed`: все активные позиции готовы.

`needs_review`: хотя бы одна активная позиция требует проверки.

`failed`: pipeline завершился технической ошибкой до сохранения продажи.

Пользователь видит не enum, а labels «Готово», «Нужно проверить», «Исключено».
