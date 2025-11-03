// src/routes/Login.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthProvider";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogIn, Mail, Lock, Globe } from "lucide-react";

export default function Login() {
  const { supabase, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // next=/ziel Handling
  const search = new URLSearchParams(location.search);
  const nextFromQuery = search.get("next") || "";
  const NEXT_KEY = "propora.next_after_login";
  const sanitizeNext = (v: string) => !v
    ? "/"
    : v.startsWith("http://") || v.startsWith("https://") || v.startsWith("//")
    ? "/"
    : v.startsWith("/") ? v : `/${v}`;

  useEffect(() => {
    if (nextFromQuery) {
      try { localStorage.setItem(NEXT_KEY, sanitizeNext(nextFromQuery)); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session) {
      const stored = (() => { try { return localStorage.getItem(NEXT_KEY); } catch { return null; } })();
      const target = sanitizeNext(stored || nextFromQuery || "/");
      try { localStorage.removeItem(NEXT_KEY); } catch {}
      navigate(target, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) throw error;
      const stored = (() => { try { return localStorage.getItem(NEXT_KEY); } catch { return null; } })();
      const target = sanitizeNext(stored || nextFromQuery || "/");
      try { localStorage.removeItem(NEXT_KEY); } catch {}
      navigate(target, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google") {
    try {
      if (nextFromQuery) {
        try { localStorage.setItem(NEXT_KEY, sanitizeNext(nextFromQuery)); } catch {}
      }
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + "/login" },
      });
    } catch (e: any) {
      setErr(e?.message || "OAuth fehlgeschlagen.");
    }
  }

  async function handleReset() {
    setErr(null);
    setMsg(null);
    if (!email) { setErr("Bitte gib zuerst deine E-Mail ein."); return; }
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset` });
    setResetBusy(false);
    if (error) setErr(error.message); else setMsg("Wir haben dir einen Link zum Zurücksetzen geschickt.");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F6F8FF] via-[#F8FAFF] to-[#EEF2FF]">
      {/* Brand-Ecke */}
      <div className="absolute left-6 top-6 flex items-center gap-2">
        <img src="/assets/propora-logo.png" alt="PROPORA" className="h-6 w-auto" />
      </div>

      {/* Deko-Gradients */}
      <div className="pointer-events-none absolute -left-40 top-48 h-80 w-80 rounded-full bg-[#0F2C8A]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-24 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />

      {/* Center Card */}
      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur-sm md:p-8">
          <h1 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-gray-900">Willkommen zurück</h1>

          {/* Google */}
          <button
            onClick={() => handleOAuth("google")}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Globe className="h-4 w-4" />
            Weiter mit Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px grow bg-gray-200" />
            <span className="text-xs text-gray-500">oder</span>
            <div className="h-px grow bg-gray-200" />
          </div>

          {nextFromQuery && (
            <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Nach dem Login wirst du weitergeleitet zu <span className="font-medium">{sanitizeNext(nextFromQuery)}</span>.
            </p>
          )}
          {err && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              E-Mail
              <div className="mt-1 flex items-center rounded-xl border border-gray-300 bg-white px-3">
                <Mail className="mr-2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
                  placeholder="name@beispiel.de"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Passwort
              <div className="mt-1 flex items-center rounded-xl border border-gray-300 bg-white px-3">
                <Lock className="mr-2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#0F2C8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Bitte warten…" : "Anmelden"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              onClick={handleReset}
              disabled={resetBusy}
              className="text-[#0F2C8A] hover:underline disabled:opacity-50"
            >
              Passwort vergessen?
            </button>
            <Link
              to="/preise"
              onClick={() => {
                if (nextFromQuery) {
                  try { localStorage.setItem(NEXT_KEY, sanitizeNext(nextFromQuery)); } catch {}
                }
              }}
              className="text-gray-700 hover:underline"
            >
              Noch keinen Zugang?
            </Link>
          </div>
        </div>
      </main>

      {/* Footer-Zeile (dezent) */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} PROPORA
      </div>
    </div>
  );
}
