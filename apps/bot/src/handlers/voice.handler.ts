import type { Context, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { ParsedSale } from "@voice-sales-log/shared/types";
import type { AppEnv } from "../config/env";
import { prepareTelegramVoiceForStt } from "../services/audio-conversion.service";
import { cleanupTranscript, parseSaleTranscript } from "../services/cleanup-text.service";
import {
  requireSeller,
  saveFailedVoiceRecord,
  saveProcessedSale,
  SellerAccessError,
  type SellerContext,
  writeProcessingAuditLog
} from "../services/records.service";
import { uploadVoiceAudio } from "../services/storage.service";
import {
  createVoiceSaveFailureMessage,
  createVoiceSaleReviewKeyboard,
  createVoiceSaleUserMessage,
  downloadTelegramVoice
} from "../services/telegram.service";
import { transcribeAudio } from "../services/transcription.service";
import { formatErrorMessage, logger } from "../utils/logger";

export type VoiceFailureStage =
  | "seller_resolve"
  | "telegram_download"
  | "audio_prepare"
  | "stt"
  | "llm"
  | "supabase_insert"
  | "telegram_reply";

async function tryWriteProcessingAuditLog(params: Parameters<typeof writeProcessingAuditLog>[0]) {
  try {
    await writeProcessingAuditLog(params);
  } catch (error) {
    logger.warn("processing_audit_log_failed", { action: params.action, error });
  }
}

export function registerVoiceHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.on(message("voice"), async (ctx) => {
    const telegramId = ctx.from?.id;
    const sellerName = ctx.from?.first_name ?? ctx.from?.username ?? null;
    const telegramMessageId = String(ctx.message.message_id);
    let stage: VoiceFailureStage = "seller_resolve";
    let seller: SellerContext | null = null;
    let audioPath: string | null = null;
    let audioUrl: string | null = null;
    let rawText: string | null = null;
    let cleanedText: string | null = null;
    let parsedSale: ParsedSale | null = null;
    let parserJson: unknown | null = null;
    let parserErrorMessage: string | null = null;
    let salePersisted = false;
    const pipelineMeta = () => ({
      telegramMessageId,
      telegramUserId: telegramId ?? null,
      sellerId: seller?.id ?? null,
      shopId: seller?.shopId ?? null
    });

    logger.info("voice_received", pipelineMeta());

    if (!telegramId) {
      logger.error("voice_failed", {
        ...pipelineMeta(),
        stage: "seller_resolve",
        finalStatus: "failed",
        errorMessage: "telegram_user_id_missing"
      });
      await ctx.reply("Не удалось определить продавца. Попробуйте команду /start.");
      return;
    }

    try {
      seller = await requireSeller(env, telegramId, sellerName);
      logger.info("seller_resolved", pipelineMeta());
      logger.info("shop_resolved", pipelineMeta());

      stage = "telegram_reply";
      await ctx.reply("Голосовое получено, обрабатываю.");

      stage = "telegram_download";
      const telegramFileId = ctx.message.voice.file_id;
      const fileUrl = await ctx.telegram.getFileLink(telegramFileId);
      const audio = await downloadTelegramVoice(fileUrl, telegramFileId);
      logger.info("telegram_file_downloaded", {
        ...pipelineMeta(),
        telegramFileId,
        fileSize: audio.fileSize,
        contentType: audio.telegramContentType
      });

      stage = "audio_prepare";
      const preparedAudio = await prepareTelegramVoiceForStt({
        buffer: audio.buffer,
        sourceFileName: audio.fileName
      });
      const sttAudio = preparedAudio.audio;
      logger.info("audio_prepared", {
        ...pipelineMeta(),
        sourceFileSize: audio.fileSize,
        sttFileSize: sttAudio.buffer.byteLength,
        sttMimeType: sttAudio.contentType,
        usingConversion: preparedAudio.diagnostics.usingConversion,
        fallbackToOriginalOgg: preparedAudio.diagnostics.fallbackToOriginalOgg,
        conversionError: preparedAudio.diagnostics.conversionError
      });

      // Audio archiving must not block the sale pipeline. The voice record keeps
      // nullable storage fields and can still be reviewed from its transcript.
      try {
        const uploaded = await uploadVoiceAudio(env, audio.buffer, audio.contentType, telegramId);
        audioPath = uploaded.path;
        audioUrl = uploaded.publicUrl;
      } catch (error) {
        logger.warn("voice_storage_upload_failed", { ...pipelineMeta(), errorMessage: formatErrorMessage(error) });
      }

      stage = "stt";
      logger.info("stt_started", pipelineMeta());
      rawText = await transcribeAudio(env, sttAudio);
      logger.info("stt_finished", {
        ...pipelineMeta(),
        sttText: rawText,
        transcriptLength: rawText.length
      });
      await tryWriteProcessingAuditLog({
        env,
        sellerTelegramId: telegramId,
        sellerName,
        action: "stt_raw_text_received",
        details: { telegram_message_id: telegramMessageId, raw_text: rawText }
      });

      stage = "llm";
      logger.info("llm_parse_started", { ...pipelineMeta(), sttText: rawText });
      cleanedText = await cleanupTranscript(env, rawText);
      const parserResult = await parseSaleTranscript(env, rawText, cleanedText);
      parsedSale = parserResult.parsedSale;
      parserJson = parserResult.parserJson;
      parserErrorMessage = parserResult.errorMessage;
      logger.info("llm_parse_finished", {
        ...pipelineMeta(),
        sttText: rawText,
        parsedItemsCount: parsedSale.items.length,
        parsedItems: parsedSale.items.map((item) => ({
          product: item.product_name,
          quantity: item.quantity ?? null,
          price: item.price,
          total: item.total,
          confidence: item.confidence
        })),
        needsReview: parsedSale.needs_review,
        errorMessage: parserErrorMessage
      });
      await tryWriteProcessingAuditLog({
        env,
        sellerTelegramId: telegramId,
        sellerName,
        action: "llm_parser_json_received",
        details: {
          telegram_message_id: telegramMessageId,
          parser_json: parserJson,
          error_message: parserErrorMessage
        }
      });

      stage = "supabase_insert";
      const result = await saveProcessedSale({
        env,
        seller,
        telegramMessageId,
        audioPath,
        audioUrl,
        rawText,
        parsedSale,
        parserJson,
        errorMessage: parserErrorMessage
      });
      salePersisted = true;
      logger.info("sale_created", {
        ...pipelineMeta(),
        saleInsertResultId: result.saleId,
        finalStatus: result.status
      });
      logger.info("sale_items_created", {
        ...pipelineMeta(),
        saleInsertResultId: result.saleId,
        saleItemsInsertCount: result.itemCount,
        finalStatus: result.status
      });
      logger.info("voice_processed", {
        ...pipelineMeta(),
        saleInsertResultId: result.saleId,
        saleItemsInsertCount: result.itemCount,
        finalStatus: result.status
      });

      stage = "telegram_reply";
      const responseText = parsedSale.cleaned_text || "Текст требует ручной проверки.";
      const userMessage = createVoiceSaleUserMessage(responseText, result.needsAttention);
      if (result.needsAttention) {
        await ctx.reply(userMessage, createVoiceSaleReviewKeyboard(result.saleId, env.NEXT_PUBLIC_APP_URL));
      } else {
        await ctx.reply(userMessage);
      }
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      logger.error("voice_failed", {
        ...pipelineMeta(),
        stage,
        sttText: rawText,
        parsedItemsCount: parsedSale?.items.length ?? 0,
        parsedItems: parsedSale?.items.map((item) => ({
          product: item.product_name,
          quantity: item.quantity ?? null,
          price: item.price
        })) ?? [],
        finalStatus: "failed",
        errorMessage
      });

      if (error instanceof SellerAccessError) {
        await ctx.reply("Ваш Telegram не привязан к магазину.");
        return;
      }

      if (seller && !salePersisted) {
        try {
          await saveFailedVoiceRecord({
            env,
            seller,
            telegramMessageId,
            audioPath,
            audioUrl,
            rawText,
            cleanedText,
            parserJson,
            errorMessage: `stage=${stage}; ${errorMessage}`
          });
        } catch (saveError) {
          logger.error("failed_voice_record_save_failed", {
            ...pipelineMeta(),
            stage: "supabase_insert",
            finalStatus: "failed",
            errorMessage: formatErrorMessage(saveError)
          });
        }
      }

      await ctx.reply(
        stage === "supabase_insert"
          ? createVoiceSaveFailureMessage()
          : "⚠️ Не удалось обработать голосовое. Попробуйте ещё раз."
      );
    }
  });
}
