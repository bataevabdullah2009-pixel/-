import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../apps/bot/src/config/env";
import { buildTelegramWebhookUrl } from "../packages/shared/utils/telegram-url";

type TelegramResponse<T> = {
  ok?: boolean;
  result?: T;
  description?: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const env = getEnv();
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const [sellersResult, ownersResult] = await Promise.all([
  client.from("sellers").select("telegram_id").eq("is_active", true),
  client.from("owners").select("telegram_id").eq("is_active", true)
]);
if (sellersResult.error) throw sellersResult.error;
if (ownersResult.error) throw ownersResult.error;
const candidateChatIds = [...new Set([
  ...(sellersResult.data ?? []).map((row) => String(row.telegram_id)),
  ...(ownersResult.data ?? []).map((row) => String(row.telegram_id))
])];
assert(candidateChatIds.length > 0, "No active Telegram principals are configured.");

async function telegram<T>(method: string, searchParams?: URLSearchParams) {
  const url = new URL(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`);
  if (searchParams) url.search = searchParams.toString();
  const response = await fetch(url);
  const result = await response.json() as TelegramResponse<T>;
  assert(response.ok && result.ok, `Telegram ${method} failed: ${result.description ?? response.status}.`);
  return result.result as T;
}

const [bot, webhook] = await Promise.all([
  telegram<{ id: number; username?: string }>("getMe"),
  telegram<{
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
    allowed_updates?: string[];
  }>("getWebhookInfo")
]);

let menuButton: {
    type?: string;
    text?: string;
    web_app?: { url?: string };
  } | null = null;
let reachableChats = 0;
for (const chatId of candidateChatIds) {
  const url = new URL(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getChatMenuButton`);
  url.search = new URLSearchParams({ chat_id: chatId }).toString();
  const response = await fetch(url);
  const result = await response.json() as TelegramResponse<NonNullable<typeof menuButton>>;
  if (!response.ok || !result.ok || !result.result) continue;
  reachableChats += 1;
  if (result.result.type === "web_app") {
    menuButton = result.result;
    break;
  }
}

const expectedWebhook = buildTelegramWebhookUrl(env.NEXT_PUBLIC_APP_URL, process.env.PUBLIC_WEBHOOK_URL);
const expectedWebApp = new URL(env.NEXT_PUBLIC_APP_URL).toString();
assert(bot.id > 0, "Telegram bot identity is unavailable.");
assert(webhook.url === expectedWebhook, "Telegram webhook points to an unexpected URL.");
assert(!webhook.last_error_message, `Telegram reports a webhook error: ${webhook.last_error_message}`);
assert(menuButton, "No reachable active Telegram chat has a WebApp menu button.");
assert(menuButton.type === "web_app", "Telegram chat menu button is not a WebApp button.");
assert(menuButton.web_app?.url === expectedWebApp, "Telegram chat menu button points to an unexpected URL.");

console.log(JSON.stringify({
  smoke: "production-telegram",
  bot: "available",
  webhook: {
    matchesExpected: true,
    pendingUpdates: webhook.pending_update_count ?? 0,
    allowedUpdates: webhook.allowed_updates ?? []
  },
  menuButton: {
    type: menuButton.type,
    text: menuButton.text,
    urlMatchesExpected: true,
    reachableChats
  }
}));
