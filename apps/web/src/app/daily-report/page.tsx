import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { getDailyReport } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import { formatCurrency, formatQuantity, getPreset, getStatusLabel } from "@/features/records/records.utils";
import { updateSaleItemAction } from "./actions";

export const dynamic = "force-dynamic";

type DailyReportPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function DailyReportPage({ searchParams }: DailyReportPageProps) {
  const params = await searchParams;
  const period = getPreset(params.period);
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const { range, summary } = await getDailyReport({ period, date });

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">{range.label}</p>
          <h2>Отчёт за день</h2>
        </div>
        <div className="totalBadge">{formatCurrency(summary.totalRevenue)}</div>
      </div>

      <DateFilter
        basePath="/daily-report"
        currentPreset={period}
        currentDate={date}
        params={params}
        includeYesterday
      />

      {summary.rows.length ? (
        <div className="tableShell">
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
      ) : (
        <EmptyState title="Продаж за период нет" description="Когда продавец отправит голосовое, итог появится здесь." />
      )}

      <section className="reviewBlock">
        <div className="sectionHeading">
          <h3>Нужно проверить</h3>
          <span>{summary.reviewItems.length}</span>
        </div>

        {summary.reviewItems.length ? (
          <div className="reviewList">
            {summary.reviewItems.map((item) => (
              <form key={item.id} action={updateSaleItemAction} className="reviewItem">
                <input type="hidden" name="itemId" value={item.id} />
                <div>
                  <strong>{item.product_name || "Без названия"}</strong>
                  <p>
                    {getStatusLabel(item.status)} · уверенность {Math.round(item.confidence * 100)}%
                  </p>
                </div>
                <label>
                  Товар
                  <input name="productName" type="text" defaultValue={item.product_name} required />
                </label>
                <label>
                  Кол-во
                  <input name="quantity" type="number" min="0.001" step="0.001" defaultValue={item.quantity} required />
                </label>
                <label>
                  Цена
                  <input name="price" type="number" min="0" step="0.01" defaultValue={item.price ?? ""} required />
                </label>
                <button type="submit">Сохранить</button>
              </form>
            ))}
          </div>
        ) : (
          <p className="mutedText">Нет позиций без цены или с низкой уверенностью.</p>
        )}
      </section>
    </section>
  );
}
