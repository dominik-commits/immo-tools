// src/contexts/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from "@supabase/supabase-js";

/* ===========================================
   Supabase – Singleton Client (HMR/SSR-safe)
   =========================================== */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnon) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// Einmal erzeugen und auf globalThis cachen → verhindert mehrere GoTrue-Instanzen
const g = globalThis as any;
export const supabase: SupabaseClient<any> =
  g.__PROPORA_SUPABASE__ ??
  createClient<any>(supabaseUrl ?? "", supabaseAnon ?? "", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "propora-auth", // eindeutiger Storage-Key
    },
  });

g.__PROPORA_SUPABASE__ = supabase;

/* =============== Context API =============== */

type AuthCtx = {
  supabase: SupabaseClient<any>;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("⚠️ getSession:", error.message);
        setSession(data?.session ?? null);
      } catch (e: any) {
        console.warn("⚠️ getSession threw:", e?.message || e);
      } finally {
        setLoading(false);
      }

      const sub = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s ?? null);
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();

    return () => {
      unsub?.();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      loading,
      async signInWithEmail(email: string) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/konto`,
          },
        });
        return { error: error ?? undefined };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
