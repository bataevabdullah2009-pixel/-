"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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

export function TelegramAuthBootstrap() {
  const router = useRouter();

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData;
    webApp?.ready?.();

    if (!initData) return;

    const controller = new AbortController();
    void fetch("/api/auth/telegram", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
      signal: controller.signal
    }).then((response) => {
      if (response.ok) router.refresh();
    }).catch(() => undefined);

    return () => controller.abort();
  }, [router]);

  return null;
}
