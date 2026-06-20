function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }

  return value;
}

const botToken = getRequiredEnv("TELEGRAM_BOT_TOKEN");

const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
const result = await response.json();
const info = result.result ?? {};

console.log(
  JSON.stringify(
    {
      current_webhook_url: info.url ?? "",
      pending_update_count: info.pending_update_count ?? 0,
      last_error: info.last_error_message ?? null,
      allowed_updates: info.allowed_updates ?? []
    },
    null,
    2
  )
);

if (!response.ok || result.ok !== true) {
  process.exitCode = 1;
}
