import { NextResponse } from "next/server";
import {
  resolveRequestContext,
  TELEGRAM_INIT_DATA_COOKIE
} from "@/lib/owner-auth";
import {
  readTelegramInitDataHeader
} from "@/lib/telegram-init-data";
import {
  describeTelegramAuthError,
  getTelegramAuthErrorReason
} from "@/lib/telegram-auth-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const receivedInitData = readTelegramInitDataHeader(request.headers);
    const context = await resolveRequestContext(request);
    console.info("webapp auth accepted", {
      telegramUserId: context.telegramId,
      sellerId: context.sellerId,
      shopId: context.shopId,
      mode: context.mode,
      errorReason: null
    });

    const response = NextResponse.json({ ok: true, mode: context.mode });
    if (context.mode === "telegram" && receivedInitData) {
      response.cookies.set(TELEGRAM_INIT_DATA_COOKIE, receivedInitData, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 24 * 60 * 60
      });
    }
    return response;
  } catch (error) {
    const details = describeTelegramAuthError(error);
    if (details.status >= 500) {
      console.error("Telegram owner authentication failed", error);
    } else {
      console.info("webapp auth rejected", {
        status: details.status,
        code: details.code,
        errorReason: getTelegramAuthErrorReason(error)
      });
    }
    return NextResponse.json(
      { ok: false, code: details.code, message: details.message },
      { status: details.status }
    );
  }
}
