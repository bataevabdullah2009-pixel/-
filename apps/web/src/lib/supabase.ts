import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function createSupabaseClient(key: string) {
  const url = process.env.SUPABASE_URL;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getSupabaseAdminClient() {
  adminClient ??= createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  return adminClient;
}

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "voice-records";
}
