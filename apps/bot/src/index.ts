import { getEnv } from "./config/env";
import { registerStartHandler } from "./handlers/start.handler";
import { registerTextHandler } from "./handlers/text.handler";
import { registerVoiceHandler } from "./handlers/voice.handler";
import { createTelegramBot } from "./services/telegram.service";
import { logger } from "./utils/logger";

const env = getEnv();
const bot = createTelegramBot(env);

registerStartHandler(bot, env);
registerVoiceHandler(bot, env);
registerTextHandler(bot);

bot.catch((error) => {
  logger.error("Unhandled bot error", { error });
});

await bot.launch();
logger.info("Telegram bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
