import type { Context, Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";
import {
  createReportKeyboard,
  createReportMenuButton,
  createReportReplyKeyboard
} from "../services/telegram.service";
import { logger } from "../utils/logger";

export function registerStartHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.start(async (ctx) => {
    const telegramId = ctx.from?.id;

    if (!telegramId) {
      await ctx.reply("Не удалось определить Telegram ID. Попробуйте ещё раз.");
      return;
    }

    try {
      await ctx.setChatMenuButton(createReportMenuButton(env.NEXT_PUBLIC_APP_URL));
    } catch (error) {
      logger.warn("report_menu_button_setup_failed", { telegramId, error });
    }

    await ctx.reply(
      "Здравствуйте! Отправьте голосовое с продажей: товар, количество и цену.",
      createReportReplyKeyboard(env.NEXT_PUBLIC_APP_URL)
    );
    await ctx.reply(
      "Откройте отчёт новой кнопкой ниже.",
      createReportKeyboard(env.NEXT_PUBLIC_APP_URL)
    );
  });
}
