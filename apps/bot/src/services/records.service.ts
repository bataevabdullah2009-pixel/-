import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  calculateItemTotal,
  displayProductName,
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
  default_price: number | string | null;
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
    .select("id, name, default_price, unit")
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
    default_price: product.default_price === null ? null : Number(product.default_price),
    unit: product.unit
  };
}

async function resolveSaleItem(env: AppEnv, shopId: string, item: ParsedSaleItem) {
  const normalized = normalizeSaleItemFields(item);
  const product = await findDefaultProductPrice(env, shopId, normalized.product_name);
  const price = normalized.price ?? product?.default_price ?? null;
  const total = calculateItemTotal(normalized.quantity, price);
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

export function markSaleItemsForRequiredReview(items: ResolvedSaleItem[]) {
  return items.map((item) => ({
    ...item,
    status: item.status === "needs_price" ? "needs_price" as const : "needs_review" as const
  }));
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

type VoiceSaleRpcPayload = ReturnType<typeof buildVoiceSaleRpcPayload>;

function isMissingSaveVoiceSaleRpc(error: { code?: string; message?: string }) {
  return error.code === "PGRST202";
}

async function persistVoiceSaleDirectly(supabase: SupabaseClient, payload: VoiceSaleRpcPayload) {
  const { data: voiceRecord, error: voiceError } = await supabase
    .from("voice_records")
    .insert({
      shop_id: payload.p_shop_id,
      seller_id: payload.p_seller_id,
      telegram_message_id: payload.p_telegram_message_id,
      audio_path: payload.p_audio_path,
      audio_url: payload.p_audio_url,
      raw_text: payload.p_raw_text,
      cleaned_text: payload.p_cleaned_text,
      parser_json: payload.p_parser_json,
      status: payload.p_status,
      error_message: payload.p_error_message
    })
    .select("id")
    .single();

  if (voiceError) throw voiceError;

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      shop_id: payload.p_shop_id,
      seller_id: payload.p_seller_id,
      voice_record_id: voiceRecord.id,
      raw_text: payload.p_raw_text,
      cleaned_text: payload.p_cleaned_text,
      total_amount: payload.p_total_amount,
      status: payload.p_status
    })
    .select("id")
    .single();

  if (saleError) {
    await supabase.from("voice_records").delete().eq("id", voiceRecord.id);
    throw saleError;
  }

  const items = payload.p_items as ResolvedSaleItem[];
  const { error: itemsError } = await supabase.from("sale_items").insert(
    items.map((item) => ({ sale_id: sale.id, ...item }))
  );

  if (itemsError) {
    await supabase.from("sales").delete().eq("id", sale.id);
    await supabase.from("voice_records").delete().eq("id", voiceRecord.id);
    throw itemsError;
  }

  return { voice_record_id: voiceRecord.id, sale_id: sale.id };
}

async function persistVoiceSale(supabase: SupabaseClient, payload: VoiceSaleRpcPayload) {
  const { data: persistedRows, error } = await supabase.rpc("save_voice_sale", payload);

  if (!error) {
    return Array.isArray(persistedRows) ? persistedRows[0] : persistedRows;
  }

  if (!isMissingSaveVoiceSaleRpc(error)) {
    throw error;
  }

  logger.warn("save_voice_sale_rpc_missing", { code: error.code });
  return persistVoiceSaleDirectly(supabase, payload);
}

export async function saveVoiceSaleForReview(params: {
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
  const needsAttention = parsedSale.needs_review || resolvedItems.some((item) => item.status !== "processed");
  const reviewItems = markSaleItemsForRequiredReview(resolvedItems);
  const saleStatus: VoiceRecordStatus = "needs_review";
  const totalAmount = 0;

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
    resolvedItems: reviewItems
  });
  const persisted = await persistVoiceSale(supabase, rpcPayload);
  if (!persisted?.sale_id || !persisted?.voice_record_id) {
    throw new Error("Voice sale persistence returned no identifiers.");
  }

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
        item_statuses: reviewItems.map((item) => item.status)
      }
    }),
    tryWriteAuditLog(env, {
      shopId: seller.shopId,
      sellerId: seller.id,
      action: "sale.review_required",
      details: {
        sale_id: saleId,
        voice_record_id: voiceRecordId,
        status: saleStatus,
        items_count: reviewItems.length
      }
    })
  ]);

  return {
    saleId,
    voiceRecordId,
    status: saleStatus,
    totalAmount,
    itemCount: reviewItems.length,
    needsAttention
  };
}

export const saveProcessedSale = saveVoiceSaleForReview;

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
