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

const reviewActionPattern = new RegExp(
  `^(?:${VOICE_SALE_REVIEW_CALLBACK_PREFIX}:)?(confirm|cancel):([0-9a-fA-F-]{36})$`
);

export function parseReviewCallbackData(callbackData: unknown) {
  if (typeof callbackData !== "string") {
    return null;
  }

  const match = callbackData.match(reviewActionPattern);

  if (!match) {
    return null;
  }

  return {
    action: match[1] as "confirm" | "cancel",
    saleId: match[2]
  };
}

async function showReviewDecision(ctx: Context, message: string) {
  try {
    await ctx.editMessageText(message, { reply_markup: { inline_keyboard: [] } });
  } catch {
    await ctx.reply(message);
  }
}

export function registerReviewHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.action(reviewActionPattern, async (ctx) => {
    const callbackData = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    const parsedCallback = parseReviewCallbackData(callbackData);
    const telegramId = ctx.from?.id;

    if (!parsedCallback || !telegramId) {
      await ctx.answerCbQuery("Не удалось обработать кнопку.");
      return;
    }

    const { action, saleId } = parsedCallback;
    const sellerName = ctx.from?.first_name ?? ctx.from?.username ?? null;

    logger.info("callback_received", {
      callback_action: action,
      record_id: saleId,
      telegram_user_id: telegramId
    });

    try {
      const seller = await requireSeller(env, telegramId, sellerName);
      const result = action === "confirm"
        ? await confirmVoiceSale({ env, seller, saleId })
        : await cancelVoiceSale({ env, seller, saleId });

      await ctx.answerCbQuery(
        result.status === "unchanged"
          ? "Эта запись уже обработана"
          : result.ok
            ? "Готово"
            : "Нужна проверка"
      );
      await showReviewDecision(ctx, result.message);
      logger.info("callback_action", {
        callback_action: action,
        record_id: saleId,
        telegram_user_id: telegramId,
        seller_id: seller.id,
        shop_id: seller.shopId,
        old_status: result.oldStatus ?? null,
        new_status: result.newStatus ?? result.status,
        ok: result.ok
      });
    } catch (error) {
      const message = error instanceof SellerAccessError
        ? "Ваш Telegram не привязан к магазину."
        : "Не удалось обработать решение. Попробуйте ещё раз.";

      logger.error("callback_action", {
        callback_action: action,
        record_id: saleId,
        telegram_user_id: telegramId,
        old_status: null,
        new_status: null,
        error: formatErrorMessage(error)
      });
      await ctx.answerCbQuery("Ошибка");
      await showReviewDecision(ctx, message);
    }
  });

  bot.on("callback_query", async (ctx) => {
    const callbackData = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    logger.warn("callback_ignored", {
      callback_data: callbackData ?? null,
      telegram_user_id: ctx.from?.id ?? null,
      reason: "unsupported_callback_data"
    });
    await ctx.answerCbQuery("Некорректная кнопка.");
  });
}
