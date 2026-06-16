import { Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";

export function createTelegramBot(env: AppEnv) {
  return new Telegraf(env.TELEGRAM_BOT_TOKEN);
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
