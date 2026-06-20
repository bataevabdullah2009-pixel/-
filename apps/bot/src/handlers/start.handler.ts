import type { Context, Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";
import { createReportKeyboard } from "../services/telegram.service";

export function registerStartHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.start(async (ctx) => {
    const telegramId = ctx.from?.id;

    if (!telegramId) {
      await ctx.reply("Не удалось определить Telegram ID. Попробуйте ещё раз.");
      return;
    }

    await ctx.reply(
      "Здравствуйте! Откройте отчёт или отправьте голосовое с продажей: товар, количество и цену.",
      createReportKeyboard(env.NEXT_PUBLIC_APP_URL)
    );
  });
}
