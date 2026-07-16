import { parsedSaleSchema } from "@voice-sales-log/shared/schemas/record.schema";
import type { ParsedSale } from "@voice-sales-log/shared/types";
import {
  buildFallbackSaleItemsFromTranscript,
  enforceTranscriptEvidence
} from "@voice-sales-log/shared/utils/sale-parser";
import type { AppEnv } from "../config/env";
import {
  formatResponseBodyForLog,
  getErrorLogMeta,
  logger
} from "../utils/logger";

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

export async function cleanupTranscript(env: AppEnv, rawText: string) {
  if (!rawText.trim()) {
    return "";
  }

  try {
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
      logger.warn("LLM_CLEANUP_FALLBACK", {
        providerHost: new URL(env.LLM_API_URL).host,
        httpStatus: response.status,
        responseBody: formatResponseBodyForLog(await response.text())
      });
      return simpleCleanup(rawText);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content?.trim() || simpleCleanup(rawText);
  } catch (error) {
    logger.warn("LLM_CLEANUP_FALLBACK", {
      providerHost: new URL(env.LLM_API_URL).host,
      ...getErrorLogMeta(error)
    });
    return simpleCleanup(rawText);
  }
}

export function buildNeedsReviewParseResult(rawText: string, cleanedText: string, errorMessage: string) {
  const fallbackItems = buildFallbackSaleItemsFromTranscript(rawText, cleanedText, 0.6);

  return {
    parsedSale: {
      items: fallbackItems,
      raw_text: rawText,
      cleaned_text: cleanedText,
      needs_review: true
    } satisfies ParsedSale,
    parserJson: null,
    errorMessage
  };
}

export async function parseSaleTranscript(
  env: AppEnv,
  rawText: string,
  cleanedText: string
): Promise<{ parsedSale: ParsedSale; parserJson: unknown | null; errorMessage: string | null }> {
  if (!rawText.trim()) {
    return buildNeedsReviewParseResult(rawText, cleanedText, "STT returned an empty transcript.");
  }

  try {
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
          content: `Ты извлекаешь все позиции продажи из русского текста и возвращаешь только один строгий JSON-объект без markdown и пояснений.
Схема: {"items":[{"product_name":string,"quantity":number|null,"unit":"шт"|"кг"|null,"price":number|null,"total":number|null,"confidence":number}],"raw_text":string,"cleaned_text":string,"needs_review":boolean}.
Правила:
- сохрани каждую названную товарную позицию и порядок позиций;
- product_name бери только из текста, не включай в него количество, единицу, цену или слово «по»;
- quantity распознавай только рядом с «шт», «штук», «штуки», «штука», «кг», «килограмм», «килограмма» или «килограммов»; иначе quantity=null;
- price распознавай только рядом с «рублей», «руб», «₽» либо в конструкции «по 100»; иначе price=null;
- не выдумывай цену или количество и не путай их местами;
- total равен quantity * price только когда оба значения известны, иначе null;
- confidence ниже 0.75 при любой неоднозначности, needs_review=true при неоднозначности.
Примеры: «Сливки 33%, пять штук по 100 рублей» => Сливки 33%, 5, шт, 100, 500. «Шоколад Шаковик 5 штук» => Шоколад Шаковик, 5, шт, null, null. «Шоколад 2 килограмма по 2000 рублей» => Шоколад, 2, кг, 2000, 4000.`
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
      const responseBody = await response.text();
      logger.warn("LLM_PARSER_FALLBACK", {
        providerHost: new URL(env.LLM_API_URL).host,
        httpStatus: response.status,
        responseBody: formatResponseBodyForLog(responseBody)
      });
      return buildNeedsReviewParseResult(
        rawText,
        cleanedText,
        `LLM parser request failed with status ${response.status}.`
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return buildNeedsReviewParseResult(rawText, cleanedText, "LLM parser returned an empty response.");
    }

    const parserJson: unknown = JSON.parse(content.trim());
    const parsed = parsedSaleSchema.parse(parserJson);

    return {
      parsedSale: enforceTranscriptEvidence(parsed, rawText, cleanedText),
      parserJson,
      errorMessage: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM parser error.";
    logger.warn("LLM_PARSER_FALLBACK", {
      providerHost: new URL(env.LLM_API_URL).host,
      ...getErrorLogMeta(error)
    });
    return buildNeedsReviewParseResult(rawText, cleanedText, `LLM parser fallback: ${message}`);
  }
}
