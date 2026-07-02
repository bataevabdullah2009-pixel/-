import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { SaleItemCard } from "@/components/SaleItemCard";
import { getCurrentShopName, getReviewItems } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import {
  formatCurrency,
  getReportFilters,
  getStringParam
} from "@/features/records/records.utils";
import {
  cancelReviewSaleAction,
  confirmAllReviewSalesAction,
  confirmReviewSaleAction
} from "./actions";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const filters = getReportFilters(params);
  const shopName = await getCurrentShopName();
  const reviewItems = await getReviewItems(filters);
  const mutation = getStringParam(params.mutation);
  const message = getStringParam(params.message);
  const returnQuery = new URLSearchParams({ period: filters.period });
  if (filters.date) returnQuery.set("date", filters.date);
  const returnTo = `/review?${returnQuery.toString()}`;
  const saleIds = [...new Set(reviewItems.map((item) => item.sale_id))];
  const reviewTotal = reviewItems.reduce((sum, item) => sum + (item.total ?? 0), 0);

  return (
    <section className="pageStack">
      <div className="pageTitle compactTitle">
        <div>
          <p className="eyebrow">{shopName}</p>
          <h2>Проверка</h2>
          <p className="pageLead">Сомнительные позиции до подтверждения не входят в выручку.</p>
        </div>
        {saleIds.length ? (
          <form action={confirmAllReviewSalesAction} className="reviewBulkForm">
            <input type="hidden" name="returnTo" value={returnTo} />
            {saleIds.map((saleId) => (
              <input type="hidden" name="saleId" value={saleId} key={saleId} />
            ))}
            <button type="submit" className="goldActionButton">Подтвердить всё</button>
          </form>
        ) : null}
      </div>

      {message ? (
        <div className={`actionNotice actionNotice-${mutation === "success" ? "success" : "error"}`} role="status">
          {message}
        </div>
      ) : null}

      <DateFilter
        basePath="/review"
        currentPreset={filters.period}
        currentDate={filters.date}
        params={params}
        includeYesterday
      />

      <section className="reviewSummaryStrip" aria-label="Сводка проверки">
        <div>
          <span>Позиций</span>
          <strong>{reviewItems.length}</strong>
        </div>
        <div>
          <span>Записей</span>
          <strong>{saleIds.length}</strong>
        </div>
        <div>
          <span>Потенциальная сумма</span>
          <strong>{formatCurrency(reviewTotal)}</strong>
        </div>
      </section>

      {reviewItems.length ? (
        <div className="reviewRecordList">
          {reviewItems.map((item) => (
            <article className="reviewDecisionCard" key={item.id}>
              <SaleItemCard item={item} />
              <div className="reviewDecisionActions">
                <form action={confirmReviewSaleAction}>
                  <input type="hidden" name="saleId" value={item.sale_id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="successActionButton">Подтвердить</button>
                </form>
                <form action={cancelReviewSaleAction}>
                  <input type="hidden" name="saleId" value={item.sale_id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="dangerGhostButton">Отмена</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Нет позиций на проверку"
          description="Сомнительные товары появятся здесь после голосовой записи со статусом проверки."
        />
      )}
    </section>
  );
}
