import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { RefreshButton } from "@/components/RefreshButton";
import { getReport } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import type { SaleItem } from "@voice-sales-log/shared/types";
import {
  formatCurrency,
  formatQuantity,
  getReportFilters,
  getStatusLabel,
  getStringParam
} from "@/features/records/records.utils";
import {
  excludeSaleItemAction,
  resetDayRevenueAction,
  restoreSaleItemAction,
  updateSaleItemAction
} from "./actions";

export const dynamic = "force-dynamic";

type DailyReportPageProps = {
  searchParams: Promise<SearchParams>;
};

function SaleItemEditor({ item, returnTo }: { item: SaleItem; returnTo: string }) {
  return (
    <article className={`itemEditorCard ${item.status !== "processed" ? "itemEditorCardAttention" : ""}`}>
      <div className="itemEditorHeader">
        <div>
          <strong>{item.product_name || "Без названия"}</strong>
          <span>{item.total === null ? "Не входит в выручку" : formatCurrency(item.total)}</span>
        </div>
        <span className={`status status-${item.status}`}>{getStatusLabel(item.status)}</span>
      </div>

      <form action={updateSaleItemAction} className="itemEditForm">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="productField">
          <span>Товар</span>
          <input name="productName" type="text" defaultValue={item.product_name} required />
        </label>
        <label>
          <span>Количество</span>
          <input name="quantity" type="number" min="0.001" step="0.001" defaultValue={item.quantity} required />
        </label>
        <label>
          <span>Цена, ₽</span>
          <input name="price" type="number" min="0.01" step="0.01" defaultValue={item.price ?? ""} required />
        </label>
        <button type="submit" className="saveButton">Сохранить</button>
      </form>

      <form action={excludeSaleItemAction} className="deleteItemForm">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <ConfirmSubmitButton
          className="textDangerButton"
          confirmMessage={`Исключить «${item.product_name}» из количества и выручки? Позицию можно будет восстановить.`}
        >
          Исключить из отчёта
        </ConfirmSubmitButton>
      </form>
    </article>
  );
}

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
  const reviewItems = items.filter((item) => item.status === "needs_review" || item.status === "needs_price");
  const processedItems = items.filter((item) => item.status === "processed");

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">Сводка магазина</p>
          <h2>Продажи и выручка</h2>
          <p className="pageLead">Проверьте распознанные товары, исправьте цену или исключите ошибочную позицию.</p>
        </div>
      </div>

      {message ? (
        <div className={`actionNotice actionNotice-${mutation === "success" ? "success" : "error"}`} role="status">
          {message}
        </div>
      ) : null}

      {error ? <div className="actionNotice actionNotice-error" role="alert">{error}</div> : null}

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

      {summary.rows.length ? (
        <>
          <div className="tableShell reportTable">
            <table>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className="numberCell">Количество</th>
                  <th className="numberCell">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.product_name}</td>
                    <td className="numberCell">
                      {formatQuantity(row.quantity)} {row.unit}
                    </td>
                    <td className="numberCell">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
                <tr className="totalRow">
                  <td>Итого</td>
                  <td className="numberCell">{formatQuantity(summary.totalQuantity)}</td>
                  <td className="numberCell">{formatCurrency(summary.totalRevenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="reportCards">
            {summary.rows.map((row) => (
              <article className="reportCard" key={row.key}>
                <div className="reportCardIcon" aria-hidden="true">{row.product_name.slice(0, 1)}</div>
                <div>
                  <h3>{row.product_name}</h3>
                  <span>{formatQuantity(row.quantity)} {row.unit}</span>
                </div>
                <strong>{formatCurrency(row.revenue)}</strong>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState title="Нет активных продаж" description="Отправьте голосовое боту или восстановите исключённые позиции ниже." />
      )}

      <section className="itemManager" id="items">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Контроль данных</p>
            <h3>Записанные товары</h3>
          </div>
          <span className={summary.reviewItems.length ? "attentionPill" : "clearPill"}>
            {summary.reviewItems.length ? `Проверить: ${summary.reviewItems.length}` : "Всё проверено"}
          </span>
        </div>

        {items.length ? (
          <div className="itemEditorGroups">
            {reviewItems.length ? (
              <section className="itemEditorGroup" aria-labelledby="review-items-heading">
                <h4 id="review-items-heading">Нужно проверить</h4>
                <div className="itemEditorList">
                  {reviewItems.map((item) => <SaleItemEditor item={item} returnTo={returnTo} key={item.id} />)}
                </div>
              </section>
            ) : null}
            {processedItems.length ? (
              <section className="itemEditorGroup" aria-labelledby="processed-items-heading">
                <h4 id="processed-items-heading">Обработанные товары</h4>
                <div className="itemEditorList">
                  {processedItems.map((item) => <SaleItemEditor item={item} returnTo={returnTo} key={item.id} />)}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="mutedText">Активных товаров за выбранный период нет.</p>
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
