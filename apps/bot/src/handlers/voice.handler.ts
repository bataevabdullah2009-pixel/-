import type { Context, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { AppEnv } from "../config/env";
import { cleanupTranscript, parseSaleTranscript } from "../services/cleanup-text.service";
import { saveFailedVoiceRecord, saveProcessedSale } from "../services/records.service";
import { uploadVoiceAudio } from "../services/storage.service";
import { downloadTelegramFile } from "../services/telegram.service";
import { transcribeAudio } from "../services/transcription.service";
import { logger } from "../utils/logger";

export function registerVoiceHandler(bot: Telegraf<Context>, env: AppEnv) {
  bot.on(message("voice"), async (ctx) => {
    const telegramId = ctx.from?.id;
    const sellerName = ctx.from?.first_name ?? ctx.from?.username ?? null;
    const telegramMessageId = String(ctx.message.message_id);
    let audioPath: string | null = null;
    let audioUrl: string | null = null;

    if (!telegramId) {
      await ctx.reply("Не удалось определить продавца. Попробуйте команду /start.");
      return;
    }

    await ctx.reply("Голосовое получено, обрабатываю.");

    try {
      const fileUrl = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      const audio = await downloadTelegramFile(fileUrl);
      const uploaded = await uploadVoiceAudio(env, audio.buffer, audio.contentType, telegramId);
      audioPath = uploaded.path;
      audioUrl = uploaded.publicUrl;

      const rawText = await transcribeAudio(env, audio.buffer, `voice-${telegramMessageId}.ogg`);
      const cleanedText = await cleanupTranscript(env, rawText);
      const parsedSale = await parseSaleTranscript(env, rawText, cleanedText);
      const result = await saveProcessedSale({
        env,
        sellerTelegramId: telegramId,
        sellerName,
        telegramMessageId,
        audioPath,
        audioUrl,
        rawText,
        parsedSale
      });

      const responseText = parsedSale.cleaned_text || "Текст требует ручной проверки.";
      await ctx.reply(`✅ Запись сохранена:\n${responseText}\n\nСтатус: ${result.status}`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unknown voice processing error.";
      logger.error("Voice processing failed", { error: messageText, telegramId, telegramMessageId });

      try {
        await saveFailedVoiceRecord({
          env,
          sellerTelegramId: telegramId,
          sellerName,
          telegramMessageId,
          audioPath,
          audioUrl,
          errorMessage: messageText
        });
      } catch (saveError) {
        logger.error("Failed to save failed voice record", { saveError });
      }

      await ctx.reply("⚠️ Не удалось обработать голосовое. Попробуйте ещё раз.");
    }
  });
}
