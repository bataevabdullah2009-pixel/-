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

function resolveSaleStatus(items: Array<{ status: SaleItemStatus }>, parserNeedsReview: boolean): VoiceRecordStatus {
  if (!items.length) {
    return "needs_review";
  }

  if (parserNeedsReview || items.some((item) => item.status !== "processed")) {
    return "needs_review";
  }

  return "processed";
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

export async function saveProcessedSale(params: {
  env: AppEnv;
  sellerTelegramId: number;
  sellerName: string | null;
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
    sellerTelegramId,
    sellerName,
    telegramMessageId,
    audioPath,
    audioUrl,
    rawText,
    parsedSale,
    parserJson,
    errorMessage
  } = params;
  const supabase = getSupabase(env);
  const seller = await requireSeller(env, sellerTelegramId, sellerName);
  const resolvedItems = await Promise.all(parsedSale.items.map((item) => resolveSaleItem(env, seller.shopId, item)));
  const saleStatus = resolveSaleStatus(resolvedItems, parsedSale.needs_review);
  const totalAmount = Number(
    resolvedItems
      .filter((item) => item.status === "processed" && item.total !== null)
      .reduce((sum, item) => sum + Number(item.total), 0)
      .toFixed(2)
  );

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
  const { data: persistedRows, error: persistenceError } = await supabase.rpc("save_voice_sale", rpcPayload);

  if (persistenceError) {
    throw persistenceError;
  }

  const persisted = Array.isArray(persistedRows) ? persistedRows[0] : persistedRows;
  if (!persisted?.sale_id || !persisted?.voice_record_id) {
    throw new Error("Voice sale persistence returned no identifiers.");
  }

  const saleId = String(persisted.sale_id);
  const voiceRecordId = String(persisted.voice_record_id);

  await writeAuditLog(env, {
    shopId: seller.shopId,
    sellerId: seller.id,
    action: "sale_items_created",
    details: {
      sale_id: saleId,
      voice_record_id: voiceRecordId,
      items_count: resolvedItems.length,
      item_statuses: resolvedItems.map((item) => item.status)
    }
  });

  await writeAuditLog(env, {
    shopId: seller.shopId,
    sellerId: seller.id,
    action: "sale.processed",
    details: {
      sale_id: saleId,
      voice_record_id: voiceRecordId,
      status: saleStatus,
      items_count: resolvedItems.length
    }
  });

  return {
    saleId,
    voiceRecordId,
    status: saleStatus,
    totalAmount
  };
}

export async function saveFailedVoiceRecord(params: {
  env: AppEnv;
  sellerTelegramId: number;
  sellerName: string | null;
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
    sellerTelegramId,
    sellerName,
    telegramMessageId,
    audioPath,
    audioUrl,
    rawText,
    cleanedText,
    parserJson,
    errorMessage
  } = params;
  const supabase = getSupabase(env);
  const seller = await requireSeller(env, sellerTelegramId, sellerName);

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

  await writeAuditLog(env, {
    shopId: seller.shopId,
    sellerId: seller.id,
    action: "voice.failed",
    details: {
      voice_record_id: data.id,
      error: errorMessage
    }
  });
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
