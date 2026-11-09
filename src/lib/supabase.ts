import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * The Supabase client is only created when real credentials are configured.
 * This lets the whole UI run in Demo Mode without a backend.
 */
export const supabase: SupabaseClient | null = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
