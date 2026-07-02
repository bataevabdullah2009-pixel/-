import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildExcludedSaleItemPatch,
  calculateItemTotal,
  calculateUnitPriceFromTotal,
  displayProductName,
  isMeaningfulProductName,
  normalizeProductName,
  normalizeSaleItemFields,
  normalizeUnit,
  resolveSaleItemStatus
} from "@voice-sales-log/shared/utils/date-range";
import type { ParsedSale, ParsedSaleItem, SaleItemStatus, VoiceRecordStatus } from "@voice-sales-log/shared/types";
import type { AppEnv } from "../config/env";
import { logger } from "../utils/logger";

let client: SupabaseClient | null = null;

export class SellerAccessError extends Error {
  constructor(message = "Ваш Telegram не привязан к магазину. Обратитесь к владельцу.") {
    super(message);
    this.name = "SellerAccessError";
  }
}

export type SellerContext = {
  id: string;
  shopId: string;
};

export function resolveSellerAccess(
  seller: { id: string; shop_id: string; is_active: boolean } | null,
  demoMode: boolean
): SellerContext | null {
  if (seller?.is_active) {
    return { id: seller.id, shopId: seller.shop_id };
  }

  if (seller || !demoMode) {
    throw new SellerAccessError();
  }

  return null;
}

function getSupabase(env: AppEnv) {
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return client;
}

async function getDefaultShopId(env: AppEnv) {
  const supabase = getSupabase(env);
  const { data: existingShop, error: selectError } = await supabase
    .from("shops")
    .select("id")
    .eq("name", env.DEFAULT_SHOP_NAME)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingShop?.id) {
    return existingShop.id as string;
  }

  const { data, error } = await supabase
    .from("shops")
    .insert({ name: env.DEFAULT_SHOP_NAME })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function requireSeller(env: AppEnv, telegramId: number, name: string | null): Promise<SellerContext> {
  const supabase = getSupabase(env);

  const { data: existingSeller, error: selectError } = await supabase
    .from("sellers")
    .select("id, shop_id, name, is_active")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  const existingAccess = resolveSellerAccess(
    existingSeller?.id
      ? {
          id: String(existingSeller.id),
          shop_id: String(existingSeller.shop_id),
          is_active: Boolean(existingSeller.is_active)
        }
      : null,
    env.DEMO_MODE
  );
  if (existingAccess) return existingAccess;

  const shopId = await getDefaultShopId(env);

  const { data, error } = await supabase
    .from("sellers")
    .insert({
      shop_id: shopId,
      telegram_id: telegramId,
      name
    })
    .select("id, shop_id")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id as string,
    shopId: data.shop_id as string
  };
}

export const findOrCreateSeller = requireSeller;

type ProductLookup = {
  id: string;
  name: string;
  unit: string | null;
};

async function findDefaultProductPrice(env: AppEnv, shopId: string, productName: string) {
  const supabase = getSupabase(env);
  const productKey = normalizeProductName(productName);

  if (!productKey) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, unit")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .returns<ProductLookup[]>();

  if (error) {
    throw error;
  }

  const product = (data ?? []).find((row) => normalizeProductName(row.name) === productKey);

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    unit: product.unit
  };
}

async function resolveSaleItem(env: AppEnv, shopId: string, item: ParsedSaleItem) {
  const normalized = normalizeSaleItemFields(item);
  const product = await findDefaultProductPrice(env, shopId, normalized.product_name);
  const price = normalized.price;
  const total = calculateItemTotal(normalized.quantity, price, normalized.unit);
  const productName = product?.name ? displayProductName(product.name) : normalized.product_name;
  const status: SaleItemStatus = resolveSaleItemStatus({
    productName,
    quantityWasMissing: normalized.quantityWasMissing,
    price,
    total,
    confidence: normalized.confidence
  });

  return {
    product_id: product?.id ?? null,
    product_name: productName,
    quantity: normalized.quantity,
    unit: normalizeUnit(product?.unit ?? normalized.unit),
    price,
    total,
    confidence: normalized.confidence,
    status
  };
}

type ResolvedSaleItem = Awaited<ReturnType<typeof resolveSaleItem>>;

export function ensureReviewableSaleItems(parsedSale: ParsedSale): ParsedSaleItem[] {
  if (parsedSale.items.length) {
    return parsedSale.items;
  }

  const fallbackName = (parsedSale.cleaned_text || parsedSale.raw_text)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120) || "Нераспознанный товар";

  return [{
    product_name: fallbackName,
    quantity: null,
    unit: "шт",
    price: null,
    total: null,
    confidence: 0
  }];
}

export function buildVoiceSaleRpcPayload(params: {
  seller: SellerContext;
  telegramMessageId: string;
  audioPath: string | null;
  audioUrl: string | null;
  rawText: string;
  parsedSale: ParsedSale;
  parserJson: unknown | null;
  errorMessage: string | null;
  saleStatus: VoiceRecordStatus;
  totalAmount: number;
  resolvedItems: ResolvedSaleItem[];
}) {
  return {
    p_shop_id: params.seller.shopId,
    p_seller_id: params.seller.id,
    p_telegram_message_id: params.telegramMessageId,
    p_audio_path: params.audioPath,
    p_audio_url: params.audioUrl,
    p_raw_text: params.rawText,
    p_cleaned_text: params.parsedSale.cleaned_text,
    p_parser_json: params.parserJson,
    p_status: params.saleStatus,
    p_error_message: params.errorMessage,
    p_total_amount: params.totalAmount,
    p_items: params.resolvedItems
  };
}

export type VoiceSaleRpcPayload = ReturnType<typeof buildVoiceSaleRpcPayload>;

function isMissingSaveVoiceSaleRpc(error: { code?: string; message?: string }) {
  return error.code === "PGRST202";
}

async function verifyVoiceSalePersistence(
  supabase: SupabaseClient,
  payload: VoiceSaleRpcPayload,
  persisted: { voice_record_id?: unknown; sale_id?: unknown } | null | undefined
) {
  if (!persisted?.sale_id || !persisted?.voice_record_id) {
    throw new Error("Voice sale persistence returned no identifiers.");
  }

  const expectedItemCount = payload.p_items.length;
  if (expectedItemCount === 0) {
    throw new Error("Voice sale persistence requires at least one sale item.");
  }

  const saleId = String(persisted.sale_id);
  const voiceRecordId = String(persisted.voice_record_id);
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, shop_id, seller_id, voice_record_id")
    .eq("id", saleId)
    .eq("shop_id", payload.p_shop_id)
    .eq("seller_id", payload.p_seller_id)
    .eq("voice_record_id", voiceRecordId)
    .single();

  if (saleError) {
    throw saleError;
  }
  if (!sale?.id) {
    throw new Error("Saved sale could not be read back.");
  }

  const { data: items, count, error: itemsError } = await supabase
    .from("sale_items")
    .select("id", { count: "exact" })
    .eq("sale_id", saleId);

  if (itemsError) {
    throw itemsError;
  }

  const insertedItemCount = count ?? items?.length ?? 0;
  if (insertedItemCount !== expectedItemCount || items?.length !== expectedItemCount) {
    throw new Error(
      `Saved sale item count mismatch: expected=${expectedItemCount}; actual=${insertedItemCount}.`
    );
  }

  return {
    voice_record_id: voiceRecordId,
    sale_id: saleId,
    item_count: insertedItemCount
  };
}

export async function persistVoiceSale(supabase: SupabaseClient, payload: VoiceSaleRpcPayload) {
  const { data: persistedRows, error } = await supabase.rpc("save_voice_sale", payload);

  if (error) {
    if (isMissingSaveVoiceSaleRpc(error)) {
      logger.error("save_voice_sale_rpc_missing", {
        code: error.code,
        telegramMessageId: payload.p_telegram_message_id,
        sellerId: payload.p_seller_id,
        shopId: payload.p_shop_id
      });
    }
    throw error;
  }

  const persisted = Array.isArray(persistedRows) ? persistedRows[0] : persistedRows;
  return verifyVoiceSalePersistence(supabase, payload, persisted);
}

function calculateProcessedTotal(items: ResolvedSaleItem[]) {
  return Number(
    items
      .filter((item) => item.status === "processed" && item.total !== null)
      .reduce((sum, item) => sum + Number(item.total), 0)
      .toFixed(2)
  );
}

type ReviewSaleRow = {
  id: string;
  shop_id: string;
  seller_id: string | null;
  voice_record_id: string | null;
  status: string;
};

type ReviewSaleItemRow = {
  id: string;
  product_name: string;
  quantity: number | string;
  unit: string | null;
  price: number | string | null;
  total: number | string | null;
  status: string;
  deleted_at?: string | null;
};

export type VoiceSaleReviewResult = {
  ok: boolean;
  message: string;
  status: "processed" | "cancelled" | "unchanged" | "error";
  oldStatus?: string | null;
  newStatus?: string | null;
  itemCount?: number;
};

async function getReviewSale(
  supabase: SupabaseClient,
  seller: SellerContext,
  saleId: string
): Promise<ReviewSaleRow | null> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, shop_id, seller_id, voice_record_id, status")
    .eq("id", saleId)
    .eq("shop_id", seller.shopId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ReviewSaleRow | null;
}

async function getActiveReviewItems(supabase: SupabaseClient, saleId: string) {
  const { data, error } = await supabase
    .from("sale_items")
    .select("id, product_name, quantity, unit, price, total, status, deleted_at")
    .eq("sale_id", saleId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return (data ?? []) as ReviewSaleItemRow[];
}

function toConfirmableItem(item: ReviewSaleItemRow) {
  const quantity = Number(item.quantity);
  const sourcePrice = item.price === null ? null : Number(item.price);
  const sourceTotal = item.total === null ? null : Number(item.total);
  const price = sourcePrice !== null && Number.isFinite(sourcePrice)
    ? sourcePrice
    : calculateUnitPriceFromTotal(quantity, sourceTotal, item.unit);
  const total = sourceTotal !== null && Number.isFinite(sourceTotal) && sourceTotal > 0
    ? Number(sourceTotal.toFixed(2))
    : calculateItemTotal(quantity, price, item.unit);

  if (
    item.status === "excluded" ||
    !isMeaningfulProductName(item.product_name) ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    price === null ||
    !Number.isFinite(price) ||
    price <= 0 ||
    total === null
  ) {
    return null;
  }

  return {
    id: String(item.id),
    price,
    total
  };
}

async function setSaleAndVoiceStatus(
  supabase: SupabaseClient,
  sale: ReviewSaleRow,
  seller: SellerContext,
  status: "processed" | "cancelled",
  totalAmount: number
) {
  const { error: saleError } = await supabase
    .from("sales")
    .update({ status, total_amount: totalAmount })
    .eq("id", sale.id)
    .eq("shop_id", seller.shopId)
    .eq("seller_id", seller.id)
    .select("id")
    .single();

  if (saleError) {
    throw saleError;
  }

  if (sale.voice_record_id) {
    const { error: voiceError } = await supabase
      .from("voice_records")
      .update({ status })
      .eq("id", sale.voice_record_id)
      .eq("shop_id", seller.shopId)
      .eq("seller_id", seller.id)
      .select("id")
      .single();

    if (voiceError) {
      throw voiceError;
    }
  }
}

function normalizePreviousItemStatus(status: string): Exclude<SaleItemStatus, "excluded"> {
  if (status === "processed" || status === "needs_price" || status === "needs_review" || status === "failed") {
    return status;
  }

  return "needs_review";
}

export async function confirmVoiceSaleWithClient(
  supabase: SupabaseClient,
  seller: SellerContext,
  saleId: string
): Promise<VoiceSaleReviewResult> {
  const sale = await getReviewSale(supabase, seller, saleId);

  if (!sale) {
    return { ok: false, status: "error", oldStatus: null, newStatus: null, message: "Запись не найдена." };
  }

  if (sale.status === "processed") {
    return {
      ok: true,
      status: "unchanged",
      oldStatus: sale.status,
      newStatus: sale.status,
      message: "✅ Запись уже подтверждена и входит в отчёт."
    };
  }

  if (sale.status === "cancelled") {
    return {
      ok: true,
      status: "unchanged",
      oldStatus: sale.status,
      newStatus: sale.status,
      message: "❌ Запись уже отменена и не входит в отчёт."
    };
  }

  if (sale.status === "failed") {
    return {
      ok: false,
      status: "error",
      oldStatus: sale.status,
      newStatus: sale.status,
      message: "Не удалось подтвердить неуспешную запись."
    };
  }

  const activeItems = (await getActiveReviewItems(supabase, sale.id))
    .filter((item) => item.status !== "excluded");
  const confirmableItems = activeItems.flatMap((item) => {
    const confirmable = toConfirmableItem(item);
    return confirmable ? [confirmable] : [];
  });

  if (!confirmableItems.length) {
    return {
      ok: false,
      status: "error",
      oldStatus: sale.status,
      newStatus: sale.status,
      message: "Не удалось подтвердить: нет ни одной полной позиции."
    };
  }

  for (const item of confirmableItems) {
    const { error } = await supabase
      .from("sale_items")
      .update({
        status: "processed",
        confidence: 1,
        price: item.price,
        total: item.total,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      throw error;
    }
  }

  const totalAmount = Number(
    confirmableItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
  );
  await setSaleAndVoiceStatus(supabase, sale, seller, "processed", totalAmount);

  return {
    ok: true,
    status: "processed",
    oldStatus: sale.status,
    newStatus: "processed",
    message: "✅ Запись подтверждена и добавлена в выручку.",
    itemCount: confirmableItems.length
  };
}

export async function cancelVoiceSaleWithClient(
  supabase: SupabaseClient,
  seller: SellerContext,
  saleId: string
): Promise<VoiceSaleReviewResult> {
  const sale = await getReviewSale(supabase, seller, saleId);

  if (!sale) {
    return { ok: false, status: "error", oldStatus: null, newStatus: null, message: "Запись не найдена." };
  }

  if (sale.status === "cancelled") {
    return {
      ok: true,
      status: "unchanged",
      oldStatus: sale.status,
      newStatus: sale.status,
      message: "❌ Запись уже отменена и не входит в отчёт."
    };
  }

  if (sale.status === "processed") {
    return {
      ok: true,
      status: "unchanged",
      oldStatus: sale.status,
      newStatus: sale.status,
      message: "✅ Запись уже подтверждена и входит в отчёт."
    };
  }

  const activeItems = await getActiveReviewItems(supabase, sale.id);
  const deletedAt = new Date().toISOString();
  let excludedCount = 0;

  for (const item of activeItems) {
    if (item.status === "excluded") {
      continue;
    }

    const { error } = await supabase
      .from("sale_items")
      .update(buildExcludedSaleItemPatch(normalizePreviousItemStatus(item.status), deletedAt))
      .eq("id", item.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    excludedCount += 1;
  }

  await setSaleAndVoiceStatus(supabase, sale, seller, "cancelled", 0);

  return {
    ok: true,
    status: "cancelled",
    oldStatus: sale.status,
    newStatus: "cancelled",
    message: "❌ Запись отменена и не входит в отчёт.",
    itemCount: excludedCount
  };
}

export async function confirmVoiceSale(params: {
  env: AppEnv;
  seller: SellerContext;
  saleId: string;
}) {
  const result = await confirmVoiceSaleWithClient(getSupabase(params.env), params.seller, params.saleId);

  if (result.ok && result.status === "processed") {
    await tryWriteAuditLog(params.env, {
      shopId: params.seller.shopId,
      sellerId: params.seller.id,
      action: "voice_sale_confirmed",
      details: { sale_id: params.saleId, item_count: result.itemCount ?? 0 }
    });
  }

  return result;
}

export async function cancelVoiceSale(params: {
  env: AppEnv;
  seller: SellerContext;
  saleId: string;
}) {
  const result = await cancelVoiceSaleWithClient(getSupabase(params.env), params.seller, params.saleId);

  if (result.ok && result.status === "cancelled") {
    await tryWriteAuditLog(params.env, {
      shopId: params.seller.shopId,
      sellerId: params.seller.id,
      action: "voice_sale_cancelled",
      details: { sale_id: params.saleId, item_count: result.itemCount ?? 0 }
    });
  }

  return result;
}

export async function saveVoiceSale(params: {
  env: AppEnv;
  seller: SellerContext;
  telegramMessageId: string;
  audioPath: string | null;
  audioUrl: string | null;
  rawText: string;
  parsedSale: ParsedSale;
  parserJson: unknown | null;
  errorMessage?: string | null;
}) {
  const {
    env,
    seller,
    telegramMessageId,
    audioPath,
    audioUrl,
    rawText,
    parsedSale,
    parserJson,
    errorMessage
  } = params;
  const supabase = getSupabase(env);
  const sourceItems = ensureReviewableSaleItems(parsedSale);
  const resolvedItems = await Promise.all(sourceItems.map((item) => resolveSaleItem(env, seller.shopId, item)));
  const needsAttention =
    Boolean(errorMessage) ||
    resolvedItems.length === 0 ||
    resolvedItems.some((item) => item.status !== "processed");
  const saleStatus: VoiceRecordStatus = needsAttention ? "needs_review" : "processed";
  const totalAmount = calculateProcessedTotal(resolvedItems);

  const rpcPayload = buildVoiceSaleRpcPayload({
    seller,
    telegramMessageId,
    audioPath,
    audioUrl,
    rawText,
    parsedSale,
    parserJson,
    errorMessage: errorMessage ?? null,
    saleStatus,
    totalAmount,
    resolvedItems
  });
  const persisted = await persistVoiceSale(supabase, rpcPayload);
  const saleId = String(persisted.sale_id);
  const voiceRecordId = String(persisted.voice_record_id);

  await Promise.all([
    tryWriteAuditLog(env, {
      shopId: seller.shopId,
      sellerId: seller.id,
      action: "sale_items_created",
      details: {
        sale_id: saleId,
        voice_record_id: voiceRecordId,
        items_count: resolvedItems.length,
        item_statuses: resolvedItems.map((item) => item.status)
      }
    }),
    tryWriteAuditLog(env, {
      shopId: seller.shopId,
      sellerId: seller.id,
      action: needsAttention ? "sale.review_required" : "sale.processed",
      details: {
        sale_id: saleId,
        voice_record_id: voiceRecordId,
        status: saleStatus,
        items_count: resolvedItems.length
      }
    })
  ]);

  return {
    saleId,
    voiceRecordId,
    status: saleStatus,
    totalAmount,
    itemCount: persisted.item_count,
    needsAttention
  };
}

export const saveProcessedSale = saveVoiceSale;

export async function saveFailedVoiceRecord(params: {
  env: AppEnv;
  seller: SellerContext;
  telegramMessageId: string;
  audioPath?: string | null;
  audioUrl?: string | null;
  rawText?: string | null;
  cleanedText?: string | null;
  parserJson?: unknown | null;
  errorMessage: string;
}) {
  const {
    env,
    seller,
    telegramMessageId,
    audioPath,
    audioUrl,
    rawText,
    cleanedText,
    parserJson,
    errorMessage
  } = params;
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("voice_records")
    .insert({
      shop_id: seller.shopId,
      seller_id: seller.id,
      telegram_message_id: telegramMessageId,
      audio_path: audioPath ?? null,
      audio_url: audioUrl ?? null,
      raw_text: rawText ?? null,
      cleaned_text: cleanedText ?? null,
      parser_json: parserJson ?? null,
      status: "failed",
      error_message: errorMessage
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await tryWriteAuditLog(env, {
    shopId: seller.shopId,
    sellerId: seller.id,
    action: "voice.failed",
    details: {
      voice_record_id: data.id,
      error: errorMessage
    }
  });
}

async function tryWriteAuditLog(
  env: AppEnv,
  params: Parameters<typeof writeAuditLog>[1]
) {
  try {
    await writeAuditLog(env, params);
  } catch (error) {
    logger.warn("audit_log_failed", { action: params.action, error });
  }
}

export async function writeProcessingAuditLog(params: {
  env: AppEnv;
  sellerTelegramId: number;
  sellerName: string | null;
  action: "stt_raw_text_received" | "llm_parser_json_received";
  details: Record<string, unknown>;
}) {
  const { env, sellerTelegramId, sellerName, action, details } = params;
  const seller = await requireSeller(env, sellerTelegramId, sellerName);

  await writeAuditLog(env, {
    shopId: seller.shopId,
    sellerId: seller.id,
    action,
    details
  });
}

export async function writeAuditLog(
  env: AppEnv,
  params: {
    shopId: string | null;
    sellerId: string | null;
    action: string;
    details?: Record<string, unknown>;
  }
) {
  const supabase = getSupabase(env);
  const { error } = await supabase.from("audit_logs").insert({
    shop_id: params.shopId,
    seller_id: params.sellerId,
    action: params.action,
    details: params.details ?? {}
  });

  if (error) {
    throw error;
  }
}
