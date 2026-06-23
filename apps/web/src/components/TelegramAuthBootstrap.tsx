"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  apiFetch,
  getAppAuthContext,
  initializeTelegramWebApp,
  waitForTelegramWebApp
} from "@/lib/telegram-api";

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

  useEffect(() => {
    if (isDebugRoute) return;

    const controller = new AbortController();
    void waitForTelegramWebApp()
      .then(async (webApp) => {
        initializeTelegramWebApp(webApp);
        const context = getAppAuthContext();

        return apiFetch("/api/auth/telegram", {
          method: "POST",
          signal: controller.signal
        }).then((response) => ({ response, mode: context.mode }));
      })
      .then(async (result) => {
        if (!result) return;
        const { response, mode } = result;
        const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
        if (!response.ok) {
          console.info("Web App auth bootstrap skipped", {
            mode,
            status: response.status,
            code: body?.code ?? "UNKNOWN"
          });
          return;
        }

        if (!hasSession && !demoMode && mode === "telegram") {
          window.location.reload();
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.info("Web App auth bootstrap failed", { error });
      });

    return () => controller.abort();
  }, [demoMode, hasSession, isDebugRoute]);

  return children;
}
