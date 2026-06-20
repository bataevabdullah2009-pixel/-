import { NextResponse } from "next/server";
import { authenticateOwner, TELEGRAM_INIT_DATA_COOKIE } from "@/lib/owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { initData?: unknown };
    const initData = typeof body.initData === "string" ? body.initData : "";
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
    return NextResponse.json({ ok: false, message: "Не удалось подтвердить доступ владельца." }, { status: 401 });
  }
}
