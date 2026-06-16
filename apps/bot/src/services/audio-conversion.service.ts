import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import type { TranscriptionAudioFile } from "./transcription.service";

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static did not provide a binary path."));
      return;
    }

    const process = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    const stderr: Buffer[] = [];

    process.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(stderr).toString("utf8")}`));
    });
  });
}

export async function convertTelegramVoiceToMp3(input: {
  buffer: Buffer;
  sourceFileName: string;
}): Promise<TranscriptionAudioFile> {
  const workDir = join(tmpdir(), `voice-sales-log-${crypto.randomUUID()}`);
  const inputPath = join(workDir, input.sourceFileName.endsWith(".ogg") ? input.sourceFileName : "voice.ogg");
  const outputPath = join(workDir, "voice.mp3");

  await mkdir(workDir, { recursive: true });

  try {
    await writeFile(inputPath, input.buffer);
    await runFfmpeg([
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

    return {
      buffer: await readFile(outputPath),
      filename: "voice.mp3",
      contentType: "audio/mpeg"
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
