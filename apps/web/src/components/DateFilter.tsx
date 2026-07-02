import Link from "next/link";
import { todayInputValue } from "@/lib/date";
import type { DateRangePreset } from "@voice-sales-log/shared/types";
import type { SearchParams } from "@/features/records/records.types";
import { buildHref } from "@/features/records/records.utils";

type DateFilterProps = {
  basePath: string;
  currentPreset: DateRangePreset;
  currentDate?: string;
  params: SearchParams;
  includeYesterday?: boolean;
};

const basePresets: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" }
];

export function DateFilter({ basePath, currentPreset, currentDate, params, includeYesterday }: DateFilterProps) {
  const presets = includeYesterday
    ? [basePresets[0], { value: "yesterday" as const, label: "Вчера" }, ...basePresets.slice(1)]
    : basePresets;

  return (
    <div className="filterBlock" aria-label="Фильтр по дате">
      <div className="segmentedControl">
        {presets.map((preset) => (
          <Link
            key={preset.value}
            href={buildHref(basePath, params, { period: preset.value, date: undefined })}
            className={currentPreset === preset.value ? "activeSegment" : ""}
          >
            {preset.label}
          </Link>
        ))}
      </div>

      <form className="inlineForm" action={basePath}>
        <input type="hidden" name="period" value="custom" />
        <input type="date" name="date" defaultValue={currentDate ?? todayInputValue()} aria-label="Выбор даты" />
        <button type="submit">Дата</button>
      </form>
    </div>
  );
}
