export type VoiceRecordStatus = "pending" | "processed" | "needs_review" | "failed";

export type SaleItemStatus = "processed" | "needs_price" | "needs_review" | "failed";

export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "year" | "custom";

export type Seller = {
  id: string;
  name: string | null;
  telegram_id?: number;
  is_active?: boolean;
  created_at?: string;
};

export type VoiceRecord = {
  id: string;
  shop_id: string;
  seller_id: string;
  telegram_message_id: string | null;
  audio_url: string | null;
  raw_text: string | null;
  cleaned_text: string | null;
  status: VoiceRecordStatus;
  error_message: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  shop_id: string;
  seller_id: string | null;
  voice_record_id: string | null;
  raw_text: string | null;
  cleaned_text: string | null;
  total_amount: number;
  status: VoiceRecordStatus;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  price: number | null;
  total: number | null;
  confidence: number;
  status: SaleItemStatus;
  created_at: string;
};

export type ParsedSaleItem = {
  product_name: string;
  quantity?: number | null;
  unit?: string | null;
  price: number | null;
  total: number | null;
  confidence: number;
};

export type ParsedSale = {
  items: ParsedSaleItem[];
  raw_text: string;
  cleaned_text: string;
  needs_review: boolean;
};

export type ReportRow = {
  key: string;
  product_name: string;
  quantity: number;
  unit: string;
  revenue: number;
};

export type ReportSummary = {
  rows: ReportRow[];
  reviewItems: SaleItem[];
  totalQuantity: number;
  totalRevenue: number;
};
