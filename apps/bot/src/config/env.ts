import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().trim().min(1),
  SUPABASE_URL: z.string().trim().url(),
  SUPABASE_ANON_KEY: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().trim().min(1).default("voice-records"),
  STT_API_KEY: z.string().trim().min(1),
  STT_API_URL: z.string().trim().url(),
  STT_MODEL: z.string().trim().min(1).default("whisper-large-v3-turbo"),
  LLM_API_KEY: z.string().trim().min(1),
  LLM_API_URL: z.string().trim().url(),
  LLM_MODEL: z.string().trim().min(1),
  DEFAULT_SHOP_NAME: z.string().trim().min(1).default("Демо-магазин")
});

export type AppEnv = z.infer<typeof envSchema>;

function loadEnvFiles() {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env.local"),
    resolve(process.cwd(), "../../.env")
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path, override: false });
    }
  }
}

export function getEnv() {
  loadEnvFiles();
  return envSchema.parse(process.env);
}
