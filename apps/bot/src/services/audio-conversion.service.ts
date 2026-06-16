import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { logger } from "../utils/logger";
import type { TranscriptionAudioFile } from "./transcription.service";

export type AudioPreparationDiagnostics = {
  ffmpegStaticPath: string | null;
  ffmpegExists: boolean;
  usingConversion: boolean;
  fallbackToOriginalOgg: boolean;
  conversionError?: string;
};

export type PreparedAudioForStt = {
  audio: TranscriptionAudioFile;
  diagnostics: AudioPreparationDiagnostics;
};

function originalOggAudio(buffer: Buffer): TranscriptionAudioFile {
  return {
    buffer,
    filename: "voice.ogg",
    contentType: "audio/ogg"
  };
}

async function fileExists(path: string | null) {
  if (!path) {
    return false;
  }

  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function runFfmpeg(ffmpegPath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const ffmpegProcess = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    const stderr: Buffer[] = [];

    ffmpegProcess.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    ffmpegProcess.on("error", reject);
    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(stderr).toString("utf8")}`));
    });
  });
}

export async function prepareTelegramVoiceForStt(input: {
  buffer: Buffer;
  sourceFileName: string;
}): Promise<PreparedAudioForStt> {
  const ffmpegStaticPath = ffmpegStatic ?? null;
  const ffmpegExists = await fileExists(ffmpegStaticPath);

  if (!ffmpegStaticPath || !ffmpegExists) {
    const diagnostics = {
      ffmpegStaticPath,
      ffmpegExists,
      usingConversion: false,
      fallbackToOriginalOgg: true
    };

    logger.warn("FFmpeg unavailable for Telegram voice conversion; falling back to original OGG", diagnostics);

    return {
      audio: originalOggAudio(input.buffer),
      diagnostics
    };
  }

  const workDir = join(tmpdir(), `voice-sales-log-${crypto.randomUUID()}`);
  const inputPath = join(workDir, input.sourceFileName.endsWith(".ogg") ? "voice.ogg" : "voice-input.ogg");
  const outputPath = join(workDir, "voice.mp3");

  await mkdir(workDir, { recursive: true });

  try {
    await writeFile(inputPath, input.buffer);
    await runFfmpeg(ffmpegStaticPath, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-b:a",
      "64k",
      outputPath
    ]);

    const diagnostics = {
      ffmpegStaticPath,
      ffmpegExists,
      usingConversion: true,
      fallbackToOriginalOgg: false
    };

    logger.info("Telegram voice converted for STT", diagnostics);

    return {
      audio: {
        buffer: await readFile(outputPath),
        filename: "voice.mp3",
        contentType: "audio/mpeg"
      },
      diagnostics
    };
  } catch (error) {
    const diagnostics = {
      ffmpegStaticPath,
      ffmpegExists,
      usingConversion: false,
      fallbackToOriginalOgg: true,
      conversionError: getErrorMessage(error)
    };

    logger.warn("Telegram voice conversion failed; falling back to original OGG", diagnostics);

    return {
      audio: originalOggAudio(input.buffer),
      diagnostics
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
