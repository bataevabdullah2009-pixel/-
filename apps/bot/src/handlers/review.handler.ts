import type { Context, Telegraf } from "telegraf";
import type { AppEnv } from "../config/env";
import {
  cancelVoiceSale,
  confirmVoiceSale,
  requireSeller,
  SellerAccessError
} from "../services/records.service";
import { VOICE_SALE_REVIEW_CALLBACK_PREFIX } from "../services/telegram.service";
import { formatErrorMessage, logger } from "../utils/logger";

const reviewActionPattern = new RegExp(`^${VOICE_SALE_REVIEW_CALLBACK_PREFIX}:(confirm|cancel):([0-9a-fA-F-]{36})$`);

async function showReviewDecision(ctx: Context, message: string) {
  try {
    await ctx.editMessageText(message);
  } catch {
    await ctx.reply(message);
  }
}

export function registerReviewHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.action(reviewActionPattern, async (ctx) => {
    const callbackData = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    const match = typeof callbackData === "string"
      ? callbackData.match(reviewActionPattern)
      : null;
    const telegramId = ctx.from?.id;

    if (!match || !telegramId) {
      await ctx.answerCbQuery("Не удалось обработать кнопку.");
      return;
    }

    const [, action, saleId] = match;
    const sellerName = ctx.from?.first_name ?? ctx.from?.username ?? null;

    try {
      const seller = await requireSeller(env, telegramId, sellerName);
      const result = action === "confirm"
        ? await confirmVoiceSale({ env, seller, saleId })
        : await cancelVoiceSale({ env, seller, saleId });

      await ctx.answerCbQuery(result.ok ? "Готово" : "Нужна проверка");
      await showReviewDecision(ctx, result.message);
      logger.info("voice_sale_review_callback", {
        telegramUserId: telegramId,
        sellerId: seller.id,
        shopId: seller.shopId,
        saleId,
        action,
        status: result.status,
        ok: result.ok
      });
    } catch (error) {
      const message = error instanceof SellerAccessError
        ? "Ваш Telegram не привязан к магазину."
        : "Не удалось обработать решение. Попробуйте ещё раз.";

      logger.error("voice_sale_review_callback_failed", {
        telegramUserId: telegramId,
        saleId,
        action,
        errorMessage: formatErrorMessage(error)
      });
      await ctx.answerCbQuery("Ошибка");
      await showReviewDecision(ctx, message);
    }
  });
}
