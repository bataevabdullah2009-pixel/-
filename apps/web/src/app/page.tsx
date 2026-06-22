import DailyReportPage from "./daily-report/page";
import type { SearchParams } from "@/features/records/records.types";

export default function HomePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <DailyReportPage searchParams={searchParams} />;
}
