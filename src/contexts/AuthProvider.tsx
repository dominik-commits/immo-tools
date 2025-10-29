// src/contexts/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

// 👉 Vite-ENV Variablen (müssen im Build gesetzt sein)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnon) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// ⚠️ lockere Typisierung, damit es keine Generics-Konflikte gibt
export const supabase: SupabaseClient<any> = createClient<any>(supabaseUrl ?? "", supabaseAnon ?? "", {
  auth: { persistSession: true, autoRefreshToken: true },
});

type AuthCtx = {
  supabase: SupabaseClient<any>;
  session: Session | null;
  user: User | null;           // <-- damit NavAuth/ProtectedRoute .user hat
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("⚠️ getSession:", error.message);
        if (mounted) setSession(data?.session ?? null);
      } catch (e: any) {
        console.warn("⚠️ getSession threw:", e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
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
          options: { emailRedirectTo: `${window.location.origin}/konto` },
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
