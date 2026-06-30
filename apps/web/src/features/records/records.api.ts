import "server-only";

import {
  buildExcludedSaleItemPatch,
  buildManualSaleItemPatch,
  buildSalesReport,
  calculateItemTotal,
  displayProductName,
  filterByDateRange,
  getDateRange,
  isMeaningfulProductName,
  isRevenueSaleItemStatus,
  normalizeProductName,
  normalizeUnit
} from "@voice-sales-log/shared/utils/date-range";
import type { DateRangePreset, SaleItem } from "@voice-sales-log/shared/types";
import {
  OwnerAccessError,
  requireOwner,
  requireShopAccess,
  type OwnerContext
} from "@/lib/owner-auth";
import { getStorageBucket, getSupabaseAdminClient } from "@/lib/supabase";
import { getTelegramAuthErrorReason } from "@/lib/telegram-auth-errors";
import type { RecordFilters, RecordListItem, ReportFilters, SellerOption, SellerStats } from "./records.types";
import {
  partitionSaleItems,
  scopeReportRows,
  type ReportSaleItemRow,
  type ReportSaleRow
} from "./report-scope";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type MutationResult = {
  ok: boolean;
  message: string;
  statusCode?: 401 | 403 | 404 | 422 | 500;
  code?: string;
  item?: {
    id: string;
    sale_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    price: number | null;
    total: number | null;
    status: string;
    updated_at: string;
  };
  itemId?: string;
};

function mutationError(
  message: string,
  statusCode: NonNullable<MutationResult["statusCode"]>,
  code: string
): MutationResult {
  return { ok: false, message, statusCode, code };
}

function authMutationError(error: unknown): MutationResult | null {
  if (!(error instanceof OwnerAccessError)) {
    return null;
  }

  if (error.code === "TELEGRAM_INIT_DATA_MISSING" || error.code === "TELEGRAM_INIT_DATA_INVALID") {
    return mutationError("Telegram-сессия недействительна. Откройте WebApp заново.", 401, error.code);
  }

  if (error.code === "SELLER_NOT_LINKED" || error.code === "SELLER_INACTIVE" || error.code === "SHOP_NOT_FOUND") {
    return mutationError("Нет доступа к этому магазину.", 403, error.code);
  }

  return mutationError("Не удалось выполнить действие.", 500, error.code);
}

function isSupabaseNotFound(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "PGRST116" || error?.message?.toLocaleLowerCase("en-US").includes("0 rows");
}

const demoSellers: SellerOption[] = [
  {
    id: "demo-seller",
    name: "Магомед",
    is_active: true
  }
];

const now = new Date().toISOString();

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

const demoRecords: RecordListItem[] = [
  {
    id: "demo-sale",
    created_at: now,
    sellerName: "Магомед",
    cleaned_text: "Хлеб — 3 штуки по 40 рублей, молоко — 2 штуки по 90 рублей.",
    raw_text: "хлеб 3 по 40 молоко 2 по 90",
    status: "processed",
    total_amount: 300,
    audioUrl: null,
    items: demoSaleItems
  }
];

function escapeLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function logServerError(operation: string, error: unknown) {
  if (error instanceof OwnerAccessError && error.code !== "AUTH_MISCONFIGURED") {
    console.info(`[records] ${operation} access pending`, { code: error.code });
    return;
  }

  console.error(`[records] ${operation} failed`, error);
}

function reportLoadMessage(error: unknown) {
  if (error instanceof OwnerAccessError) {
    if (error.code === "TELEGRAM_INIT_DATA_MISSING") {
      return "Telegram-сессия не передана. Откройте WebApp внутри Telegram.";
    }
    if (error.code === "TELEGRAM_INIT_DATA_INVALID") {
      return "Telegram-сессия недействительна или устарела. Закройте WebApp и откройте отчёт заново.";
    }
    if (error.code === "SELLER_NOT_LINKED") return "Ваш Telegram не привязан к магазину";
    if (error.code === "SELLER_INACTIVE") return "Доступ к магазину отключён";
    if (error.code === "SHOP_NOT_FOUND") return "Магазин не найден";
  }

  return "Не удалось загрузить отчёт.";
}

function logReportResult(params: {
  owner: OwnerContext | null;
  range: { start: string; end: string };
  salesCount: number;
  saleItemsCount: number;
  error: unknown | null;
}) {
  const errorCode = (params.error as { code?: string } | null)?.code;
  console.info("webapp report", {
    telegramUserId: params.owner?.telegramId ?? null,
    sellerId: params.owner?.sellerId ?? null,
    shopId: params.owner?.shopId ?? null,
    salesCount: params.salesCount,
    saleItemsCount: params.saleItemsCount,
    dateRange: params.range,
    errorReason: params.error
      ? errorCode || getTelegramAuthErrorReason(params.error)
      : null
  });
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
  try {
    const owner = await requireOwner();
    const admin = getSupabaseAdminClient();

    if (owner.shopId === "demo-shop" && !admin) {
      return demoSellers;
    }

    if (!admin) throw new Error("Supabase admin client is not configured.");
    const { data, error } = await admin
      .from("sellers")
      .select("id, name, is_active")
      .eq("shop_id", owner.shopId)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((seller: any) => ({
      id: String(seller.id),
      name: seller.name || "Без имени",
      is_active: Boolean(seller.is_active)
    }));
  } catch (error) {
    logServerError("getSellers", error);
    return [];
  }
}

export async function getCurrentShopName() {
  try {
    const owner = await requireOwner();
    const admin = getSupabaseAdminClient();

    if (owner.shopId === "demo-shop" && !admin) {
      return "Демо-магазин";
    }

    if (!admin) throw new Error("Supabase admin client is not configured.");
    const { data, error } = await admin
      .from("shops")
      .select("name")
      .eq("id", owner.shopId)
      .maybeSingle();

    if (error) throw error;

    return data?.name ? String(data.name) : "Магазин";
  } catch (error) {
    logServerError("getCurrentShopName", error);
    return "Магазин";
  }
}

export async function getSellerStats(
  filters: ReportFilters
): Promise<{ sellers: SellerStats[]; error: string | null }> {
  const range = getDateRange(filters.period, { date: filters.date });

  try {
    const owner = await requireOwner();
    const admin = getSupabaseAdminClient();

    if (owner.shopId === "demo-shop" && !admin) {
      const demoItems = filterByDateRange(demoSaleItems, range);
      const demoRecordCount = filterByDateRange(demoRecords, range).length;
      const demoReport = buildSalesReport(demoItems);
      return {
        sellers: demoSellers.map((seller) => ({
          ...seller,
          recordsCount: demoRecordCount,
          revenue: demoReport.totalRevenue,
          lastActivity: demoRecordCount ? now : null
        })),
        error: null
      };
    }

    if (!admin) throw new Error("Supabase admin client is not configured.");

    const { data: sellers, error: sellersError } = await admin
      .from("sellers")
      .select("id, name, is_active")
      .eq("shop_id", owner.shopId)
      .order("name", { ascending: true });

    if (sellersError) throw sellersError;

    const { data: sales, error: salesError } = await admin
      .from("sales")
      .select("id, shop_id, seller_id, status, created_at")
      .eq("shop_id", owner.shopId)
      .gte("created_at", range.start)
      .lt("created_at", range.end);

    if (salesError) throw salesError;

    const saleIds = (sales ?? []).map((sale: any) => String(sale.id));
    const saleSellerById = new Map<string, string | null>();
    const recordsCountBySeller = new Map<string, number>();
    const lastActivityBySeller = new Map<string, string>();

    for (const sale of sales ?? []) {
      const saleId = String((sale as any).id);
      const sellerId = (sale as any).seller_id ? String((sale as any).seller_id) : null;
      saleSellerById.set(saleId, sellerId);
      if (sellerId) {
        recordsCountBySeller.set(sellerId, (recordsCountBySeller.get(sellerId) ?? 0) + 1);
        const createdAt = String((sale as any).created_at);
        const previous = lastActivityBySeller.get(sellerId);
        if (!previous || new Date(createdAt).getTime() > new Date(previous).getTime()) {
          lastActivityBySeller.set(sellerId, createdAt);
        }
      }
    }

    const revenueBySeller = new Map<string, number>();
    if (saleIds.length) {
      const { data: saleItems, error: itemsError } = await admin
        .from("sale_items")
        .select(
          "id, sale_id, product_id, product_name, quantity, unit, price, total, confidence, status, updated_at, deleted_at, deleted_reason, deleted_previous_status"
        )
        .in("sale_id", saleIds);

      if (itemsError) throw itemsError;

      const scoped = scopeReportRows(
        (sales ?? []) as ReportSaleRow[],
        (saleItems ?? []) as ReportSaleItemRow[],
        owner.shopId
      );

      for (const item of scoped.items) {
        if (item.deleted_at || !isRevenueSaleItemStatus(item.status) || item.total === null || item.price === null) {
          continue;
        }
        const sellerId = saleSellerById.get(item.sale_id);
        if (!sellerId) continue;
        revenueBySeller.set(
          sellerId,
          Number(((revenueBySeller.get(sellerId) ?? 0) + item.total).toFixed(2))
        );
      }
    }

    return {
      sellers: (sellers ?? []).map((seller: any) => {
        const sellerId = String(seller.id);
        return {
          id: sellerId,
          name: seller.name || "Без имени",
          is_active: Boolean(seller.is_active),
          recordsCount: recordsCountBySeller.get(sellerId) ?? 0,
          revenue: revenueBySeller.get(sellerId) ?? 0,
          lastActivity: lastActivityBySeller.get(sellerId) ?? null
        };
      }),
      error: null
    };
  } catch (error) {
    logServerError("getSellerStats", error);
    return { sellers: [], error: reportLoadMessage(error) };
  }
}

export async function getRecords(
  filters: RecordFilters
): Promise<{ records: RecordListItem[]; error: string | null }> {
  const range = getDateRange(filters.period, { date: filters.date });
  try {
    const owner = await requireOwner();
    const admin = getSupabaseAdminClient();

    if (owner.shopId === "demo-shop" && !admin) {
      let records = filterByDateRange(demoRecords, range);
      if (filters.search) {
        const search = filters.search.toLocaleLowerCase("ru-RU");
        records = records.filter((record) =>
          `${record.cleaned_text ?? ""} ${record.raw_text ?? ""}`.toLocaleLowerCase("ru-RU").includes(search)
        );
      }
      return { records, error: null };
    }

    if (!admin) throw new Error("Supabase admin client is not configured.");
    let query = admin
      .from("sales")
      .select(
        `
        id,
        shop_id,
        raw_text,
        cleaned_text,
        total_amount,
        status,
        created_at,
        sellers ( id, name ),
        voice_records ( audio_path, audio_url )
      `
      )
      .eq("shop_id", owner.shopId)
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .order("created_at", { ascending: false });

    if (filters.sellerId) query = query.eq("seller_id", filters.sellerId);
    if (filters.search) {
      const search = escapeLike(filters.search);
      query = query.or(`raw_text.ilike.%${search}%,cleaned_text.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const saleIds = (data ?? []).map((sale: any) => String(sale.id));
    const saleItemsBySaleId = new Map<string, SaleItem[]>();
    if (saleIds.length) {
      const { data: saleItems, error: saleItemsError } = await admin
        .from("sale_items")
        .select(
          "id, sale_id, product_id, product_name, quantity, unit, price, total, confidence, status, updated_at, deleted_at, deleted_reason, deleted_previous_status"
        )
        .in("sale_id", saleIds);

      if (saleItemsError) throw saleItemsError;

      const scopedItems = scopeReportRows(
        (data ?? []) as ReportSaleRow[],
        (saleItems ?? []) as ReportSaleItemRow[],
        owner.shopId,
        { includeInactiveSales: true }
      ).items;
      for (const item of scopedItems) {
        const current = saleItemsBySaleId.get(item.sale_id) ?? [];
        current.push(item);
        saleItemsBySaleId.set(item.sale_id, current);
      }
    }

    const records = await Promise.all(
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
          audioUrl: await createSignedAudioUrl(voiceRecord?.audio_path ?? null, voiceRecord?.audio_url ?? null),
          items: saleItemsBySaleId.get(String(sale.id)) ?? []
        };
      })
    );
    return { records, error: null };
  } catch (error) {
    logServerError("getRecords", error);
    return { records: [], error: reportLoadMessage(error) };
  }
}

export async function getReport(filters: ReportFilters) {
  const range = getDateRange(filters.period, { date: filters.date });
  let owner: OwnerContext | null = null;
  let salesCount = 0;
  let saleItemsCount = 0;
  try {
    owner = await requireOwner();
    const admin = getSupabaseAdminClient();

    if (owner.shopId === "demo-shop" && !admin) {
      const items = filterByDateRange(demoSaleItems, range);
      const partitionedItems = partitionSaleItems(items);
      salesCount = items.length ? 1 : 0;
      saleItemsCount = items.length;
      logReportResult({ owner, range, salesCount, saleItemsCount, error: null });
      return {
        range,
        salesCount,
        summary: buildSalesReport(items),
        items: partitionedItems.activeItems,
        deletedItems: partitionedItems.deletedItems,
        error: null
      };
    }

    if (!admin) throw new Error("Supabase admin client is not configured.");
    const { data: sales, error: salesError } = await admin
      .from("sales")
      .select("id, shop_id, status, created_at")
      .eq("shop_id", owner.shopId)
      .gte("created_at", range.start)
      .lt("created_at", range.end);

    if (salesError) throw salesError;

    const saleIds = (sales ?? []).map((sale: any) => String(sale.id));
    let saleItems: ReportSaleItemRow[] = [];
    if (saleIds.length) {
      const { data, error } = await admin
        .from("sale_items")
        .select(
          "id, sale_id, product_id, product_name, quantity, unit, price, total, confidence, status, updated_at, deleted_at, deleted_reason, deleted_previous_status"
        )
        .in("sale_id", saleIds);
      if (error) throw error;
      saleItems = (data ?? []) as ReportSaleItemRow[];
    }

    const scoped = scopeReportRows(
      (sales ?? []) as ReportSaleRow[],
      saleItems,
      owner.shopId
    );
    salesCount = scoped.salesCount;
    saleItemsCount = scoped.saleItemsCount;
    const sortedItems = scoped.items.sort((left, right) =>
      left.product_name.localeCompare(right.product_name, "ru-RU")
    );
    const partitionedItems = partitionSaleItems(sortedItems);
    logReportResult({ owner, range, salesCount, saleItemsCount, error: null });

    return {
      range,
      salesCount,
      summary: buildSalesReport(sortedItems),
      items: partitionedItems.activeItems,
      deletedItems: partitionedItems.deletedItems,
      error: null
    };
  } catch (error) {
    logServerError("getReport", error);
    logReportResult({ owner, range, salesCount, saleItemsCount, error });
    return {
      range,
      salesCount: 0,
      summary: buildSalesReport([]),
      items: [],
      deletedItems: [],
      error: reportLoadMessage(error)
    };
  }
}

export async function getReviewItems(filters: ReportFilters) {
  const report = await getReport(filters);
  return report.summary.reviewItems;
}

async function getSaleContext(admin: AdminClient, saleId: string, shopId: string) {
  const { data, error } = await admin
    .from("sales")
    .select("id, shop_id, seller_id, voice_record_id, status")
    .eq("id", saleId)
    .eq("shop_id", shopId)
    .single();

  if (error) {
    return {
      data: null,
      error: isSupabaseNotFound(error) ? "Продажа не найдена." : "Не удалось проверить продажу.",
      statusCode: isSupabaseNotFound(error) ? 404 as const : 500 as const,
      code: isSupabaseNotFound(error) ? "SALE_NOT_FOUND" : "SALE_LOOKUP_FAILED"
    };
  }

  return { data, error: null, statusCode: null, code: null };
}

async function writeAuditLog(
  admin: AdminClient,
  context: { shop_id: string; seller_id: string | null },
  action: string,
  details: Record<string, unknown>
) {
  const { error } = await admin.from("audit_logs").insert({
    shop_id: context.shop_id,
    seller_id: context.seller_id,
    action,
    details
  });

  return error?.message ?? null;
}

function logAuditFailure(action: string, error: string | null) {
  if (error) {
    console.error(`[records] ${action} audit log failed`, { error });
  }
}

async function recalculateSale(admin: AdminClient, saleId: string, shopId: string): Promise<MutationResult> {
  const context = await getSaleContext(admin, saleId, shopId);

  if (!context.data) {
    return mutationError(
      context.error ?? "Продажа не найдена.",
      context.statusCode ?? 404,
      context.code ?? "SALE_NOT_FOUND"
    );
  }

  const { data: saleItems, error: saleItemsError } = await admin
    .from("sale_items")
    .select("status, total")
    .eq("sale_id", saleId)
    .is("deleted_at", null);

  if (saleItemsError) {
    return mutationError("Не удалось пересчитать продажу.", 500, "SALE_ITEMS_RECALC_FAILED");
  }

  const activeItems = saleItems ?? [];
  const totalAmount = Number(
    activeItems
      .filter((item: any) => isRevenueSaleItemStatus(String(item.status)) && item.total !== null)
      .reduce((sum: number, item: any) => sum + Number(item.total), 0)
      .toFixed(2)
  );
  const saleStatus = activeItems.length > 0 &&
    activeItems.every((item: any) => isRevenueSaleItemStatus(String(item.status)))
    ? "processed"
    : "needs_review";

  const { error: saleUpdateError } = await admin
    .from("sales")
    .update({ total_amount: totalAmount, status: saleStatus })
    .eq("id", saleId)
    .eq("shop_id", shopId)
    .select("id")
    .single();

  if (saleUpdateError) {
    return mutationError("Не удалось пересчитать продажу.", 500, "SALE_RECALC_FAILED");
  }

  if (context.data.voice_record_id) {
    const { error: voiceRecordUpdateError } = await admin
      .from("voice_records")
      .update({ status: saleStatus })
      .eq("id", context.data.voice_record_id)
      .eq("shop_id", shopId)
      .select("id")
      .single();

    if (voiceRecordUpdateError) {
      return mutationError("Не удалось обновить статус записи.", 500, "VOICE_RECORD_RECALC_FAILED");
    }
  }

  return { ok: true, message: "Итоги продажи пересчитаны." };
}

export async function updateSaleItem(params: {
  itemId: string;
  productName: string;
  quantity: number;
  price: number;
}) {
  let owner: OwnerContext;
  try {
    owner = await requireOwner();
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return mutationError("Не удалось сохранить товар.", 500, "SUPABASE_ADMIN_MISSING");
  }

  if (!params.productName.trim() || !Number.isFinite(params.quantity) || params.quantity <= 0) {
    return mutationError("Укажите товар и корректное количество.", 422, "INVALID_ITEM_DATA");
  }

  if (!Number.isFinite(params.price) || params.price <= 0) {
    return mutationError("Укажите корректную цену.", 422, "INVALID_ITEM_PRICE");
  }

  const { data: existingItem, error: existingItemError } = await admin
    .from("sale_items")
    .select("sale_id, product_name, quantity, unit, price, total, status, deleted_at")
    .eq("id", params.itemId)
    .single();

  if (existingItemError) {
    return mutationError(
      isSupabaseNotFound(existingItemError) ? "Товар не найден." : "Не удалось загрузить товар.",
      isSupabaseNotFound(existingItemError) ? 404 : 500,
      isSupabaseNotFound(existingItemError) ? "ITEM_NOT_FOUND" : "ITEM_LOOKUP_FAILED"
    );
  }

  if (existingItem.deleted_at) {
    return mutationError("Сначала восстановите исключённую позицию.", 422, "ITEM_ALREADY_EXCLUDED");
  }

  const patch = buildManualSaleItemPatch({
    productName: params.productName,
    quantity: params.quantity,
    unit: existingItem.unit,
    price: params.price
  });

  if (!patch.normalized_product_name) {
    return mutationError("Укажите товар.", 422, "INVALID_PRODUCT_NAME");
  }

  const saleContext = await getSaleContext(admin, existingItem.sale_id, owner.shopId);

  if (!saleContext.data) {
    return mutationError(
      saleContext.error ?? "Продажа не найдена.",
      saleContext.statusCode ?? 404,
      saleContext.code ?? "SALE_NOT_FOUND"
    );
  }

  try {
    requireShopAccess(owner, String(saleContext.data.shop_id));
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }
  const saleStatus = String(saleContext.data.status);
  const nextItemStatus = saleStatus === "processed" ? patch.status : "needs_review";

  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, name, unit")
    .eq("shop_id", saleContext.data.shop_id)
    .eq("is_active", true);

  if (productsError) {
    return mutationError("Не удалось проверить каталог товаров.", 500, "PRODUCT_LOOKUP_FAILED");
  }

  const product = (products ?? []).find(
    (row: any) => normalizeProductName(String(row.name)) === patch.normalized_product_name
  );
  const productName = product?.name ? displayProductName(String(product.name)) : patch.product_name;
  const unit = normalizeUnit(product?.unit ? String(product.unit) : patch.unit);
  const updatedAt = new Date().toISOString();

  const { data: item, error } = await admin
    .from("sale_items")
    .update({
      product_id: product?.id ?? null,
      product_name: productName,
      quantity: patch.quantity,
      unit,
      price: patch.price,
      total: patch.total,
      status: nextItemStatus,
      confidence: patch.confidence,
      updated_at: updatedAt
    })
    .eq("id", params.itemId)
    .is("deleted_at", null)
    .select("id, sale_id, product_name, quantity, unit, price, total, status, updated_at")
    .single();

  if (error) {
    return mutationError(
      isSupabaseNotFound(error) ? "Товар не найден." : "Не удалось сохранить товар.",
      isSupabaseNotFound(error) ? 404 : 500,
      isSupabaseNotFound(error) ? "ITEM_NOT_FOUND" : "ITEM_UPDATE_FAILED"
    );
  }

  const recalculation = await recalculateSale(admin, item.sale_id, owner.shopId);

  if (!recalculation.ok) {
    return recalculation;
  }

  const auditError = await writeAuditLog(admin, saleContext.data, "sale_item_updated", {
    item_id: params.itemId,
    before: {
      product_name: existingItem.product_name,
      quantity: Number(existingItem.quantity),
      unit: existingItem.unit,
      price: existingItem.price === null ? null : Number(existingItem.price),
      total: existingItem.total === null ? null : Number(existingItem.total),
      status: existingItem.status
    },
    after: {
      product_name: productName,
      quantity: patch.quantity,
      unit,
      price: patch.price,
      total: patch.total,
      status: nextItemStatus
    }
  });
  logAuditFailure("sale_item_updated", auditError);

  return {
    ok: true,
    message: nextItemStatus === "processed"
      ? "Изменения сохранены. Позиция учтена в отчёте."
      : "Изменения сохранены. Подтвердите запись в Telegram.",
    item: {
      id: String(item.id),
      sale_id: String(item.sale_id),
      product_name: String(item.product_name),
      quantity: Number(item.quantity),
      unit: String(item.unit),
      price: item.price === null ? null : Number(item.price),
      total: item.total === null ? null : Number(item.total),
      status: String(item.status),
      updated_at: String(item.updated_at)
    }
  };
}

export async function excludeSaleItem(itemId: string): Promise<MutationResult> {
  let owner: OwnerContext;
  try {
    owner = await requireOwner();
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return mutationError("Не удалось исключить товар из отчёта.", 500, "SUPABASE_ADMIN_MISSING");
  }

  const { data: item, error: itemError } = await admin
    .from("sale_items")
    .select("id, sale_id, product_name, status, deleted_at")
    .eq("id", itemId)
    .single();

  if (itemError) {
    return mutationError(
      isSupabaseNotFound(itemError) ? "Товар не найден." : "Не удалось загрузить товар.",
      isSupabaseNotFound(itemError) ? 404 : 500,
      isSupabaseNotFound(itemError) ? "ITEM_NOT_FOUND" : "ITEM_LOOKUP_FAILED"
    );
  }

  if (item.deleted_at) {
    return { ok: true, message: "Позиция уже исключена из отчёта." };
  }

  const context = await getSaleContext(admin, item.sale_id, owner.shopId);
  if (!context.data) {
    return mutationError(
      context.error ?? "Продажа не найдена.",
      context.statusCode ?? 404,
      context.code ?? "SALE_NOT_FOUND"
    );
  }

  try {
    requireShopAccess(owner, String(context.data.shop_id));
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }

  const patch = buildExcludedSaleItemPatch(item.status);
  const { data: excludedItem, error } = await admin
    .from("sale_items")
    .update(patch)
    .eq("id", itemId)
    .is("deleted_at", null)
    .select("sale_id")
    .single();

  if (error) {
    return mutationError(
      isSupabaseNotFound(error) ? "Товар не найден." : "Не удалось исключить товар из отчёта.",
      isSupabaseNotFound(error) ? 404 : 500,
      isSupabaseNotFound(error) ? "ITEM_NOT_FOUND" : "ITEM_EXCLUDE_FAILED"
    );
  }

  const recalculation = await recalculateSale(admin, excludedItem.sale_id, owner.shopId);
  if (!recalculation.ok) {
    return recalculation;
  }

  const auditError = await writeAuditLog(admin, context.data, "sale_item_deleted", {
    item_id: item.id,
    product_name: item.product_name,
    deleted_at: patch.deleted_at,
    reason: patch.deleted_reason
  });
  logAuditFailure("sale_item_deleted", auditError);
  return {
    ok: true,
    message: "Позиция удалена из активного отчёта.",
    itemId: String(item.id)
  };
}

export async function restoreSaleItem(itemId: string): Promise<MutationResult> {
  let owner: OwnerContext;
  try {
    owner = await requireOwner();
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return mutationError("Не удалось восстановить товар.", 500, "SUPABASE_ADMIN_MISSING");
  }

  const { data: item, error: itemError } = await admin
    .from("sale_items")
    .select("id, sale_id, product_name, deleted_at, deleted_reason, deleted_previous_status")
    .eq("id", itemId)
    .single();

  if (itemError) {
    return mutationError(
      isSupabaseNotFound(itemError) ? "Товар не найден." : "Не удалось загрузить товар.",
      isSupabaseNotFound(itemError) ? 404 : 500,
      isSupabaseNotFound(itemError) ? "ITEM_NOT_FOUND" : "ITEM_LOOKUP_FAILED"
    );
  }

  if (!item.deleted_at) {
    return { ok: true, message: "Позиция уже активна." };
  }

  const context = await getSaleContext(admin, item.sale_id, owner.shopId);
  if (!context.data) {
    return mutationError(
      context.error ?? "Продажа не найдена.",
      context.statusCode ?? 404,
      context.code ?? "SALE_NOT_FOUND"
    );
  }

  try {
    requireShopAccess(owner, String(context.data.shop_id));
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }

  const updatedAt = new Date().toISOString();
  const { data: restoredItem, error } = await admin
    .from("sale_items")
    .update({
      status: item.deleted_previous_status ?? "needs_review",
      deleted_at: null,
      deleted_reason: null,
      deleted_previous_status: null,
      updated_at: updatedAt
    })
    .eq("id", itemId)
    .not("deleted_at", "is", null)
    .select("sale_id")
    .single();

  if (error) {
    return mutationError(
      isSupabaseNotFound(error) ? "Товар не найден." : "Не удалось восстановить товар.",
      isSupabaseNotFound(error) ? 404 : 500,
      isSupabaseNotFound(error) ? "ITEM_NOT_FOUND" : "ITEM_RESTORE_FAILED"
    );
  }

  const recalculation = await recalculateSale(admin, restoredItem.sale_id, owner.shopId);
  if (!recalculation.ok) {
    return recalculation;
  }

  const auditError = await writeAuditLog(admin, context.data, "sale_item_restored", {
    item_id: item.id,
    product_name: item.product_name,
    previous_deleted_at: item.deleted_at,
    previous_reason: item.deleted_reason
  });
  logAuditFailure("sale_item_restored", auditError);
  return { ok: true, message: "Позиция восстановлена и снова учитывается в отчёте." };
}

type ReviewMutationItemRow = {
  id: string;
  product_name: string;
  quantity: number | string;
  price: number | string | null;
  total: number | string | null;
  status: string;
  deleted_at?: string | null;
};

function normalizePreviousItemStatus(status: string): Exclude<SaleItem["status"], "excluded"> {
  if (status === "processed" || status === "needs_price" || status === "needs_review" || status === "failed") {
    return status;
  }

  return "needs_review";
}

function toConfirmableReviewItem(item: ReviewMutationItemRow) {
  const quantity = Number(item.quantity);
  const price = item.price === null ? Number.NaN : Number(item.price);
  const total = calculateItemTotal(quantity, price);

  if (
    item.status === "excluded" ||
    !isMeaningfulProductName(item.product_name) ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    total === null
  ) {
    return null;
  }

  return { id: String(item.id), total };
}

async function getActiveReviewMutationItems(admin: AdminClient, saleId: string) {
  const { data, error } = await admin
    .from("sale_items")
    .select("id, product_name, quantity, price, total, status, deleted_at")
    .eq("sale_id", saleId)
    .is("deleted_at", null);

  if (error) {
    return {
      items: [],
      error: mutationError("Не удалось загрузить товары записи.", 500, "REVIEW_ITEMS_LOOKUP_FAILED")
    };
  }

  return {
    items: ((data ?? []) as ReviewMutationItemRow[]).filter((item) => item.status !== "excluded"),
    error: null
  };
}

async function setReviewSaleStatus(
  admin: AdminClient,
  sale: NonNullable<Awaited<ReturnType<typeof getSaleContext>>["data"]>,
  shopId: string,
  status: "processed" | "cancelled",
  totalAmount: number
) {
  const { error: saleError } = await admin
    .from("sales")
    .update({ status, total_amount: totalAmount })
    .eq("id", sale.id)
    .eq("shop_id", shopId)
    .select("id")
    .single();

  if (saleError) {
    return mutationError("Не удалось обновить статус записи.", 500, "REVIEW_SALE_UPDATE_FAILED");
  }

  if (sale.voice_record_id) {
    const { error: voiceError } = await admin
      .from("voice_records")
      .update({ status })
      .eq("id", sale.voice_record_id)
      .eq("shop_id", shopId)
      .select("id")
      .single();

    if (voiceError) {
      return mutationError("Не удалось обновить voice-запись.", 500, "REVIEW_VOICE_UPDATE_FAILED");
    }
  }

  return null;
}

async function resolveReviewMutationContext(saleId: string) {
  if (!saleId) {
    return {
      owner: null,
      admin: null,
      sale: null,
      error: mutationError("Запись не найдена.", 422, "SALE_ID_MISSING")
    };
  }

  let owner: OwnerContext;
  try {
    owner = await requireOwner();
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) {
      return { owner: null, admin: null, sale: null, error: authError };
    }
    throw error;
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      owner,
      admin: null,
      sale: null,
      error: mutationError("Не удалось выполнить действие.", 500, "SUPABASE_ADMIN_MISSING")
    };
  }

  const context = await getSaleContext(admin, saleId, owner.shopId);
  if (!context.data) {
    return {
      owner,
      admin,
      sale: null,
      error: mutationError(
        context.error ?? "Запись не найдена.",
        context.statusCode ?? 404,
        context.code ?? "SALE_NOT_FOUND"
      )
    };
  }

  return { owner, admin, sale: context.data, error: null };
}

export async function confirmReviewSale(saleId: string): Promise<MutationResult> {
  const context = await resolveReviewMutationContext(saleId);
  if (context.error) return context.error;
  const { owner, admin, sale } = context;
  if (!owner || !admin || !sale) {
    return mutationError("Не удалось подтвердить запись.", 500, "REVIEW_CONTEXT_MISSING");
  }

  if (sale.status === "processed") {
    return { ok: true, message: "Запись уже подтверждена и входит в отчёт." };
  }
  if (sale.status === "cancelled") {
    return { ok: true, message: "Запись уже отменена и не входит в отчёт." };
  }
  if (sale.status === "failed") {
    return mutationError("Не удалось подтвердить неуспешную запись.", 422, "FAILED_SALE_CONFIRM_FORBIDDEN");
  }

  const activeItems = await getActiveReviewMutationItems(admin, sale.id);
  if (activeItems.error) return activeItems.error;

  const confirmableItems = activeItems.items.flatMap((item) => {
    const confirmable = toConfirmableReviewItem(item);
    return confirmable ? [confirmable] : [];
  });

  if (!confirmableItems.length) {
    return mutationError(
      "Перед подтверждением нужны товар, количество и цена хотя бы в одной позиции.",
      422,
      "NO_CONFIRMABLE_ITEMS"
    );
  }

  if (confirmableItems.length !== activeItems.items.length) {
    return mutationError(
      "Перед подтверждением заполните товар, количество и цену во всех позициях.",
      422,
      "INCOMPLETE_REVIEW_ITEMS"
    );
  }

  for (const item of confirmableItems) {
    const { error } = await admin
      .from("sale_items")
      .update({
        status: "processed",
        confidence: 1,
        total: item.total,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      return mutationError("Не удалось подтвердить товары записи.", 500, "REVIEW_ITEM_CONFIRM_FAILED");
    }
  }

  const totalAmount = Number(confirmableItems.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const statusError = await setReviewSaleStatus(admin, sale, owner.shopId, "processed", totalAmount);
  if (statusError) return statusError;

  const auditError = await writeAuditLog(admin, sale, "voice_sale_confirmed_webapp", {
    sale_id: sale.id,
    item_count: confirmableItems.length
  });
  logAuditFailure("voice_sale_confirmed_webapp", auditError);

  return { ok: true, message: "Запись подтверждена и добавлена в выручку." };
}

export async function cancelReviewSale(saleId: string): Promise<MutationResult> {
  const context = await resolveReviewMutationContext(saleId);
  if (context.error) return context.error;
  const { owner, admin, sale } = context;
  if (!owner || !admin || !sale) {
    return mutationError("Не удалось отменить запись.", 500, "REVIEW_CONTEXT_MISSING");
  }

  if (sale.status === "cancelled") {
    return { ok: true, message: "Запись уже отменена и не входит в отчёт." };
  }
  if (sale.status === "processed") {
    return { ok: true, message: "Запись уже подтверждена и входит в отчёт." };
  }
  if (sale.status === "failed") {
    return mutationError("Не удалось отменить неуспешную запись.", 422, "FAILED_SALE_CANCEL_FORBIDDEN");
  }

  const activeItems = await getActiveReviewMutationItems(admin, sale.id);
  if (activeItems.error) return activeItems.error;
  const deletedAt = new Date().toISOString();
  let excludedCount = 0;

  for (const item of activeItems.items) {
    const { error } = await admin
      .from("sale_items")
      .update(buildExcludedSaleItemPatch(normalizePreviousItemStatus(item.status), deletedAt))
      .eq("id", item.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      return mutationError("Не удалось отменить товары записи.", 500, "REVIEW_ITEM_CANCEL_FAILED");
    }
    excludedCount += 1;
  }

  const statusError = await setReviewSaleStatus(admin, sale, owner.shopId, "cancelled", 0);
  if (statusError) return statusError;

  const auditError = await writeAuditLog(admin, sale, "voice_sale_cancelled_webapp", {
    sale_id: sale.id,
    item_count: excludedCount
  });
  logAuditFailure("voice_sale_cancelled_webapp", auditError);

  return { ok: true, message: "Запись отменена и не входит в отчёт." };
}

export async function resetDay(range: { start: string; end: string }): Promise<MutationResult> {
  let owner: OwnerContext;
  try {
    owner = await requireOwner();
  } catch (error) {
    const authError = authMutationError(error);
    if (authError) return authError;
    throw error;
  }
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return mutationError("Не удалось сбросить отчёт за день.", 500, "SUPABASE_ADMIN_MISSING");
  }

  const start = new Date(range.start);
  const end = new Date(range.end);
  const duration = end.getTime() - start.getTime();

  if (!Number.isFinite(duration) || duration <= 0 || duration > 25 * 60 * 60 * 1000) {
    return mutationError("Сброс разрешён только для одного дня.", 422, "INVALID_RESET_RANGE");
  }

  const { data: sales, error: salesError } = await admin
    .from("sales")
    .select("id, shop_id, seller_id")
    .eq("shop_id", owner.shopId)
    .gte("created_at", range.start)
    .lt("created_at", range.end);

  if (salesError) {
    return mutationError("Не удалось загрузить продажи для сброса.", 500, "RESET_SALES_LOOKUP_FAILED");
  }

  const saleIds = (sales ?? []).map((sale: any) => String(sale.id));
  if (!saleIds.length) {
    return { ok: true, message: "За выбранный день нет продаж для сброса." };
  }

  const { data: activeItems, error: itemsError } = await admin
    .from("sale_items")
    .select("id, sale_id, status")
    .in("sale_id", saleIds)
    .is("deleted_at", null);

  if (itemsError) {
    return mutationError("Не удалось загрузить товары для сброса.", 500, "RESET_ITEMS_LOOKUP_FAILED");
  }

  if (!activeItems?.length) {
    return { ok: true, message: "Выручка за выбранный день уже сброшена." };
  }

  const deletedAt = new Date().toISOString();
  for (const status of ["processed", "needs_price", "needs_review", "failed"] as const) {
    const ids = activeItems.filter((item: any) => item.status === status).map((item: any) => item.id);
    if (!ids.length) continue;

    const { data: excludedItems, error } = await admin
      .from("sale_items")
      .update({
        status: "excluded",
        deleted_at: deletedAt,
        deleted_reason: "day_reset",
        deleted_previous_status: status,
        updated_at: deletedAt
      })
      .in("id", ids)
      .is("deleted_at", null)
      .select("id");

    if (error) {
      return mutationError("Не удалось исключить часть товаров.", 500, "RESET_ITEMS_UPDATE_FAILED");
    }
    if (excludedItems?.length !== ids.length) {
      return mutationError("Не все позиции были исключены из отчёта.", 500, "RESET_ITEMS_UPDATE_INCOMPLETE");
    }
  }

  for (const saleId of saleIds) {
    const recalculation = await recalculateSale(admin, saleId, owner.shopId);
    if (!recalculation.ok) {
      return recalculation;
    }
  }

  const auditError = await writeAuditLog(
    admin,
    { shop_id: owner.shopId, seller_id: null },
    "daily_revenue_reset",
    {
      range,
      deleted_at: deletedAt,
      item_count: activeItems.length,
      sale_ids: saleIds
    }
  );

  logAuditFailure("daily_revenue_reset", auditError);

  return {
    ok: true,
    message: `Выручка за день сброшена. Исключено позиций: ${activeItems.length}.`
  };
}

export const resetDayRevenue = resetDay;
