import { z } from "zod";

export const voiceRecordStatusSchema = z.enum([
  "pending",
  "processed",
  "needs_review",
  "failed"
]);

export const saleItemStatusSchema = z.enum([
  "processed",
  "needs_price",
  "needs_review",
  "failed"
]);

export const voiceRecordSchema = z.object({
  id: z.string().uuid(),
  shop_id: z.string().uuid(),
  seller_id: z.string().uuid(),
  telegram_message_id: z.string().nullable(),
  audio_url: z.string().url().nullable(),
  raw_text: z.string().nullable(),
  cleaned_text: z.string().nullable(),
  parser_json: z.unknown().nullable().optional(),
  status: voiceRecordStatusSchema,
  error_message: z.string().nullable(),
  created_at: z.string().datetime()
});

export const saleSchema = z.object({
  id: z.string().uuid(),
  shop_id: z.string().uuid(),
  seller_id: z.string().uuid().nullable(),
  voice_record_id: z.string().uuid().nullable(),
  raw_text: z.string().nullable(),
  cleaned_text: z.string().nullable(),
  total_amount: z.number().nonnegative(),
  status: voiceRecordStatusSchema,
  created_at: z.string().datetime()
});

export const saleItemSchema = z.object({
  id: z.string().uuid(),
  sale_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().trim(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).default("шт"),
  price: z.number().nonnegative().nullable(),
  total: z.number().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
  status: saleItemStatusSchema,
  created_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
  deleted_reason: z.enum(["manual", "day_reset"]).nullable().optional(),
  deleted_previous_status: saleItemStatusSchema.nullable().optional()
});

export const parsedSaleItemSchema = z.object({
  product_name: z.string().trim().default(""),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().nullable().optional().default("шт"),
  price: z.number().nonnegative().nullable().optional().default(null),
  total: z.number().nonnegative().nullable().optional().default(null),
  confidence: z.number().min(0).max(1).optional().default(0.5)
}).strict();

export const parsedSaleSchema = z.object({
  items: z.array(parsedSaleItemSchema),
  raw_text: z.string(),
  cleaned_text: z.string(),
  needs_review: z.boolean()
}).strict();

export function deriveVoiceRecordStatus(rawText: string | null | undefined, cleanedText: string | null | undefined) {
  if (!rawText?.trim()) {
    return "needs_review" as const;
  }

  if (!cleanedText?.trim()) {
    return "needs_review" as const;
  }

  return "processed" as const;
}

export function ensureProcessedRecordHasCleanedText(status: string, cleanedText: string | null | undefined) {
  if (status === "processed" && !cleanedText?.trim()) {
    throw new Error("Processed record must have cleaned_text.");
  }
}
