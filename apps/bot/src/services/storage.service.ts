import { createClient } from "@supabase/supabase-js";
import type { AppEnv } from "../config/env";

export type UploadedAudio = {
  path: string;
  publicUrl: string;
};

export async function uploadVoiceAudio(env: AppEnv, audio: Buffer, contentType: string, sellerTelegramId: number) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const extension = contentType.includes("mpeg")
    ? "mp3"
    : contentType.includes("wav")
      ? "wav"
      : contentType.includes("webm")
        ? "webm"
        : "ogg";
  const path = `${sellerTelegramId}/${new Date().toISOString()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, audio, {
    contentType,
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl
  };
}
