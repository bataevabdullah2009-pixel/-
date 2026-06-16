import { buildSalesReport, filterByDateRange, getDateRange, calculateItemTotal } from "@voice-sales-log/shared/utils/date-range";
import type { DateRangePreset, SaleItem } from "@voice-sales-log/shared/types";
import { getStorageBucket, getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase";
import type { RecordFilters, RecordListItem, ReportFilters, SellerOption } from "./records.types";

const demoSellers: SellerOption[] = [
  {
    id: "demo-seller",
    name: "Магомед",
    is_active: true
  }
];

const now = new Date().toISOString();

const demoRecords: RecordListItem[] = [
  {
    id: "demo-sale",
    created_at: now,
    sellerName: "Магомед",
    cleaned_text: "Хлеб — 3 штуки по 40 рублей, молоко — 2 штуки по 90 рублей.",
    raw_text: "хлеб 3 по 40 молоко 2 по 90",
    status: "processed",
    total_amount: 300,
    audioUrl: null
  }
];

const demoSaleItems: SaleItem[] = [
  {
    id: "demo-item-1",
    sale_id: "demo-sale",
    product_name: "Хлеб",
    quantity: 3,
    unit: "шт",
    price: 40,
    total: 120,
    confidence: 0.95,
    status: "processed",
    created_at: now
  },
  {
    id: "demo-item-2",
    sale_id: "demo-sale",
    product_name: "Молоко",
    quantity: 2,
    unit: "шт",
    price: 90,
    total: 180,
    confidence: 0.95,
    status: "processed",
    created_at: now
  },
  {
    id: "demo-item-3",
    sale_id: "demo-sale",
    product_name: "Чай",
    quantity: 1,
    unit: "шт",
    price: null,
    total: null,
    confidence: 0.7,
    status: "needs_price",
    created_at: now
  }
];

function escapeLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function createSignedAudioUrl(audioPath: string | null, fallbackUrl: string | null) {
  if (!audioPath) {
    return fallbackUrl;
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return fallbackUrl;
  }

  const { data, error } = await admin.storage.from(getStorageBucket()).createSignedUrl(audioPath, 60 * 30);

  if (error) {
    return fallbackUrl;
  }

  return data.signedUrl;
}

export function filtersFromParams(params: {
  period?: DateRangePreset;
  date?: string;
  sellerId?: string;
  search?: string;
}): RecordFilters {
  return {
    period: params.period ?? "today",
    date: params.date,
    sellerId: params.sellerId,
    search: params.search
  };
}

export async function getSellers(): Promise<SellerOption[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return demoSellers;
  }

  const { data, error } = await supabase
    .from("sellers")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((seller: any) => ({
    id: String(seller.id),
    name: seller.name || "Без имени",
    is_active: Boolean(seller.is_active)
  }));
}

export async function getRecords(filters: RecordFilters): Promise<RecordListItem[]> {
  const range = getDateRange(filters.period, { date: filters.date });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    let records = filterByDateRange(demoRecords, range);

    if (filters.search) {
      const search = filters.search.toLocaleLowerCase("ru-RU");
      records = records.filter((record) =>
        `${record.cleaned_text ?? ""} ${record.raw_text ?? ""}`.toLocaleLowerCase("ru-RU").includes(search)
      );
    }

    return records;
  }

  let query = supabase
    .from("sales")
    .select(
      `
      id,
      raw_text,
      cleaned_text,
      total_amount,
      status,
      created_at,
      sellers ( id, name ),
      voice_records ( audio_path, audio_url )
    `
    )
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false });

  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }

  if (filters.search) {
    const search = escapeLike(filters.search);
    query = query.or(`raw_text.ilike.%${search}%,cleaned_text.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return Promise.all(
    (data ?? []).map(async (sale: any) => {
      const seller = Array.isArray(sale.sellers) ? sale.sellers[0] : sale.sellers;
      const voiceRecord = Array.isArray(sale.voice_records) ? sale.voice_records[0] : sale.voice_records;

      return {
        id: String(sale.id),
        created_at: String(sale.created_at),
        sellerName: seller?.name || "Без имени",
        cleaned_text: sale.cleaned_text,
        raw_text: sale.raw_text,
        status: sale.status,
        total_amount: Number(sale.total_amount ?? 0),
        audioUrl: await createSignedAudioUrl(voiceRecord?.audio_path ?? null, voiceRecord?.audio_url ?? null)
      };
    })
  );
}

export async function getDailyReport(filters: ReportFilters) {
  const range = getDateRange(filters.period, { date: filters.date });
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      range,
      summary: buildSalesReport(filterByDateRange(demoSaleItems, range))
    };
  }

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      created_at,
      sale_items (
        id,
        sale_id,
        product_id,
        product_name,
        quantity,
        unit,
        price,
        total,
        confidence,
        status,
        created_at
      )
    `
    )
    .gte("created_at", range.start)
    .lt("created_at", range.end);

  if (error) {
    return {
      range,
      summary: buildSalesReport([])
    };
  }

  const items = (data ?? []).flatMap((sale: any) =>
    (sale.sale_items ?? []).map((item: any) => ({
      id: String(item.id),
      sale_id: String(item.sale_id),
      product_id: item.product_id,
      product_name: String(item.product_name),
      quantity: Number(item.quantity),
      unit: String(item.unit),
      price: item.price === null ? null : Number(item.price),
      total: item.total === null ? null : Number(item.total),
      confidence: Number(item.confidence),
      status: item.status,
      created_at: String(sale.created_at)
    }))
  );

  return {
    range,
    summary: buildSalesReport(items)
  };
}

export async function updateSaleItem(params: {
  itemId: string;
  quantity: number;
  price: number | null;
}) {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY не настроен."
    };
  }

  const total = calculateItemTotal(params.quantity, params.price);
  const status = params.price === null ? "needs_price" : "processed";

  const { data: item, error } = await admin
    .from("sale_items")
    .update({
      quantity: params.quantity,
      price: params.price,
      total,
      status,
      confidence: status === "processed" ? 1 : 0.5
    })
    .eq("id", params.itemId)
    .select("sale_id")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const { data: saleItems } = await admin
    .from("sale_items")
    .select("status, total")
    .eq("sale_id", item.sale_id);

  const totalAmount = Number(
    (saleItems ?? [])
      .filter((saleItem: any) => saleItem.status === "processed" && saleItem.total !== null)
      .reduce((sum: number, saleItem: any) => sum + Number(saleItem.total), 0)
      .toFixed(2)
  );
  const saleStatus = (saleItems ?? []).every((saleItem: any) => saleItem.status === "processed")
    ? "processed"
    : "needs_review";

  await admin
    .from("sales")
    .update({
      total_amount: totalAmount,
      status: saleStatus
    })
    .eq("id", item.sale_id);

  return {
    ok: true,
    message: "Позиция обновлена."
  };
}
