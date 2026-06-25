import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { RefreshButton } from "@/components/RefreshButton";
import { SaleItemCard } from "@/components/SaleItemCard";
import { getReport } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import { isRevenueSaleItemStatus } from "@voice-sales-log/shared/utils/date-range";
import {
  formatCurrency,
  formatQuantity,
  getReportFilters,
  getStringParam
} from "@/features/records/records.utils";
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
  const { range, summary, items, deletedItems, error } = await getReport(filters);
  const returnQuery = new URLSearchParams({ period });
  if (date) returnQuery.set("date", date);
  const returnTo = `/daily-report?${returnQuery.toString()}#items`;
  const isSingleDay = period === "today" || period === "yesterday" || period === "custom";
  const reviewItems = summary.reviewItems;
  const processedItems = items.filter((item) => isRevenueSaleItemStatus(item.status));

  if (error) {
    return (
      <section className="pageStack">
        <div className="pageTitle">
          <div>
            <p className="eyebrow">Сводка магазина</p>
            <h2>Продажи и выручка</h2>
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
          <p className="eyebrow">Сводка магазина</p>
          <h2>Продажи и выручка</h2>
          <p className="pageLead">Редактируйте распознанные товары прямо в карточках — итоги обновятся автоматически.</p>
        </div>
      </div>

      {message ? (
        <div className={`actionNotice actionNotice-${mutation === "success" ? "success" : "error"}`} role="status">
          {message}
        </div>
      ) : null}

      <aside className="summaryBar" aria-label="Итоги за выбранный период">
        <div className="summaryPeriod">
          <span>Период</span>
          <strong>{range.label}</strong>
        </div>
        <div className="summaryMetrics">
          <div>
            <span>Выручка</span>
            <strong>{formatCurrency(summary.totalRevenue)}</strong>
          </div>
          <div>
            <span>Количество</span>
            <strong>{formatQuantity(summary.totalQuantity)}</strong>
          </div>
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
      </aside>

      <DateFilter
        basePath="/daily-report"
        currentPreset={period}
        currentDate={date}
        params={params}
        includeYesterday
      />

      <section className="itemManager" id="items">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Товары за период</p>
            <h3>Позиции отчёта</h3>
          </div>
          <span className={summary.reviewItems.length ? "attentionPill" : "clearPill"}>
            {summary.reviewItems.length ? `Нужно проверить: ${summary.reviewItems.length}` : "Всё проверено"}
          </span>
        </div>

        {items.length ? (
          <div className="itemEditorGroups">
            {reviewItems.length ? (
              <section className="itemEditorGroup" aria-labelledby="review-items-heading">
                <h4 id="review-items-heading">Нужно проверить</h4>
                <div className="itemEditorList">
                  {reviewItems.map((item) => <SaleItemCard item={item} key={item.id} />)}
                </div>
              </section>
            ) : null}
            {processedItems.length ? (
              <section className="itemEditorGroup" aria-labelledby="processed-items-heading">
                <h4 id="processed-items-heading">Готовые продажи</h4>
                <div className="itemEditorList">
                  {processedItems.map((item) => <SaleItemCard item={item} key={item.id} />)}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Нет активных товаров за выбранный период"
            description="Новые продажи появятся здесь после сохранения ботом. Исключённые позиции можно восстановить ниже."
          />
        )}
      </section>

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
