import { formatDate, formatTime } from "@/lib/date";
import type { RecordListItem } from "@/features/records/records.types";
import { formatCurrency, formatQuantity, getStatusLabel } from "@/features/records/records.utils";

type RecordCardProps = {
  record: RecordListItem;
};

export function RecordCard({ record }: RecordCardProps) {
  const needsTelegramConfirmation = record.status === "needs_review" || record.status === "needs_price";

  return (
    <article className="recordCard">
      <div className="recordCardHeader">
        <div>
          <div className="recordDate">{formatDate(record.created_at)} · {formatTime(record.created_at)}</div>
          <h2>{record.sellerName}</h2>
        </div>
        <div className="recordStatusStack">
          <span className={`status status-${record.status}`}>{getStatusLabel(record.status)}</span>
          {needsTelegramConfirmation ? (
            <span className="telegramReviewBadge">Нужно проверить</span>
          ) : null}
        </div>
      </div>

      <p className="recordText">{record.cleaned_text || record.raw_text || "Текст требует проверки."}</p>

      <div className="recordFooter">
        <strong className="recordAmount">{formatCurrency(record.total_amount)}</strong>
        <div className="recordActions">
          {record.audioUrl ? (
            <a href={record.audioUrl} className="secondaryButton" target="_blank" rel="noreferrer">
              Прослушать аудио
            </a>
          ) : null}
        </div>
      </div>

      {record.items.length ? (
        <details className="recordItemsDisclosure">
          <summary>Товары <span>{record.items.length}</span></summary>
          <div className="recordItemsList">
            {record.items.map((item) => (
              <div className="recordItemRow" key={item.id}>
                <div>
                  <strong>{item.product_name || "Без названия"}</strong>
                  <span>
                    {formatQuantity(item.quantity)} {item.unit}
                    {item.price === null ? "" : ` × ${formatCurrency(item.price)}`}
                  </span>
                </div>
                <b>{item.total === null ? "Не входит" : formatCurrency(item.total)}</b>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}
