# 014 - Mixed cart confirmation and calm SaaS WebApp

Дата: 2026-07-02

## Цель

Исправить confirm-flow после голосового распознавания так, чтобы одна неполная позиция не блокировала всю корзину, и заменить резкий оранжево-чёрный WebApp на спокойный premium SaaS интерфейс.

## Confirm flow

- Root cause: прежний confirm требовал, чтобы все active `sale_items` были полными. Если parser создавал одну валидную позицию и одну неполную строку, handler считал всю корзину невалидной.
- Telegram `confirmVoiceSaleWithClient` и WebApp `confirmReviewSale` теперь работают на уровне `sale_items`.
- Валидная позиция: осмысленный `product_name`, положительное `quantity` или весовая величина, а также сохранённый `price` или `total`, из которого можно вычислить unit price.
- Валидные items получают `processed`, `confidence = 1`, пересчитанные `price` и `total`.
- Неполные active items остаются в `needs_review` и не входят в выручку.
- Если нет ни одной полной позиции, confirm не меняет sale/items и возвращает `Не удалось подтвердить: нет ни одной полной позиции.`

## Units and totals

- `шт` и `кг` считаются напрямую.
- `г`, `гр`, `грамм`, `грамма`, `граммов` нормализуются в `г`.
- Для граммов total считается как доля килограмма: `300 г по 200 ₽ = 60 ₽`.
- Если есть total и количество/вес, но нет unit price, unit price вычисляется из total.

## WebApp

- Основная палитра: background `#0B1020`, surface `#12192B`, surface2 `#161F34`, border `rgba(255,255,255,0.08)`, text `#F3F6FB`, muted `#94A3B8`, accent `#5B8CFF`.
- Оранжевый больше не является основным цветом интерфейса и используется только как warning.
- Header стал компактным: один заголовок и контекст магазина.
- KPI остаётся сеткой 2x2.
- Фильтры периода: `Сегодня`, `Вчера`, `Неделя`, `Месяц` и выбор даты.
- Топ товаров ограничен пятью строками, длинные названия обрезаются.
- Последние продажи используют компактные карточки с edit/delete справа.
- `Проверка` показывает причины неполноты: нет цены, нет количества/веса, не удалось выделить отдельный товар.
- Edit mode поддерживает товар, количество, единицу и цену.
- WebApp metadata указывает `/favicon.svg` в новой палитре, чтобы browser smoke не ловил 404 на отсутствующей иконке.

## Документация

Обновлены README, AGENTS, CHANGELOG, product/technical/data specs, features, architecture, rules, overview, active/completed plans и локальный Codex skill.

## Проверка

Release gate для этой работы:

- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- browser smoke WebApp

Отдельные regression tests покрывают:

- полную корзину `Сникерс 5 штук по 100 рублей. Буханка хлеба 3 штуки по 50 рублей`;
- mixed-корзину с валидной позицией и неполной строкой;
- корзину без полной позиции.

## Backlog

- Production smoke через реального Telegram bot после deploy.
- Дополнительная визуальная проверка WebApp на реальных Telegram WebView устройствах.
