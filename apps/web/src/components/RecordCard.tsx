import { formatDate, formatTime } from "@/lib/date";
import type { RecordListItem } from "@/features/records/records.types";
import { formatCurrency, getStatusLabel } from "@/features/records/records.utils";

type RecordCardProps = {
  record: RecordListItem;
};

export function RecordCard({ record }: RecordCardProps) {
  return (
    <article className="recordCard">
      <div className="recordCardHeader">
        <div>
          <div className="recordDate">{formatDate(record.created_at)} · {formatTime(record.created_at)}</div>
          <h2>{record.sellerName}</h2>
        </div>
        <span className={`status status-${record.status}`}>{getStatusLabel(record.status)}</span>
      </div>

      <p className="recordText">{record.cleaned_text || record.raw_text || "Текст требует проверки."}</p>

      <div className="recordFooter">
        <span>{formatCurrency(record.total_amount)}</span>
        {record.audioUrl ? (
          <a href={record.audioUrl} className="secondaryButton" target="_blank" rel="noreferrer">
            Прослушать аудио
          </a>
        ) : null}
      </div>
    </article>
  );
}
