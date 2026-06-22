"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  apiFetch,
  getTelegramInitData,
  initializeTelegramWebApp,
  waitForTelegramWebApp
} from "@/lib/telegram-api";

type AuthState =
  | { status: "loading"; message: string }
  | { status: "ready"; message: "" }
  | { status: "error"; message: string };

export function TelegramAuthBootstrap({
  children,
  hasSession,
  demoMode
}: {
  children: ReactNode;
  hasSession: boolean;
  demoMode: boolean;
}) {
  const pathname = usePathname();
  const isDebugRoute = pathname === "/debug-telegram";
  const [state, setState] = useState<AuthState>(
    hasSession || demoMode || isDebugRoute
      ? { status: "ready", message: "" }
      : { status: "loading", message: "Проверяем доступ к магазину…" }
  );

  useEffect(() => {
    if (isDebugRoute) return;

    const controller = new AbortController();
    void waitForTelegramWebApp()
      .then(async (webApp) => {
        initializeTelegramWebApp(webApp);
        const initData = getTelegramInitData();

        if (!initData) {
          if (!hasSession && !demoMode) {
            setState({
              status: "error",
              message: "Откройте отчёт через кнопку в Telegram-боте"
            });
          }
          return null;
        }

        return apiFetch("/api/auth/telegram", {
          method: "POST",
          signal: controller.signal
        });
      })
      .then(async (response) => {
        if (!response) return;
        const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
        if (!response.ok) {
          setState({
            status: "error",
            message: body?.message || "Не удалось подтвердить доступ к магазину."
          });
          return;
        }

        if (!hasSession) {
          window.location.reload();
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", message: "Не удалось подтвердить доступ к магазину." });
      });

    return () => controller.abort();
  }, [demoMode, hasSession, isDebugRoute]);

  if (isDebugRoute || state.status === "ready") return children;

  return (
    <main className="authGate">
      <div className={`actionNotice ${state.status === "error" ? "actionNotice-error" : ""}`} role={state.status === "error" ? "alert" : "status"}>
        {state.message}
      </div>
    </main>
  );
}
