import { timingSafeEqual } from "node:crypto";
import { processTelegramUpdate } from "@voice-sales-log/bot/core/process-update";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
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
        has_message: Boolean(message),
        has_voice: Boolean(voice),
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
        error: serializeError(error),
        time: new Date().toISOString()
      })
    );

    return NextResponse.json({ ok: false });
  }
}
