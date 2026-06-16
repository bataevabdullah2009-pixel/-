import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/EmptyState";
import { RecordCard } from "@/components/RecordCard";
import { SellerFilter } from "@/components/SellerFilter";
import { getRecords, getSellers } from "@/features/records/records.api";
import type { SearchParams } from "@/features/records/records.types";
import { getPreset, getStringParam } from "@/features/records/records.utils";

export const dynamic = "force-dynamic";

type RecordsPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const params = await searchParams;
  const period = getPreset(params.period);
  const date = getStringParam(params.date);
  const sellerId = getStringParam(params.sellerId);
  const search = getStringParam(params.search);
  const [sellers, records] = await Promise.all([
    getSellers(),
    getRecords({
      period,
      date,
      sellerId,
      search
    })
  ]);

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">Журнал</p>
          <h2>Записи продавцов</h2>
        </div>
      </div>

      <DateFilter basePath="/records" currentPreset={period} currentDate={date} params={params} />

      <div className="filtersRow">
        <SellerFilter sellers={sellers} currentSellerId={sellerId} params={params} />
        <form className="inlineForm" action="/records">
          <input type="hidden" name="period" value={period} />
          {date ? <input type="hidden" name="date" value={date} /> : null}
          {sellerId ? <input type="hidden" name="sellerId" value={sellerId} /> : null}
          <input name="search" placeholder="Поиск по тексту" defaultValue={search ?? ""} />
          <button type="submit">Найти</button>
        </form>
      </div>

      {records.length ? (
        <div className="recordsList">
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <EmptyState title="Записей нет" description="Попробуйте другой период, продавца или поисковую строку." />
      )}
    </section>
  );
}
