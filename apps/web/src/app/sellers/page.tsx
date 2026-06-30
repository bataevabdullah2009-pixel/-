import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { getSellerStats } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import {
  formatCurrency,
  getReportFilters
} from "@/features/records/records.utils";

export const dynamic = "force-dynamic";

type SellersPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function SellersPage({ searchParams }: SellersPageProps) {
  const params = await searchParams;
  const filters = getReportFilters(params);
  const { sellers, error } = await getSellerStats(filters);

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">Команда</p>
          <h2>Продавцы</h2>
        </div>
      </div>

      <DateFilter
        basePath="/sellers"
        currentPreset={filters.period}
        currentDate={filters.date}
        params={params}
        includeYesterday
      />

      {error ? <div className="actionNotice actionNotice-error" role="alert">{error}</div> : null}

      {sellers.length ? (
        <div className="sellerList">
          {sellers.map((seller) => (
            <article key={seller.id} className="sellerRow sellerStatsRow">
              <div>
                <strong>{seller.name}</strong>
                <p>{seller.is_active ? "Активен" : "Отключён"}</p>
              </div>
              <div className="sellerMetrics">
                <span>
                  <b>{seller.recordsCount}</b>
                  записей
                </span>
                <span>
                  <b>{formatCurrency(seller.revenue)}</b>
                  выручка
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : error ? null : (
        <EmptyState title="Продавцов нет" description="Продавец появится после команды /start в Telegram-боте." />
      )}
    </section>
  );
}
