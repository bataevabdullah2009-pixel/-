import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { RefreshButton } from "@/components/RefreshButton";
import { SaleItemCard } from "@/components/SaleItemCard";
import { getReport } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import {
  formatCurrency,
  formatQuantity,
  getReportFilters,
  getStringParam
} from "@/features/records/records.utils";
import { isRevenueSaleItemStatus } from "@voice-sales-log/shared/utils/date-range";
import {
  resetDayRevenueAction,
  restoreSaleItemAction
} from "./actions";

export const dynamic = "force-dynamic";

type DailyReportPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function DailyReportPage({ searchParams }: DailyReportPageProps) {
  const params = await searchParams;
  const filters = getReportFilters(params);
  const { period, date } = filters;
  const mutation = getStringParam(params.mutation);
  const message = getStringParam(params.message);
  const { range, salesCount, summary, items, deletedItems, error } = await getReport(filters);
  const returnQuery = new URLSearchParams({ period });
  if (date) returnQuery.set("date", date);
  const returnTo = `/daily-report?${returnQuery.toString()}#items`;
  const isSingleDay = period === "today" || period === "yesterday" || period === "custom";
  const reviewItems = summary.reviewItems;
  const processedItems = items.filter((item) => isRevenueSaleItemStatus(item.status));
  const topRows = [...summary.rows].sort((left, right) => right.revenue - left.revenue).slice(0, 5);

  if (error) {
    return (
      <section className="pageStack">
        <div className="pageTitle">
          <div>
            <h2>Голосовой журнал продаж</h2>
            <p className="pageLead">Сводка магазина</p>
          </div>
        </div>
        <div className="actionNotice actionNotice-error" role="alert">{error}</div>
        <DateFilter
          basePath="/daily-report"
          currentPreset={period}
          currentDate={date}
          params={params}
          includeYesterday
        />
      </section>
    );
  }

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <h2>Голосовой журнал продаж</h2>
          <p className="pageLead">Сводка магазина</p>
        </div>
      </div>

      {message ? (
        <div className={`actionNotice actionNotice-${mutation === "success" ? "success" : "error"}`} role="status">
          {message}
        </div>
      ) : null}

      <section className="reportSummaryGrid" aria-label="Итоги за выбранный период">
        <article>
          <span>Выручка</span>
          <strong>{formatCurrency(summary.totalRevenue)}</strong>
        </article>
        <article>
          <span>Количество товаров</span>
          <strong>{formatQuantity(summary.totalQuantity)}</strong>
        </article>
        <article>
          <span>Записей</span>
          <strong>{salesCount}</strong>
        </article>
        <article className={reviewItems.length ? "summaryNeedsReview" : undefined}>
          <span>Нужно проверить</span>
          <strong>{reviewItems.length}</strong>
        </article>
      </section>

      <div className="reportToolbar" aria-label="Действия отчёта">
        <div>
          <span>Период</span>
          <strong>{range.label}</strong>
        </div>
        <div className="summaryActions">
          <RefreshButton />
          {isSingleDay && items.length ? (
            <form action={resetDayRevenueAction}>
              <input type="hidden" name="period" value={period} />
              <input type="hidden" name="date" value={date ?? ""} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <ConfirmSubmitButton
                className="dangerGhostButton"
                confirmMessage="Сбросить выручку за этот день? Все товары дня будут исключены из отчёта, но останутся доступными для восстановления."
              >
                Сбросить день
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <DateFilter
        basePath="/daily-report"
        currentPreset={period}
        currentDate={date}
        params={params}
        includeYesterday
      />

      <section className="itemManager" aria-labelledby="top-products-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Топ товаров</p>
            <h3 id="top-products-heading">Топ товаров</h3>
          </div>
        </div>

        {topRows.length ? (
          <div className="topProductsList">
            {topRows.map((row) => (
              <div className="topProductRow" key={row.key}>
                <div>
                  <strong>{row.product_name}</strong>
                  <span>{formatQuantity(row.quantity)} {row.unit}</span>
                </div>
                <b>{formatCurrency(row.revenue)}</b>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Нет активных товаров за выбранный период"
            description="В топ попадают только подтверждённые позиции, которые входят в выручку."
          />
        )}
      </section>

      <section className="itemManager" id="items" aria-labelledby="period-sales-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Продажи за период</p>
            <h3 id="period-sales-heading">Продажи за период</h3>
          </div>
        </div>

        {processedItems.length ? (
          <div className="itemEditorList">
            {processedItems.map((item) => <SaleItemCard item={item} key={item.id} />)}
          </div>
        ) : (
          <EmptyState
            title="Нет активных продаж"
            description="Подтверждённые голосовые записи появятся здесь после обработки ботом."
          />
        )}
      </section>

      {reviewItems.length ? (
        <section className="itemManager reviewItemsSection" aria-labelledby="review-items-heading">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Нужно проверить</p>
              <h3 id="review-items-heading">Нужно проверить</h3>
            </div>
            <span className="attentionPill">Подтвердить в Telegram</span>
          </div>
          <div className="itemEditorList">
            {reviewItems.map((item) => <SaleItemCard item={item} key={item.id} />)}
          </div>
        </section>
      ) : null}

      {deletedItems.length ? (
        <details className="deletedItemsPanel">
          <summary>Исключённые товары <span>{deletedItems.length}</span></summary>
          <p>Они хранятся в базе, не входят в выручку и могут быть восстановлены.</p>
          <div className="deletedItemsList">
            {deletedItems.map((item) => (
              <div className="deletedItem" key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <span>{item.deleted_reason === "day_reset" ? "Сброс дня" : "Исключено вручную"}</span>
                </div>
                <form action={restoreSaleItemAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="restoreButton">Восстановить</button>
                </form>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
