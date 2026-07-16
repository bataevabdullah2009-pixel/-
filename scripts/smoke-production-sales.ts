import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SaleItemStatus, VoiceRecordStatus } from "@voice-sales-log/shared/types";
import { normalizeSaleItemFields } from "@voice-sales-log/shared/utils/date-range";
import { getEnv } from "../apps/bot/src/config/env";
import {
  buildVoiceSaleRpcPayload,
  cancelVoiceSaleWithClient,
  confirmVoiceSaleWithClient,
  persistVoiceSale,
  type SellerContext
} from "../apps/bot/src/services/records.service";
import {
  cleanupTranscript,
  parseSaleTranscript
} from "../apps/bot/src/services/cleanup-text.service";
import { uploadVoiceAudio } from "../apps/bot/src/services/storage.service";
import { transcribeAudio } from "../apps/bot/src/services/transcription.service";

type SmokeItem = {
  product_id: null;
  product_name: string;
  quantity: number;
  unit: string;
  price: number | null;
  total: number | null;
  confidence: number;
  status: SaleItemStatus;
};

type SavedSmokeSale = {
  saleId: string;
  voiceRecordId: string;
};

const confirmationPhrase = "voice-sales-log";

if (process.env.PRODUCTION_SMOKE_CONFIRM !== confirmationPhrase) {
  throw new Error(
    `Production smoke is disabled. Set PRODUCTION_SMOKE_CONFIRM=${confirmationPhrase} explicitly.`
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function number(value: unknown) {
  return Number(value ?? 0);
}

async function assertSchema(client: SupabaseClient) {
  const checks = await Promise.all([
    client.from("shops").select("id, name, created_at").limit(1),
    client.from("owners").select("id, shop_id, telegram_id, is_active").limit(1),
    client.from("sellers").select("id, shop_id, telegram_id, name, is_active").limit(1),
    client.from("products").select("id, shop_id, name, unit, is_active").limit(1),
    client.from("voice_records").select(
      "id, shop_id, seller_id, telegram_message_id, audio_path, audio_url, raw_text, cleaned_text, parser_json, status, error_message"
    ).limit(1),
    client.from("sales").select(
      "id, shop_id, seller_id, voice_record_id, raw_text, cleaned_text, total_amount, status"
    ).limit(1),
    client.from("sale_items").select(
      "id, sale_id, product_id, product_name, quantity, unit, price, total, confidence, status, deleted_at, deleted_reason, deleted_previous_status, updated_at"
    ).limit(1),
    client.from("audit_logs").select("id, shop_id, seller_id, action, details, created_at").limit(1)
  ]);

  for (const check of checks) {
    if (check.error) {
      throw check.error;
    }
  }

  const { data: buckets, error: bucketsError } = await client.storage.listBuckets();
  if (bucketsError) {
    throw bucketsError;
  }

  return buckets ?? [];
}

async function saveSmokeSale(params: {
  client: SupabaseClient;
  seller: SellerContext;
  telegramMessageId: string;
  transcript: string;
  status: VoiceRecordStatus;
  totalAmount: number;
  items: SmokeItem[];
}): Promise<SavedSmokeSale> {
  const parsedItems = params.items.map((item) => ({
    product_name: item.product_name,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    total: item.total,
    confidence: item.confidence
  }));
  const payload = buildVoiceSaleRpcPayload({
    seller: params.seller,
    telegramMessageId: params.telegramMessageId,
    audioPath: null,
    audioUrl: null,
    rawText: params.transcript,
    parsedSale: {
      items: parsedItems,
      raw_text: params.transcript,
      cleaned_text: params.transcript,
      needs_review: params.status === "needs_review"
    },
    parserJson: { smoke: true, items: parsedItems },
    errorMessage: null,
    saleStatus: params.status,
    totalAmount: params.totalAmount,
    resolvedItems: params.items
  });
  const saved = await persistVoiceSale(params.client, payload);

  return {
    saleId: String(saved.sale_id),
    voiceRecordId: String(saved.voice_record_id)
  };
}

async function readSale(client: SupabaseClient, saleId: string) {
  const { data: sale, error: saleError } = await client
    .from("sales")
    .select("id, voice_record_id, status, total_amount")
    .eq("id", saleId)
    .single();
  if (saleError) throw saleError;

  const { data: items, error: itemsError } = await client
    .from("sale_items")
    .select(
      "id, product_name, quantity, unit, price, total, status, deleted_at, deleted_reason, deleted_previous_status"
    )
    .eq("sale_id", saleId)
    .order("created_at", { ascending: true });
  if (itemsError) throw itemsError;

  return { sale, items: items ?? [] };
}

async function cleanup(
  client: SupabaseClient,
  sales: SavedSmokeSale[]
) {
  if (!sales.length) return;

  const saleIds = sales.map((sale) => sale.saleId);
  const voiceRecordIds = sales.map((sale) => sale.voiceRecordId);
  const operations = [
    await client.from("sale_items").delete().in("sale_id", saleIds),
    await client.from("sales").delete().in("id", saleIds),
    await client.from("voice_records").delete().in("id", voiceRecordIds)
  ];
  const cleanupError = operations.find((operation) => operation.error)?.error;
  if (cleanupError) throw cleanupError;

  const { count, error } = await client
    .from("voice_records")
    .select("id", { count: "exact", head: true })
    .in("id", voiceRecordIds);
  if (error) throw error;
  assert(count === 0, "Production smoke cleanup left temporary voice records behind.");
}

const env = getEnv();
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const createdSales: SavedSmokeSale[] = [];
const uploadedPaths: string[] = [];
const prefix = `stabilization-${Date.now()}`;
let primaryError: unknown = null;

try {
  const buckets = await assertSchema(client);
  assert(
    buckets.some((bucket) => bucket.name === env.SUPABASE_STORAGE_BUCKET),
    `Storage bucket ${env.SUPABASE_STORAGE_BUCKET} does not exist.`
  );

  const { data: sellerRow, error: sellerError } = await client
    .from("sellers")
    .select("id, shop_id, telegram_id")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (sellerError) throw sellerError;
  const seller: SellerContext = {
    id: String(sellerRow.id),
    shopId: String(sellerRow.shop_id)
  };

  const fixturePath = fileURLToPath(
    new URL("../tests/fixtures/voice-sale-two-items.ogg", import.meta.url)
  );
  const audio = await readFile(fixturePath);
  assert(audio.length > 0, "Audio fixture is empty.");
  const uploaded = await uploadVoiceAudio(
    env,
    audio,
    "audio/ogg",
    Number(sellerRow.telegram_id)
  );
  uploadedPaths.push(uploaded.path);
  const transcript = await transcribeAudio(env, {
    buffer: audio,
    filename: "voice-sale-two-items.ogg",
    contentType: "audio/ogg"
  });
  assert(transcript.trim().length > 0, "Audio pipeline returned an empty transcript.");
  const cleanedText = await cleanupTranscript(env, transcript);
  const parsed = await parseSaleTranscript(env, transcript, cleanedText);
  assert(parsed.errorMessage === null, `Audio pipeline parser fallback: ${parsed.errorMessage}`);
  const normalizedPipelineItems = parsed.parsedSale.items.map((item) => {
    const normalized = normalizeSaleItemFields(item);
    return {
      product_id: null,
      product_name: normalized.product_name,
      quantity: normalized.quantity,
      unit: normalized.unit,
      price: normalized.price,
      total: normalized.total,
      confidence: normalized.confidence,
      status: normalized.status
    } satisfies SmokeItem;
  });
  assert(normalizedPipelineItems.length === 2, "Audio pipeline did not extract two items.");
  assert(
    normalizedPipelineItems.every((item) => item.status === "processed"),
    "Audio pipeline produced a review status for a complete item."
  );
  const pipelineTotal = normalizedPipelineItems.reduce(
    (sum, item) => sum + number(item.total),
    0
  );
  assert(pipelineTotal === 1_100, "Audio pipeline total is not 1100.");
  const pipelineSaved = await persistVoiceSale(client, buildVoiceSaleRpcPayload({
    seller,
    telegramMessageId: `${prefix}-audio-pipeline`,
    audioPath: uploaded.path,
    audioUrl: uploaded.publicUrl,
    rawText: transcript,
    parsedSale: parsed.parsedSale,
    parserJson: parsed.parserJson,
    errorMessage: null,
    saleStatus: "processed",
    totalAmount: pipelineTotal,
    resolvedItems: normalizedPipelineItems
  }));
  const pipelineSale = {
    saleId: String(pipelineSaved.sale_id),
    voiceRecordId: String(pipelineSaved.voice_record_id)
  };
  createdSales.push(pipelineSale);
  const pipelineState = await readSale(client, pipelineSale.saleId);
  assert(pipelineState.items.length === 2, "Audio pipeline did not persist two item rows.");
  assert(number(pipelineState.sale.total_amount) === 1_100, "Persisted audio pipeline total is not 1100.");

  const single = await saveSmokeSale({
    client,
    seller,
    telegramMessageId: `${prefix}-single`,
    transcript: "Буханка хлеба 5 штук по 100 рублей.",
    status: "processed",
    totalAmount: 500,
    items: [{
      product_id: null,
      product_name: "Буханка хлеба",
      quantity: 5,
      unit: "шт",
      price: 100,
      total: 500,
      confidence: 1,
      status: "processed"
    }]
  });
  createdSales.push(single);
  const singleState = await readSale(client, single.saleId);
  assert(singleState.sale.status === "processed", "Single-item sale status is not processed.");
  assert(number(singleState.sale.total_amount) === 500, "Single-item sale total is not 500.");
  assert(singleState.items.length === 1, "Single-item sale did not persist exactly one item.");
  assert(number(singleState.items[0]?.quantity) === 5, "Single-item quantity is not 5.");
  assert(number(singleState.items[0]?.price) === 100, "Single-item price is not 100.");

  const twoItems = await saveSmokeSale({
    client,
    seller,
    telegramMessageId: `${prefix}-two-items`,
    transcript: "Буханка хлеба 5 штук по 100 рублей. Сникерс 3 штуки по 200 рублей.",
    status: "processed",
    totalAmount: 1_100,
    items: [
      {
        product_id: null,
        product_name: "Буханка хлеба",
        quantity: 5,
        unit: "шт",
        price: 100,
        total: 500,
        confidence: 1,
        status: "processed"
      },
      {
        product_id: null,
        product_name: "Сникерс",
        quantity: 3,
        unit: "шт",
        price: 200,
        total: 600,
        confidence: 1,
        status: "processed"
      }
    ]
  });
  createdSales.push(twoItems);
  const twoItemState = await readSale(client, twoItems.saleId);
  assert(twoItemState.items.length === 2, "Two-item sale was not split into two rows.");
  assert(number(twoItemState.items[0]?.total) === 500, "First item total is not 500.");
  assert(number(twoItemState.items[1]?.total) === 600, "Second item total is not 600.");
  assert(number(twoItemState.sale.total_amount) === 1_100, "Two-item sale total is not 1100.");

  const mixed = await saveSmokeSale({
    client,
    seller,
    telegramMessageId: `${prefix}-mixed`,
    transcript: "Буханка хлеба 5 штук по 100 рублей. Вода 2 штуки.",
    status: "needs_review",
    totalAmount: 500,
    items: [
      {
        product_id: null,
        product_name: "Буханка хлеба",
        quantity: 5,
        unit: "шт",
        price: 100,
        total: 500,
        confidence: 1,
        status: "processed"
      },
      {
        product_id: null,
        product_name: "Вода",
        quantity: 2,
        unit: "шт",
        price: null,
        total: null,
        confidence: 0.8,
        status: "needs_price"
      }
    ]
  });
  createdSales.push(mixed);
  const mixedState = await readSale(client, mixed.saleId);
  assert(mixedState.sale.status === "needs_review", "Mixed sale is not in review.");
  assert(mixedState.items[0]?.status === "processed", "Complete item was blocked by incomplete item.");
  assert(mixedState.items[1]?.status === "needs_price", "Incomplete item is not marked needs_price.");

  const confirmation = await saveSmokeSale({
    client,
    seller,
    telegramMessageId: `${prefix}-confirm`,
    transcript: "Молоко 2 штуки по 90 рублей.",
    status: "needs_review",
    totalAmount: 0,
    items: [{
      product_id: null,
      product_name: "Молоко",
      quantity: 2,
      unit: "шт",
      price: 90,
      total: 180,
      confidence: 0.7,
      status: "needs_review"
    }]
  });
  createdSales.push(confirmation);
  const confirmationResult = await confirmVoiceSaleWithClient(client, seller, confirmation.saleId);
  assert(confirmationResult.ok, "Confirmation service returned an error.");
  const confirmationState = await readSale(client, confirmation.saleId);
  assert(confirmationState.sale.status === "processed", "Confirmed sale was not persisted as processed.");
  assert(number(confirmationState.sale.total_amount) === 180, "Confirmed sale total is not 180.");
  assert(confirmationState.items[0]?.status === "processed", "Confirmed item was not persisted as processed.");

  const cancellation = await saveSmokeSale({
    client,
    seller,
    telegramMessageId: `${prefix}-cancel`,
    transcript: "Вода 2 штуки.",
    status: "needs_review",
    totalAmount: 0,
    items: [{
      product_id: null,
      product_name: "Вода",
      quantity: 2,
      unit: "шт",
      price: null,
      total: null,
      confidence: 0.8,
      status: "needs_price"
    }]
  });
  createdSales.push(cancellation);
  const cancellationResult = await cancelVoiceSaleWithClient(client, seller, cancellation.saleId);
  assert(cancellationResult.ok && cancellationResult.status === "cancelled", "Cancellation service failed.");
  const cancellationState = await readSale(client, cancellation.saleId);
  assert(cancellationState.sale.status === "cancelled", "Cancelled sale status was not persisted.");
  assert(number(cancellationState.sale.total_amount) === 0, "Cancelled sale total is not zero.");
  assert(cancellationState.items[0]?.status === "excluded", "Cancelled item was not excluded.");
  assert(Boolean(cancellationState.items[0]?.deleted_at), "Cancelled item was not soft-deleted.");

  console.log(JSON.stringify({
    smoke: "production-sales",
    schema: "compatible",
    storageBucket: "available",
    scenarios: {
      singleComplete: "verified",
      twoComplete: "verified",
      mixedReview: "verified",
      confirmation: "verified",
      cancellation: "verified",
      audioPipeline: "verified"
    }
  }));
} catch (error) {
  primaryError = error;
}

let cleanupError: unknown = null;
try {
  await cleanup(client, createdSales);
  if (uploadedPaths.length) {
    const { error: storageCleanupResult } = await client.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .remove(uploadedPaths);
    if (storageCleanupResult) throw storageCleanupResult;
  }
  console.log(JSON.stringify({ smoke: "production-sales-cleanup", removed: createdSales.length }));
} catch (error) {
  cleanupError = error;
  console.error(JSON.stringify({
    smoke: "production-sales-cleanup",
    error: error instanceof Error ? error.message : String(error)
  }));
}

if (primaryError) {
  throw primaryError;
}
if (cleanupError) {
  throw cleanupError;
}
