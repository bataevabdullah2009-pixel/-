import type { Context, Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";
import { requireSeller, SellerAccessError } from "../services/records.service";
import { logger } from "../utils/logger";

export function registerStartHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.start(async (ctx) => {
    const telegramId = ctx.from?.id;
    const name = ctx.from?.first_name ?? ctx.from?.username ?? "Продавец";

    if (!telegramId) {
      await ctx.reply("Не удалось определить Telegram ID. Попробуйте ещё раз.");
      return;
    }

    try {
      await requireSeller(env, telegramId, name);
      await ctx.reply("Здравствуйте! Отправьте голосовое с продажей: товар, количество и цену.");
    } catch (error) {
      if (error instanceof SellerAccessError) {
        await ctx.reply(error.message);
        return;
      }

      logger.error("Failed to register seller", { error });
      await ctx.reply("Не удалось проверить доступ продавца. Попробуйте позже.");
    }
  });
}
