import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.warn("Supabase environment variables are missing. Authentication will fail.");
}

/**
 * Singleton Supabase client initialized via environment variables.
 * This is the ONLY place where createClient should be called.
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);
