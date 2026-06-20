import { NextResponse } from "next/server";
import {
  authenticateOwner,
  OwnerAccessError,
  TELEGRAM_INIT_DATA_COOKIE
} from "@/lib/owner-auth";
import { requireTelegramInitDataHeader } from "@/lib/telegram-init-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
    const accessError = error instanceof OwnerAccessError ? error : null;
    const status = accessError?.code === "not_authorized"
      ? 403
      : accessError?.code === "misconfigured"
        ? 500
        : 401;
    const message = accessError?.code === "not_authorized"
      ? "Ваш Telegram не привязан к магазину."
      : accessError?.code === "misconfigured"
        ? "Сервис авторизации временно не настроен."
        : "Откройте Web App через кнопку в Telegram-боте.";

    return NextResponse.json({ ok: false, message }, { status });
  }
}
