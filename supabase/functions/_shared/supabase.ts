import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requiredEnv } from "./http.ts";

/**
 * Service-role client. Never send this key to the browser. It bypasses RLS and
 * is used only inside Edge Functions after the caller has been authenticated
 * and their Patreon entitlement has been verified.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
