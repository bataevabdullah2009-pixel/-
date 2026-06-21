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
const webhookSecret = getRequiredEnv("TELEGRAM_WEBHOOK_SECRET");
const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");
parseTelegramPublicUrl(appUrl, "NEXT_PUBLIC_APP_URL");
const webhookUrl = buildTelegramWebhookUrl(appUrl, process.env.PUBLIC_WEBHOOK_URL);

const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: webhookSecret,
    allowed_updates: ["message"],
    drop_pending_updates: true
  })
});

const result = await response.json();

console.log(JSON.stringify(result, null, 2));

if (!response.ok || result.ok !== true) {
  process.exitCode = 1;
}
