// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  // Siehst du in der Konsole, falls die ENV fehlt
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  throw new Error("Supabase ENV missing");
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,     // wichtig, damit die Session im Browser bleibt
    autoRefreshToken: true,
    detectSessionInUrl: true, // Magic-Link Redirects
  },
});
