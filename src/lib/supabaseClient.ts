// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MISSING_ENV_MSG =
  "Supabase nicht initialisiert: Bitte VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Vercel setzen und neu deployen.";

/** Fallback-Client: wirf NICHT bei getSession/onAuthStateChange,
 * damit Guards sauber redirecten können statt zu hängen. */
function createStubClient(): SupabaseClient {
  const err = () => new Error(MISSING_ENV_MSG);

  const auth = {
    // “lesende” Pfade liefern neutrale Defaults:
    async getSession() {
      console.error(MISSING_ENV_MSG);
      return { data: { session: null }, error: err() };
    },
    onAuthStateChange() {
      console.error(MISSING_ENV_MSG);
      return {
        data: { subscription: { unsubscribe: () => void 0 } },
        error: err(),
      } as any;
    },

    // “schreibende” Pfade bleiben guard-rail hart:
    async signInWithPassword() { throw err(); },
    async signInWithOAuth()    { throw err(); },
    async signUp()             { throw err(); },
    async signOut()            { throw err(); },
    async resetPasswordForEmail() { throw err(); },
    async exchangeCodeForSession() { throw err(); },
    async verifyOtp()          { throw err(); },
    async setSession()         { throw err(); },
    async updateUser()         { throw err(); },
  } as any;

  return new Proxy({ auth } as any, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      throw err();
    },
  }) as SupabaseClient;
}

// global cachen (HMR etc.)
type G = typeof globalThis & { __supabase?: SupabaseClient };
const g = globalThis as G;

export const supabase: SupabaseClient =
  g.__supabase ??
  (url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "propora-auth",
        },
      })
    : createStubClient());

if (!g.__supabase) g.__supabase = supabase;

export default supabase;

/* Optional: kleine Helfer, damit Guards knapper bleiben */
export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session; // kann null sein
}
export async function signOutSafe() {
  try { await supabase.auth.signOut(); } catch (_) {/* noop */}
}
