import type { Context, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { AppEnv } from "../config/env";
import { prepareTelegramVoiceForStt } from "../services/audio-conversion.service";
import { cleanupTranscript, parseSaleTranscript } from "../services/cleanup-text.service";
import { saveFailedVoiceRecord, saveProcessedSale } from "../services/records.service";
import { uploadVoiceAudio } from "../services/storage.service";
import { downloadTelegramVoice } from "../services/telegram.service";
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
      const telegramFileId = ctx.message.voice.file_id;
      const fileUrl = await ctx.telegram.getFileLink(telegramFileId);
      const audio = await downloadTelegramVoice(fileUrl, telegramFileId);

      logger.info("Telegram voice downloaded", {
        telegramFileId,
        downloadedFileSize: audio.fileSize,
        telegramContentType: audio.telegramContentType,
        storedContentType: audio.contentType,
        storedFileName: audio.fileName
      });

      const uploaded = await uploadVoiceAudio(env, audio.buffer, audio.contentType, telegramId);
      audioPath = uploaded.path;
      audioUrl = uploaded.publicUrl;

      const preparedAudio = await prepareTelegramVoiceForStt({
        buffer: audio.buffer,
        sourceFileName: audio.fileName
      });
      const sttAudio = preparedAudio.audio;

      logger.info("Voice audio prepared for STT", {
        telegramFileId,
        downloadedFileSize: audio.fileSize,
        sttFileSize: sttAudio.buffer.byteLength,
        sttMimeType: sttAudio.contentType,
        sttFilename: sttAudio.filename,
        ffmpegStaticPath: preparedAudio.diagnostics.ffmpegStaticPath,
        ffmpegExists: preparedAudio.diagnostics.ffmpegExists,
        usingConversion: preparedAudio.diagnostics.usingConversion,
        fallbackToOriginalOgg: preparedAudio.diagnostics.fallbackToOriginalOgg,
        conversionError: preparedAudio.diagnostics.conversionError
      });

      const rawText = await transcribeAudio(env, sttAudio);
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
