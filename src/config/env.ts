/**
 * Application environment configuration.
 * Exposes environment variables in a typed and validated manner.
 * 
 * Never expose secrets (Supabase keys, API keys) in this file unless they are explicitly public.
 */

export const env = {
  // API Configuration
  // Fallback to a relative '/api' if VITE_API_BASE_URL is not set, 
  // preventing silent failure or calling undefined endpoints.
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api",
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // Environment context
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};
