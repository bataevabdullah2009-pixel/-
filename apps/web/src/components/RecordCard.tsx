import Link from "next/link";
import { dateInputValue, formatDate, formatTime } from "@/lib/date";
import type { RecordListItem } from "@/features/records/records.types";
import { formatCurrency, getStatusLabel } from "@/features/records/records.utils";

type RecordCardProps = {
  record: RecordListItem;
};

export function RecordCard({ record }: RecordCardProps) {
  const recordDate = dateInputValue(record.created_at);

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
        <strong className="recordAmount">{formatCurrency(record.total_amount)}</strong>
        <div className="recordActions">
          {record.audioUrl ? (
            <a href={record.audioUrl} className="secondaryButton" target="_blank" rel="noreferrer">
              Прослушать аудио
            </a>
          ) : null}
          <Link href={`/daily-report?period=custom&date=${recordDate}#items`} className="correctionButton">
            Товары и цены
          </Link>
        </div>
      </div>
    </article>
  );
}
