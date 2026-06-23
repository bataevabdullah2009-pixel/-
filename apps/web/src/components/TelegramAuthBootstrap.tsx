"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  apiFetch,
  getAppAuthContext,
  initializeTelegramWebApp,
  waitForTelegramWebApp
} from "@/lib/telegram-api";

function getBootstrapErrorMessage(code?: string, fallback?: string) {
  if (code === "TELEGRAM_INIT_DATA_MISSING") {
    return "Telegram не передал данные сессии. Закройте WebApp и откройте отчёт из меню или кнопки бота.";
  }
  if (code === "TELEGRAM_INIT_DATA_INVALID") {
    return "Telegram-сессия недействительна или устарела. Закройте WebApp и откройте отчёт заново.";
  }
  return fallback || "Не удалось подтвердить доступ к магазину.";
}

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
  const [checking, setChecking] = useState(!hasSession && !demoMode && !isDebugRoute);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isDebugRoute) {
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    void waitForTelegramWebApp()
      .then(async (webApp) => {
        initializeTelegramWebApp(webApp);
        const context = getAppAuthContext();

        if (context.mode === "telegram" && !context.telegramUserId) {
          throw new Error(
            "Telegram открыл WebApp, но не передал user.id. Обновите Telegram и откройте отчёт заново."
          );
        }

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
          setAuthError(getBootstrapErrorMessage(body?.code, body?.message));
          setChecking(false);
          return;
        }

        if (!hasSession && !demoMode) {
          window.location.reload();
          return;
        }

        setAuthError(null);
        setChecking(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.info("Web App auth bootstrap failed", { error });
        setAuthError(error instanceof Error ? error.message : "Не удалось подтвердить Telegram-сессию.");
        setChecking(false);
      });

    return () => controller.abort();
  }, [demoMode, hasSession, isDebugRoute]);

  if (!hasSession && !demoMode && !isDebugRoute && (checking || authError)) {
    return (
      <div className="pageStack">
        <div
          className={`actionNotice${authError ? " actionNotice-error" : ""}`}
          role={authError ? "alert" : "status"}
        >
          {authError ?? "Проверяем Telegram-сессию…"}
        </div>
      </div>
    );
  }

  return children;
}
