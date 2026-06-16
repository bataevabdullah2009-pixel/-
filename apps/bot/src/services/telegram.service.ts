import { Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";

export function createTelegramBot(env: AppEnv) {
  return new Telegraf(env.TELEGRAM_BOT_TOKEN);
}

export async function downloadTelegramFile(fileUrl: URL) {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Telegram file download failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "audio/ogg";
  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType
  };
}
