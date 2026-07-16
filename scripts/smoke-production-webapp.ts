import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../apps/bot/src/config/env";
import { buildTelegramDataCheckString } from "../apps/web/src/lib/telegram-init-data";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function buildSignedInitData(botToken: string, telegramId: number) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1_000)),
    query_id: `stabilization-${Date.now()}`,
    signature: "production-smoke-signature",
    user: JSON.stringify({ id: telegramId, first_name: "Production smoke" })
  });
  const checkString = buildTelegramDataCheckString(params);
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  return params.toString();
}

const env = getEnv();
const baseUrl = new URL(env.NEXT_PUBLIC_APP_URL);
assert(baseUrl.protocol === "https:", "Production WebApp URL is not HTTPS.");
assert(!["localhost", "127.0.0.1"].includes(baseUrl.hostname), "Production WebApp URL points to localhost.");

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const { data: seller, error: sellerError } = await client
  .from("sellers")
  .select("telegram_id")
  .eq("is_active", true)
  .limit(1)
  .single();
if (sellerError) throw sellerError;

const initData = buildSignedInitData(env.TELEGRAM_BOT_TOKEN, Number(seller.telegram_id));
const authResponse = await fetch(new URL("/api/auth/telegram", baseUrl), {
  method: "POST",
  headers: { "x-telegram-init-data": initData },
  redirect: "manual"
});
const authResult = await authResponse.json() as { ok?: boolean; mode?: string; code?: string };
assert(authResponse.status === 200, `WebApp auth returned HTTP ${authResponse.status} (${authResult.code ?? "unknown"}).`);
assert(authResult.ok && authResult.mode === "telegram", "WebApp auth did not create a Telegram session.");

const setCookie = authResponse.headers.get("set-cookie") ?? "";
const cookie = setCookie.split(";", 1)[0] ?? "";
assert(cookie.startsWith("voice_sales_telegram_init_data="), "WebApp auth did not set the expected session cookie.");

const pages = [
  { path: "/daily-report", marker: "reportSummaryGrid" },
  { path: "/review", marker: "reviewSummaryStrip" },
  { path: "/records", marker: "filtersRow" },
  { path: "/sellers", marker: "sellerList" }
] as const;
const assets = new Set<string>();

for (const page of pages) {
  const response = await fetch(new URL(page.path, baseUrl), {
    headers: { cookie },
    redirect: "manual"
  });
  const html = await response.text();
  assert(response.status === 200, `${page.path} returned HTTP ${response.status}.`);
  assert(html.includes(page.marker), `${page.path} did not render its expected content.`);
  assert(!html.includes("actionNotice-error"), `${page.path} rendered a backend error notice.`);

  for (const match of html.matchAll(/(?:src|href)="([^"]*\/_next\/[^"]+)"/g)) {
    assets.add(new URL(match[1], baseUrl).toString());
  }
}

assert(assets.size > 0, "WebApp HTML did not reference any Next.js assets.");
for (const assetUrl of assets) {
  const response = await fetch(assetUrl);
  assert(response.status === 200, `WebApp asset returned HTTP ${response.status}.`);
}

const sdkResponse = await fetch("https://telegram.org/js/telegram-web-app.js");
const sdk = await sdkResponse.text();
assert(sdkResponse.status === 200 && sdk.length > 1_000, "Telegram WebApp SDK is unavailable.");

console.log(JSON.stringify({
  smoke: "production-webapp",
  auth: "telegram-session-verified",
  pages: pages.map((page) => page.path),
  assets: { checked: assets.size, status: "available" },
  telegramSdk: "available"
}));
