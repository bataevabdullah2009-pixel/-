import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "../apps/bot/src/services/transcription.service";
import {
  deriveVoiceRecordStatus,
  ensureProcessedRecordHasCleanedText,
  parsedSaleSchema,
  voiceRecordSchema
} from "../packages/shared/schemas/record.schema";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("asks STT to transcribe Russian speech", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "Ники четыре штуки по сто рублей" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await transcribeAudio({
      TELEGRAM_BOT_TOKEN: "token",
      NEXT_PUBLIC_APP_URL: "https://voice-sales.example.com",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      SUPABASE_STORAGE_BUCKET: "voice-records",
      STT_API_KEY: "stt",
      STT_API_URL: "https://api.groq.com/openai/v1/audio/transcriptions",
      STT_MODEL: "whisper-large-v3",
      LLM_API_KEY: "llm",
      LLM_API_URL: "https://llm.example.com",
      LLM_MODEL: "llm-model",
      DEMO_MODE: false,
      DEFAULT_SHOP_NAME: "Демо-магазин"
    }, {
      buffer: Buffer.from("audio"),
      filename: "voice.ogg",
      contentType: "audio/ogg"
    });

    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("language")).toBe("ru");
    expect(body.get("prompt")).toContain("Русская запись продажи");
  });
});
