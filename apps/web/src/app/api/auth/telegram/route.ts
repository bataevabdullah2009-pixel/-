import { NextResponse } from "next/server";
import {
  authenticateOwner,
  TELEGRAM_INIT_DATA_COOKIE
} from "@/lib/owner-auth";
import {
  readTelegramInitDataHeader,
  requireTelegramInitDataHeader
} from "@/lib/telegram-init-data";
import { describeTelegramAuthError } from "@/lib/telegram-auth-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const receivedInitData = readTelegramInitDataHeader(request.headers);
    if (!receivedInitData) {
      console.info("webapp auth", {
        hasInitData: false,
        initDataLength: 0,
        hasTelegramUser: false,
        sellerFound: false,
        shopId: null
      });
    }
    const initData = requireTelegramInitDataHeader(request.headers);
    await authenticateOwner(initData);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(TELEGRAM_INIT_DATA_COOKIE, initData, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60
    });
    return response;
  } catch (error) {
    console.error("Telegram owner authentication failed", error);
    const details = describeTelegramAuthError(error);
    return NextResponse.json(
      { ok: false, code: details.code, message: details.message },
      { status: details.status }
    );
  }
}
