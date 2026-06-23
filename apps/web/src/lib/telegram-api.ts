"use client";

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: { id?: number };
  };
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

export type AppAuthContext = {
  mode: "telegram" | "fallback";
  initData?: string;
  hasTelegram: boolean;
  hasWebApp: boolean;
};

export function getTelegramWebApp() {
  return typeof window === "undefined" ? undefined : window.Telegram?.WebApp;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData?.trim() ?? "";
}

export function getAppAuthContext(): AppAuthContext {
  const hasTelegram = typeof window !== "undefined" && Boolean(window.Telegram);
  const webApp = getTelegramWebApp();
  const initData = webApp?.initData?.trim() ?? "";

  if (initData.length > 0) {
    return {
      mode: "telegram",
      initData,
      hasTelegram,
      hasWebApp: Boolean(webApp)
    };
  }

  return {
    mode: "fallback",
    hasTelegram,
    hasWebApp: Boolean(webApp)
  };
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

async function waitForClientReady() {
  if (typeof document === "undefined" || document.readyState !== "loading") return;

  await new Promise<void>((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

export async function waitForTelegramWebApp(timeoutMs = 10000) {
  await waitForClientReady();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const webApp = getTelegramWebApp();
    if (webApp) return webApp;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return getTelegramWebApp();
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const context = getAppAuthContext();

  const headers = new Headers(init.headers);
  headers.set("x-app-mode", context.mode);
  if (context.initData) {
    headers.set("x-telegram-init-data", context.initData);
  }

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers
  });
}
