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

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!isValidSecret(expectedSecret, actualSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await request.json();
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
