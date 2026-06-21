const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isTemporaryHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (LOCAL_HOSTS.has(host)) return true;
  if (host === "ngrok.app" || host.endsWith(".ngrok.app")) return true;
  if (host === "ngrok.io" || host.endsWith(".ngrok.io")) return true;

  return host.endsWith(".vercel.app") && (
    host.includes("-git-") ||
    /-[a-z0-9]{8,}-[^.]+\.vercel\.app$/.test(host)
  );
}

export function parseTelegramPublicUrl(value: string, variableName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${variableName} is required`);
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error(`${variableName} must be an absolute URL`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${variableName} must use https://`);
  }

  if (isTemporaryHost(url.hostname)) {
    throw new Error(`${variableName} must use the canonical production host`);
  }

  return url;
}

export function isTelegramPublicUrl(value: string) {
  try {
    parseTelegramPublicUrl(value, "Telegram public URL");
    return true;
  } catch {
    return false;
  }
}

export function buildTelegramWebhookUrl(appUrl: string, publicWebhookUrl?: string) {
  parseTelegramPublicUrl(appUrl, "NEXT_PUBLIC_APP_URL");
  const source = (publicWebhookUrl?.trim() || appUrl).replace(/\/+$/, "");
  parseTelegramPublicUrl(source, publicWebhookUrl?.trim() ? "PUBLIC_WEBHOOK_URL" : "NEXT_PUBLIC_APP_URL");

  return source.endsWith("/api/telegram/webhook")
    ? source
    : `${source}/api/telegram/webhook`;
}
