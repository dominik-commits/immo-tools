// src/routes/Login.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthProvider";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { supabase, session } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // Wenn bereits eingeloggt: direkt ins Dashboard
  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;
      navigate("/", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setErr(null);
    setMsg(null);
    if (!email) {
      setErr("Bitte gib zuerst deine E-Mail ein.");
      return;
    }
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    setResetBusy(false);
    if (error) setErr(error.message);
    else setMsg("Wir haben dir einen Link zum Zurücksetzen geschickt.");
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">Einloggen</h1>
        <p className="mb-5 text-sm text-gray-600">
          Melde dich mit E-Mail und Passwort an. Noch keinen Zugang?{" "}
          <Link to="/preise" className="underline">
            Jetzt kaufen
          </Link>
          .
        </p>

        <form onSubmit={handleLogin} className="space-y-3">
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
              autoComplete="current-password"
            />
          </div>

          {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Bitte warten…" : "Einloggen"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={handleReset}
            disabled={resetBusy}
            className="text-gray-700 underline underline-offset-2 hover:text-gray-900 disabled:opacity-50"
          >
            Passwort vergessen?
          </button>
          <Link to="/preise" className="text-gray-700 underline underline-offset-2 hover:text-gray-900">
            Zugang kaufen
          </Link>
        </div>
      </div>
    </main>
  );
}
