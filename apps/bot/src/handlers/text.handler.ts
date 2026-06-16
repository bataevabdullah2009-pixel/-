import type { Context, Telegraf } from "telegraf";

export function registerTextHandler(bot: Telegraf<Context>) {
  bot.on("text", async (ctx) => {
    await ctx.reply("Для журнала продаж отправьте голосовое сообщение.");
  });
}
