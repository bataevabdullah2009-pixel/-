import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const telegramOggBuffer = Buffer.from("telegram ogg bytes");

async function importPrepareTelegramVoiceForStt(options: {
  ffmpegStaticPath: string | null;
  failConversion?: boolean;
}) {
  vi.resetModules();
  vi.doMock("ffmpeg-static", () => ({ default: options.ffmpegStaticPath }));

  if (options.failConversion) {
    vi.doMock("node:child_process", () => ({
      spawn: () => {
        const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
        child.stderr = new EventEmitter();

        queueMicrotask(() => {
          child.stderr.emit("data", Buffer.from("conversion failed"));
          child.emit("close", 1);
        });

        return child;
      }
    }));
  }

  const module = await import("../apps/bot/src/services/audio-conversion.service");
  return module.prepareTelegramVoiceForStt;
}

afterEach(() => {
  vi.doUnmock("ffmpeg-static");
  vi.doUnmock("node:child_process");
  vi.resetModules();
});

describe("telegram voice audio preparation", () => {
  it("falls back to original OGG when ffmpeg-static has no binary path", async () => {
    const prepareTelegramVoiceForStt = await importPrepareTelegramVoiceForStt({
      ffmpegStaticPath: null
    });

    const result = await prepareTelegramVoiceForStt({
      buffer: telegramOggBuffer,
      sourceFileName: "telegram-file.ogg"
    });

    expect(result.audio).toMatchObject({
      filename: "voice.ogg",
      contentType: "audio/ogg"
    });
    expect(result.audio.buffer).toEqual(telegramOggBuffer);
    expect(result.diagnostics).toMatchObject({
      ffmpegStaticPath: null,
      ffmpegExists: false,
      usingConversion: false,
      fallbackToOriginalOgg: true
    });
  });

  it("falls back to original OGG when ffmpeg conversion fails", async () => {
    const prepareTelegramVoiceForStt = await importPrepareTelegramVoiceForStt({
      ffmpegStaticPath: process.execPath,
      failConversion: true
    });

    const result = await prepareTelegramVoiceForStt({
      buffer: telegramOggBuffer,
      sourceFileName: "telegram-file.ogg"
    });

    expect(result.audio).toMatchObject({
      filename: "voice.ogg",
      contentType: "audio/ogg"
    });
    expect(result.audio.buffer).toEqual(telegramOggBuffer);
    expect(result.diagnostics).toMatchObject({
      ffmpegStaticPath: process.execPath,
      ffmpegExists: true,
      usingConversion: false,
      fallbackToOriginalOgg: true
    });
    expect(result.diagnostics.conversionError).toContain("ffmpeg exited with code 1");
  });
});
