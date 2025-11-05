// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  throw new Error("Supabase ENV missing");
}

// globaler Cache → verhindert mehrere GoTrue-Instanzen (HMR, Micro-Bundles, etc.)
const g = globalThis as unknown as { __supabase?: SupabaseClient };

export const supabase =
  g.__supabase ??
  createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // wichtig für Recovery/Magic-Link Flows
      storageKey: "propora-auth", // EIN Key für die ganze App
    },
  });

if (!g.__supabase) g.__supabase = supabase;
