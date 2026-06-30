import type { Context, Telegraf } from "telegraf";
import type { Update } from "telegraf/types";
import { getEnv } from "../config/env";
import { registerStartHandler } from "../handlers/start.handler";
import { registerTextHandler } from "../handlers/text.handler";
import { registerReviewHandler } from "../handlers/review.handler";
import { registerVoiceHandler } from "../handlers/voice.handler";
import { createTelegramBot } from "../services/telegram.service";
import { logger } from "../utils/logger";

let bot: Telegraf<Context> | null = null;

export function getTelegramUpdateBot() {
  if (!bot) {
    const env = getEnv();

    bot = createTelegramBot(env);
    registerStartHandler(bot, env);
    registerReviewHandler(bot, env);
    registerVoiceHandler(bot, env);
    registerTextHandler(bot);

    bot.catch((error) => {
      logger.error("Unhandled bot error", { error });
    });
  }

  return bot;
}

export async function processTelegramUpdate(update: Update) {
  await getTelegramUpdateBot().handleUpdate(update);
}
