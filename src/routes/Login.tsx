// src/routes/Login.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthProvider";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { supabase, session } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Wenn bereits eingeloggt: direkt ins Dashboard
  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pw,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { emailRedirectTo: `${window.location.origin}/reset` },
        });
        if (error) throw error;
      }
      navigate("/", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">
          {mode === "login" ? "Einloggen" : "Konto erstellen"}
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          {mode === "login"
            ? "Melde dich mit E-Mail und Passwort an."
            : "Lege ein neues Konto mit E-Mail und Passwort an."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@domain.de"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              required
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Registrieren"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            className="text-gray-700 underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Neu hier? Konto anlegen" : "Schon dabei? Einloggen"}
          </button>
          <Link to="/reset" className="text-gray-700 underline">
            Passwort vergessen?
          </Link>
        </div>
      </div>
    </main>
  );
}
