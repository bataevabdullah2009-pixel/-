import type { SearchParams, SellerOption } from "@/features/records/records.types";
import { getStringParam } from "@/features/records/records.utils";

type SellerFilterProps = {
  sellers: SellerOption[];
  currentSellerId?: string;
  params: SearchParams;
};

export function SellerFilter({ sellers, currentSellerId, params }: SellerFilterProps) {
  return (
    <form className="inlineForm" action="/records">
      <input type="hidden" name="period" value={getStringParam(params.period) ?? "today"} />
      {getStringParam(params.date) ? <input type="hidden" name="date" value={getStringParam(params.date)} /> : null}
      {getStringParam(params.search) ? <input type="hidden" name="search" value={getStringParam(params.search)} /> : null}
      <select name="sellerId" defaultValue={currentSellerId ?? ""} aria-label="Продавец">
        <option value="">Все продавцы</option>
        {sellers.map((seller) => (
          <option key={seller.id} value={seller.id}>
            {seller.name}
          </option>
        ))}
      </select>
      <button type="submit">Применить</button>
    </form>
  );
}
