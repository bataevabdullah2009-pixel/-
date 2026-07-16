import { timingSafeEqual } from "node:crypto";
import { processTelegramUpdate } from "@voice-sales-log/bot/core/process-update";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function redactErrorMessage(value: string) {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /((?:api[_-]?key|token|secret|authorization)\s*[=:]\s*)[^\s,;]+/gi,
      "$1[REDACTED]"
    )
    .slice(0, 2_000);
}

function isValidSecret(expectedSecret: string | undefined, actualSecret: string | null) {
  if (!expectedSecret || !actualSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(actualSecret);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function logTelegramUpdateReceived(update: unknown) {
  const source = update && typeof update === "object"
    ? update as Record<string, unknown>
    : {};
  const message = source.message && typeof source.message === "object"
    ? source.message as Record<string, unknown>
    : null;
  const voice = message?.voice;
  const voiceRecord = voice && typeof voice === "object"
    ? voice as Record<string, unknown>
    : null;
  const messageFrom = message?.from && typeof message.from === "object"
    ? message.from as Record<string, unknown>
    : null;
  const callbackQuery = source.callback_query && typeof source.callback_query === "object"
    ? source.callback_query as Record<string, unknown>
    : null;
  const callbackFrom = callbackQuery?.from && typeof callbackQuery.from === "object"
    ? callbackQuery.from as Record<string, unknown>
    : null;
  const callbackMessage = callbackQuery?.message && typeof callbackQuery.message === "object"
    ? callbackQuery.message as Record<string, unknown>
    : null;

  console.info(
    JSON.stringify({
      level: "info",
      message: "telegram_update_received",
      meta: {
        telegram_update_id: source.update_id ?? null,
        has_message: Boolean(message),
        has_voice: Boolean(voice),
        message_id: message?.message_id ?? null,
        message_from_id: messageFrom?.id ?? null,
        voice_file_id: voiceRecord?.file_id ?? null,
        voice_duration_seconds: voiceRecord?.duration ?? null,
        is_forwarded: Boolean(message?.forward_origin),
        has_callback_query: Boolean(callbackQuery),
        callback_query_id: callbackQuery?.id ?? null,
        callback_data: callbackQuery?.data ?? null,
        callback_from_id: callbackFrom?.id ?? null,
        callback_message_id: callbackMessage?.message_id ?? null
      },
      time: new Date().toISOString()
    })
  );
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!isValidSecret(expectedSecret, actualSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await request.json();
    logTelegramUpdateReceived(update);
    await processTelegramUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Telegram webhook processing failed",
        error: {
          name: error instanceof Error ? error.name : "Error",
          message: redactErrorMessage(error instanceof Error ? error.message : String(error))
        },
        time: new Date().toISOString()
      })
    );

    return NextResponse.json({ ok: false });
  }
}
