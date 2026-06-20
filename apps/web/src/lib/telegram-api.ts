"use client";

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: unknown;
  platform?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export class TelegramApiError extends Error {
  constructor(
    public readonly code: "TELEGRAM_INIT_DATA_MISSING",
    message: string
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

export function getTelegramWebApp() {
  return typeof window === "undefined" ? undefined : window.Telegram?.WebApp;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData?.trim() ?? "";
}

export function initializeTelegramWebApp(webApp = getTelegramWebApp()) {
  webApp?.ready?.();
  webApp?.expand?.();

  if (process.env.NODE_ENV !== "production") {
    console.log("Telegram WebApp diagnostics", {
      hasTelegramObject: typeof window !== "undefined" && Boolean(window.Telegram),
      hasWebApp: Boolean(webApp),
      hasInitDataUnsafe: Boolean(webApp?.initDataUnsafe),
      initDataLength: webApp?.initData?.length ?? 0,
      platform: webApp?.platform ?? "unknown",
      version: webApp?.version ?? "unknown"
    });
  }

  return webApp;
}

export async function waitForTelegramWebApp(timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const webApp = getTelegramWebApp();
    if (webApp) return webApp;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return getTelegramWebApp();
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const initData = getTelegramInitData();
  if (!initData) {
    throw new TelegramApiError(
      "TELEGRAM_INIT_DATA_MISSING",
      "Откройте отчёт через кнопку в Telegram-боте"
    );
  }

  const headers = new Headers(init.headers);
  headers.set("x-telegram-init-data", initData);

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers
  });
}
