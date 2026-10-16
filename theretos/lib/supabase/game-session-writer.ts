import "server-only";

import { createClient } from "@supabase/supabase-js";

// Separate from the SSR client: no browser session, cookies or shared auth state.
export function createGameSessionWriter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Game session writer is not configured");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
