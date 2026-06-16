import { parsedSaleSchema } from "@voice-sales-log/shared/schemas/record.schema";
import type { ParsedSale } from "@voice-sales-log/shared/types";
import type { AppEnv } from "../config/env";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function simpleCleanup(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  const capitalized = normalized.charAt(0).toLocaleUpperCase("ru-RU") + normalized.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function extractJson(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response does not contain JSON object.");
  }

  return trimmed.slice(start, end + 1);
}

export async function cleanupTranscript(env: AppEnv, rawText: string) {
  if (!rawText.trim()) {
    return "";
  }

  const response = await fetch(env.LLM_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Ты очищаешь русский текст голосовой продажи. Исправь пунктуацию и регистр. Не добавляй товары, цены, количество или аналитику."
        },
        {
          role: "user",
          content: rawText
        }
      ],
      temperature: 0
    })
  });

  if (!response.ok) {
    return simpleCleanup(rawText);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content?.trim() || simpleCleanup(rawText);
}

export async function parseSaleTranscript(env: AppEnv, rawText: string, cleanedText: string): Promise<ParsedSale> {
  if (!rawText.trim()) {
    return {
      items: [],
      raw_text: rawText,
      cleaned_text: cleanedText,
      needs_review: true
    };
  }

  const response = await fetch(env.LLM_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Ты извлекаешь позиции продажи из русского текста. Верни только строгий JSON без markdown. Не выдумывай товар или цену. Названия приводи к базовой форме: хлеба -> Хлеб, молока -> Молоко. Единицы штука/штуки/штук/шт. приводи к шт, если unit не указан — шт. Если цена не названа, price и total должны быть null. Если количество не названо, quantity=1 и confidence ниже. Поля: items[{product_name,quantity,unit,price,total,confidence}], raw_text, cleaned_text, needs_review."
        },
        {
          role: "user",
          content: JSON.stringify({ raw_text: rawText, cleaned_text: cleanedText })
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    return {
      items: [],
      raw_text: rawText,
      cleaned_text: cleanedText,
      needs_review: true
    };
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM parser returned empty response.");
  }

  const parsed = JSON.parse(extractJson(content));
  return parsedSaleSchema.parse(parsed);
}
