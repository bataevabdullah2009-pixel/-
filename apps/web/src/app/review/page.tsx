import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { SaleItemCard } from "@/components/SaleItemCard";
import {
  getCurrentShopName,
  getRecords
} from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import {
  formatCurrency,
  getPreset,
  getStringParam
} from "@/features/records/records.utils";
import { formatDate, formatTime } from "@/lib/date";
import {
  cancelReviewSaleAction,
  confirmReviewSaleAction
} from "./actions";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  searchParams: Promise<SearchParams>;
};

function isReviewRecord(record: Awaited<ReturnType<typeof getRecords>>["records"][number]) {
  return (
    record.status === "needs_review" ||
    record.status === "needs_price" ||
    record.items.some((item) => item.status === "needs_review" || item.status === "needs_price")
  );
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const period = getPreset(params.period);
  const date = getStringParam(params.date);
  const search = getStringParam(params.search);
  const returnQuery = new URLSearchParams({ period });
  if (date) returnQuery.set("date", date);
  if (search) returnQuery.set("search", search);
  const returnTo = `/review?${returnQuery.toString()}`;
  const [shopName, recordsResult] = await Promise.all([
    getCurrentShopName(),
    getRecords({ period, date, search })
  ]);
  const mutation = getStringParam(params.mutation);
  const message = getStringParam(params.message);
  const reviewRecords = recordsResult.records.filter(isReviewRecord);

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">{shopName}</p>
          <h2>Проверка</h2>
        </div>
      </div>

      {message ? (
        <div className={`actionNotice actionNotice-${mutation === "success" ? "success" : "error"}`} role="status">
          {message}
        </div>
      ) : null}

      <DateFilter basePath="/review" currentPreset={period} currentDate={date} params={params} includeYesterday />

      <form className="inlineForm reviewSearch" action="/review">
        <input type="hidden" name="period" value={period} />
        {date ? <input type="hidden" name="date" value={date} /> : null}
        <input name="search" placeholder="Поиск по тексту" defaultValue={search ?? ""} />
        <button type="submit">Найти</button>
      </form>

      {recordsResult.error ? (
        <div className="actionNotice actionNotice-error" role="alert">{recordsResult.error}</div>
      ) : null}

      {reviewRecords.length ? (
        <div className="reviewRecordList">
          {reviewRecords.map((record) => {
            const activeItems = record.items.filter((item) => !item.deleted_at && item.status !== "excluded");

            return (
              <article className="reviewRecordCard" key={record.id}>
                <div className="reviewRecordHeader">
                  <div>
                    <span>{formatDate(record.created_at)} · {formatTime(record.created_at)}</span>
                    <h3>{record.sellerName}</h3>
                  </div>
                  <strong>{formatCurrency(record.total_amount)}</strong>
                </div>

                <p className="reviewParsedText">{record.cleaned_text || record.raw_text || "Текст требует проверки."}</p>

                {activeItems.length ? (
                  <div className="itemEditorList">
                    {activeItems.map((item) => <SaleItemCard item={item} key={item.id} />)}
                  </div>
                ) : (
                  <EmptyState
                    title="Нет активных товаров"
                    description="Запись можно отменить или восстановить товары в отчёте."
                  />
                )}

                <div className="reviewDecisionActions">
                  <form action={confirmReviewSaleAction}>
                    <input type="hidden" name="saleId" value={record.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="saveButton">Подтвердить</button>
                  </form>
                  <form action={cancelReviewSaleAction}>
                    <input type="hidden" name="saleId" value={record.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="deleteConfirmButton">Отмена</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      ) : recordsResult.error ? null : (
        <EmptyState title="Нет записей на проверку" description="Сомнительные голосовые продажи появятся здесь." />
      )}
    </section>
  );
}

