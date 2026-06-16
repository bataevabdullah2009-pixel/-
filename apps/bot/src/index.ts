import { getTelegramUpdateBot } from "./core/process-update";
import { logger } from "./utils/logger";

if (process.env.VERCEL === "1") {
  logger.warn("Telegram polling is disabled on Vercel. Use the webhook route instead.");
  process.exit(0);
}

const bot = getTelegramUpdateBot();
await bot.launch();
logger.info("Telegram bot polling started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
