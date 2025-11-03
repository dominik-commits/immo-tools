// supabase-js v2
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// HMR/SSR-safe Singleton (verhindert mehrere GoTrue Instanzen)
const g = globalThis as any;
export const supabase =
  g.__SUPABASE_CLIENT__ ??
  createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "propora-auth", // eindeutiger Key
    },
  });

g.__SUPABASE_CLIENT__ = supabase;
export default supabase;
