# Правила

Правила применяются к реальному MVP Voice Sales Log. Любое изменение кода требует синхронного обновления документации, changelog, планов и roadmap.

Ключевые правила текущей модели:

- сомнительная voice-запись подтверждается или отменяется только Telegram inline-кнопками;
- WebApp не должен возвращать кнопки подтверждения review-записи;
- WebApp edit review item сохраняет поля, но не добавляет выручку до Telegram confirm;
- отчёт считает только active `processed` items;
- отмена voice-записи использует `sales.status = cancelled` и soft delete товаров;
- `shop_id` не принимается от клиента.

- [AI](./ai.md)
- [Данные](./data.md)
- [Безопасность](./security.md)
- [Инженерная работа](./engineering.md)
- [Развёртывание](./deployment.md)
