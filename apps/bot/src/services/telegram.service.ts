import { Markup, Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";

export function createTelegramBot(env: AppEnv) {
  return new Telegraf(env.TELEGRAM_BOT_TOKEN);
}

export function createReportKeyboard(appUrl: string) {
  const debugUrl = new URL("/debug-telegram", appUrl).toString();

  return Markup.inlineKeyboard([
    [Markup.button.webApp("Открыть отчёт", appUrl)],
    [Markup.button.webApp("Диагностика Telegram", debugUrl)]
  ]);
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

export function createVoiceSaleUserMessage(recognizedText: string, needsAttention: boolean) {
  if (needsAttention) {
    return `⚠️ Запись сохранена, но нужно проверить товары и цены.\nРаспознано: ${recognizedText}`;
  }

  return `✅ Запись сохранена: ${recognizedText}`;
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
