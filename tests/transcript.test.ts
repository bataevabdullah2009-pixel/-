import { describe, expect, it } from "vitest";
import {
  deriveVoiceRecordStatus,
  ensureProcessedRecordHasCleanedText,
  parsedSaleSchema,
  voiceRecordSchema
} from "../packages/shared/schemas/record.schema";

describe("transcript validation", () => {
  it("marks empty transcript as needs_review", () => {
    expect(deriveVoiceRecordStatus("", "")).toBe("needs_review");
  });

  it("requires cleaned_text for processed records", () => {
    expect(() => ensureProcessedRecordHasCleanedText("processed", "")).toThrow(
      "Processed record must have cleaned_text."
    );
  });

  it("validates parser JSON response", () => {
    const parsed = parsedSaleSchema.parse({
      items: [
        {
          product_name: "Хлеб",
          quantity: 3,
          unit: "шт",
          price: 40,
          total: 120,
          confidence: 0.95
        }
      ],
      raw_text: "хлеб 3 по 40",
      cleaned_text: "Хлеб — 3 штуки по 40 рублей.",
      needs_review: false
    });

    expect(parsed.items[0]?.product_name).toBe("Хлеб");
  });

  it("validates voice record shape", () => {
    const record = voiceRecordSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      shop_id: "00000000-0000-4000-8000-000000000002",
      seller_id: "00000000-0000-4000-8000-000000000003",
      telegram_message_id: "42",
      audio_url: "https://example.com/audio.ogg",
      raw_text: "хлеб 3 по 40",
      cleaned_text: "Хлеб — 3 штуки по 40 рублей.",
      status: "processed",
      error_message: null,
      created_at: "2026-06-16T10:00:00.000Z"
    });

    expect(record.status).toBe("processed");
  });
});
