import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://tadqvfnqykmjdxzpoczp.supabase.co";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZHF2Zm5xeWttamR4enBvY3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDQyNTEsImV4cCI6MjA4ODEyMDI1MX0.0Fhl0RuTFk-qtPQ5Au7iZrk9mnE8Gieth7PWdc12rxo";

/**
 * Client-side Supabase instance (anon key) used exclusively for
 * Supabase Auth operations (Google OAuth).
 *
 * We use `implicit` flow instead of `pkce` because React Native's
 * WebBrowser redirects can cause the OS to kill the app process,
 * which destroys the PKCE code_verifier stored in AsyncStorage.
 * The implicit flow returns access_token + refresh_token directly
 * in the URL fragment, so no code exchange step is needed.
 *
 * All other data operations continue to go through the Express API
 * which uses the service-role key on the server.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "implicit",
  },
});

