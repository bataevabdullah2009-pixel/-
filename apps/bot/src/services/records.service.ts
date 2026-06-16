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

export async function findOrCreateSeller(env: AppEnv, telegramId: number, name: string | null) {
  const supabase = getSupabase(env);
  const shopId = await getDefaultShopId(env);

  const { data: existingSeller, error: selectError } = await supabase
    .from("sellers")
    .select("id, shop_id, name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingSeller?.id) {
    return {
      id: existingSeller.id as string,
      shopId: existingSeller.shop_id as string
    };
  }

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

export async function saveProcessedSale(params: {
  env: AppEnv;
  sellerTelegramId: number;
  sellerName: string | null;
  telegramMessageId: string;
  audioPath: string | null;
  audioUrl: string | null;
  rawText: string;
  parsedSale: ParsedSale;
}) {
  const { env, sellerTelegramId, sellerName, telegramMessageId, audioPath, audioUrl, rawText, parsedSale } = params;
  const supabase = getSupabase(env);
  const seller = await findOrCreateSeller(env, sellerTelegramId, sellerName);
  const resolvedItems = await Promise.all(parsedSale.items.map((item) => resolveSaleItem(env, seller.shopId, item)));
  const saleStatus = resolveSaleStatus(resolvedItems, parsedSale.needs_review);
  const totalAmount = Number(
    resolvedItems
      .filter((item) => item.status === "processed" && item.total !== null)
      .reduce((sum, item) => sum + Number(item.total), 0)
      .toFixed(2)
  );

  const { data: voiceRecord, error: voiceError } = await supabase
    .from("voice_records")
    .insert({
      shop_id: seller.shopId,
      seller_id: seller.id,
      telegram_message_id: telegramMessageId,
      audio_path: audioPath,
      audio_url: audioUrl,
      raw_text: rawText,
      cleaned_text: parsedSale.cleaned_text,
      status: saleStatus
    })
    .select("id")
    .single();

  if (voiceError) {
    throw voiceError;
  }

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      shop_id: seller.shopId,
      seller_id: seller.id,
      voice_record_id: voiceRecord.id,
      raw_text: parsedSale.raw_text,
      cleaned_text: parsedSale.cleaned_text,
      total_amount: totalAmount,
      status: saleStatus
    })
    .select("id")
    .single();

  if (saleError) {
    throw saleError;
  }

  if (resolvedItems.length) {
    const { error: itemsError } = await supabase.from("sale_items").insert(
      resolvedItems.map((item) => ({
        sale_id: sale.id,
        ...item
      }))
    );

    if (itemsError) {
      throw itemsError;
    }
  }

  await writeAuditLog(env, {
    shopId: seller.shopId,
    sellerId: seller.id,
    action: "sale.processed",
    details: {
      sale_id: sale.id,
      voice_record_id: voiceRecord.id,
      status: saleStatus,
      items_count: resolvedItems.length
    }
  });

  return {
    saleId: sale.id as string,
    voiceRecordId: voiceRecord.id as string,
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
  errorMessage: string;
}) {
  const { env, sellerTelegramId, sellerName, telegramMessageId, audioPath, audioUrl, errorMessage } = params;
  const supabase = getSupabase(env);
  const seller = await findOrCreateSeller(env, sellerTelegramId, sellerName);

  const { data, error } = await supabase
    .from("voice_records")
    .insert({
      shop_id: seller.shopId,
      seller_id: seller.id,
      telegram_message_id: telegramMessageId,
      audio_path: audioPath ?? null,
      audio_url: audioUrl ?? null,
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
