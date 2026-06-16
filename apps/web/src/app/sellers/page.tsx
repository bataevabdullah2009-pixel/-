import { EmptyState } from "@/components/EmptyState";
import { getSellers } from "@/features/records/records.api";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const sellers = await getSellers();

  return (
    <section className="pageStack">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">Команда</p>
          <h2>Продавцы</h2>
        </div>
      </div>

      {sellers.length ? (
        <div className="sellerList">
          {sellers.map((seller) => (
            <article key={seller.id} className="sellerRow">
              <div>
                <strong>{seller.name}</strong>
                <p>{seller.is_active ? "Активен" : "Отключён"}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Продавцов нет" description="Продавец появится после команды /start в Telegram-боте." />
      )}
    </section>
  );
}
