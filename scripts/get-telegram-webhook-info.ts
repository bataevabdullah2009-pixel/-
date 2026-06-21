import {
  buildTelegramWebhookUrl,
  parseTelegramPublicUrl
} from "@voice-sales-log/shared/utils/telegram-url";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }

  return value;
}

const botToken = getRequiredEnv("TELEGRAM_BOT_TOKEN");
const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");
const normalizedAppUrl = parseTelegramPublicUrl(appUrl, "NEXT_PUBLIC_APP_URL")
  .toString()
  .replace(/\/$/, "");
const expectedWebhookUrl = buildTelegramWebhookUrl(appUrl, process.env.PUBLIC_WEBHOOK_URL);

const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
const result = await response.json();
const info = result.result ?? {};
const currentWebhookUrl = info.url ?? "";
const webhookMatchesExpected = currentWebhookUrl === expectedWebhookUrl;

console.log(
  JSON.stringify(
    {
      current_webhook_url: currentWebhookUrl,
      pending_update_count: info.pending_update_count ?? 0,
      last_error: info.last_error_message ?? null,
      allowed_updates: info.allowed_updates ?? [],
      configured_web_app_url: normalizedAppUrl,
      expected_webhook_url: expectedWebhookUrl,
      webhook_matches_expected: webhookMatchesExpected
    },
    null,
    2
  )
);

if (!response.ok || result.ok !== true || !webhookMatchesExpected) {
  process.exitCode = 1;
}
