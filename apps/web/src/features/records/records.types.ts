import type { DateRangePreset, SaleItem, VoiceRecordStatus } from "@voice-sales-log/shared/types";

export type SearchParams = Record<string, string | string[] | undefined>;

export type RecordFilters = {
  period: DateRangePreset;
  date?: string;
  sellerId?: string;
  search?: string;
};

export type ReportFilters = {
  period: DateRangePreset;
  date?: string;
};

export type SellerOption = {
  id: string;
  name: string;
  is_active: boolean;
};

export type RecordListItem = {
  id: string;
  created_at: string;
  sellerName: string;
  cleaned_text: string | null;
  raw_text: string | null;
  status: VoiceRecordStatus;
  total_amount: number;
  audioUrl: string | null;
};

export type EditableReviewItem = SaleItem & {
  saleCreatedAt?: string;
};
