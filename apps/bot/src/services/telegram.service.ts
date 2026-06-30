import { Markup, Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";

export const VOICE_SALE_REVIEW_CALLBACK_PREFIX = "voice_sale_review";

export function createTelegramBot(env: AppEnv) {
  return new Telegraf(env.TELEGRAM_BOT_TOKEN);
}

export function createReportKeyboard(
  appUrl: string,
  debugTelegramWebApp = process.env.DEBUG_TELEGRAM_WEBAPP === "true"
) {
  const rows = [[Markup.button.webApp("Открыть отчёт", appUrl)]];

  if (debugTelegramWebApp) {
    const debugUrl = new URL("/debug-telegram", appUrl).toString();
    rows.push([Markup.button.webApp("Диагностика Telegram", debugUrl)]);
  }

  return Markup.inlineKeyboard(rows);
}

export function createReportReplyKeyboard(appUrl: string) {
  return Markup.keyboard([
    [Markup.button.webApp("Открыть отчёт", appUrl)]
  ]).resize();
}

export function createReportMenuButton(appUrl: string) {
  return {
    type: "web_app" as const,
    text: "Открыть отчёт",
    web_app: { url: appUrl }
  };
}

export function createVoiceSaleReviewCallbackData(action: "confirm" | "cancel", saleId: string) {
  return `${action}:${saleId}`;
}

type ReviewKeyboardButton = ReturnType<typeof Markup.button.callback> | ReturnType<typeof Markup.button.webApp>;

export function createVoiceSaleReviewKeyboard(saleId: string, appUrl?: string) {
  const rows: ReviewKeyboardButton[][] = [
    [
      Markup.button.callback("✅ Подтвердить", createVoiceSaleReviewCallbackData("confirm", saleId)),
      Markup.button.callback("❌ Отмена", createVoiceSaleReviewCallbackData("cancel", saleId))
    ]
  ];

  if (appUrl) {
    rows.push([Markup.button.webApp("Открыть отчёт", appUrl)]);
  }

  return Markup.inlineKeyboard(rows);
}

function punctuateRecognizedText(recognizedText: string) {
  const text = recognizedText.trim();
  return /[.!?…]$/u.test(text) ? text : `${text}.`;
}

export function createVoiceSaleUserMessage(recognizedText: string, needsAttention: boolean) {
  const text = punctuateRecognizedText(recognizedText);

  if (needsAttention) {
    return `⚠️ Запись сохранена, но нужно подтвердить товары и цены.\nРаспознано: ${text}`;
  }

  return `✅ Запись сохранена: ${text}`;
}

export function createVoiceSaveFailureMessage() {
  return "⚠️ Не удалось сохранить запись. Попробуйте ещё раз.";
}

function safeTelegramFileName(fileId: string) {
  return `${fileId.replace(/[^a-zA-Z0-9_-]/g, "_")}.ogg`;
}

export async function downloadTelegramVoice(fileUrl: URL, fileId: string) {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Telegram file download failed: ${response.status}`);
  }

  const telegramContentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    contentType: "audio/ogg",
    fileName: safeTelegramFileName(fileId),
    fileSize: buffer.byteLength,
    telegramContentType
  };
}
