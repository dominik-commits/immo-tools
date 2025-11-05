// src/contexts/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient"; // ⬅️ EINZIGER Client

type AuthCtx = {
  supabase: typeof supabase;
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
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data?.session ?? null);
      } finally {
        setLoading(false);
      }
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
        setSession(s ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })();

    return () => unsubscribe?.();
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
