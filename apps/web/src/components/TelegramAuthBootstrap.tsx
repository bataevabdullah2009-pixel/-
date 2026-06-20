"use client";

import { useEffect, useState, type ReactNode } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
      };
    };
  }
}

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
  const [state, setState] = useState<AuthState>(
    hasSession || demoMode
      ? { status: "ready", message: "" }
      : { status: "loading", message: "Проверяем доступ к магазину…" }
  );

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData?.trim() ?? "";
    webApp?.ready?.();

    if (!initData) {
      if (!hasSession && !demoMode) {
        setState({
          status: "error",
          message: "Откройте Web App через кнопку в Telegram-боте."
        });
      }
      return;
    }

    const controller = new AbortController();
    void fetch("/api/auth/telegram", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "x-telegram-init-data": initData
      },
      signal: controller.signal
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
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
  }, [demoMode, hasSession]);

  if (state.status === "ready") return children;

  return (
    <main className="authGate">
      <div className={`actionNotice ${state.status === "error" ? "actionNotice-error" : ""}`} role={state.status === "error" ? "alert" : "status"}>
        {state.message}
      </div>
    </main>
  );
}
