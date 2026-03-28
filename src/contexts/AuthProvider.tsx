// src/contexts/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  Session,
  User,
  SupabaseClient,
  AuthChangeEvent,
} from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

export type AuthCtx = {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
};

const Ctx = createContext<AuthCtx | null>(null);
export const NEXT_AFTER_LOGIN = "propora.next_after_login";

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = supabase as unknown as SupabaseClient;

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, sess: Session | null) => {
        setSession(sess);
        setUser(sess?.user ?? null);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [client]);

  async function signInWithPassword(email: string, password: string) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }

  async function signInWithOtp(email: string) {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message };
  }

  async function signInWithOAuth(provider: "google" | "github") {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message };
  }

  async function signUp(email: string, password: string) {
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message };
  }

  async function signOut() {
    await client.auth.signOut();
  }

  async function sendPasswordReset(email: string) {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    return { error: error?.message };
  }

  async function updatePassword(newPassword: string) {
    const { error } = await client.auth.updateUser({ password: newPassword });
    return { error: error?.message };
  }

  const value = useMemo<AuthCtx>(
    () => ({
      supabase: client,
      user,
      session,
      loading,
      signInWithPassword,
      signInWithOtp,
      signInWithOAuth,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
    }),
    [client, user, session, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export default AuthProvider;