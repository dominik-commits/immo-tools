// src/routes/ResetPassword.tsx
import React from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";

type Stage = "exchanging" | "form" | "success" | "error";

export default function ResetPassword() {
  const { supabase } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [stage, setStage] = React.useState<Stage>("exchanging");
  const [error, setError] = React.useState<string | null>(null);
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Helper: URL-Parameter aus ?query, #hash und #...?... lesen (+ decode)
  function getParam(name: string): string | null {
    // 1) ?query
    const q = new URLSearchParams(location.search);
    const fromQuery = q.get(name);
    if (fromQuery) return decodeURIComponent(fromQuery);

    // 2) #hash direkt
    const rawHash = location.hash?.replace(/^#/, "") || "";
    const h = new URLSearchParams(rawHash);
    const fromHash = h.get(name);
    if (fromHash) return decodeURIComponent(fromHash);

    // 3) verschachtelt im Hash (#…?foo=bar)
    const qIdx = rawHash.indexOf("?");
    if (qIdx >= 0) {
      const nested = new URLSearchParams(rawHash.slice(qIdx + 1));
      const fromNested = nested.get(name);
      if (fromNested) return decodeURIComponent(fromNested);
    }
    return null;
  }

  // Hash/Query parsen & Session herstellen (+ Fallback via onAuthStateChange)
  React.useEffect(() => {
    let unsub: (() => void) | undefined;

    async function bootstrap() {
      setStage("exchanging");
      setError(null);

      const code = getParam("code");
      const type = getParam("type");
      const tokenHash = getParam("token_hash");
      const accessToken = getParam("access_token");
      const refreshToken = getParam("refresh_token");
      const errorDesc = getParam("error_description");

      try {
        if (errorDesc) throw new Error(errorDesc);

        // Fallback: höre auf PASSWORD_RECOVERY-Event (z. B. mobile Clients)
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            window.history.replaceState(null, "", "/reset");
            setStage("form");
          }
        });
        unsub = sub?.subscription?.unsubscribe;

        // A) PKCE Code-Flow (?code=…)
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
          window.history.replaceState(null, "", "/reset");
          setStage("form");
          return;
        }

        // B) Klassischer Recovery-Flow (?token_hash=…&type=recovery)
        if (tokenHash && type === "recovery") {
          const { error: vErr } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (vErr) throw vErr;
          window.history.replaceState(null, "", "/reset");
          setStage("form");
          return;
        }

        // C) Tokens im Hash (#access_token=…)
        if (accessToken && type === "recovery") {
          const { error: sErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          if (sErr) throw sErr;
          window.history.replaceState(null, "", "/reset");
          setStage("form");
          return;
        }

        // Keine der Varianten gegriffen → warten kurz auf Event, sonst Fehler
        // (einige Clients feuern sofort PASSWORD_RECOVERY)
        setTimeout(() => {
          if (stage === "exchanging") {
            setError("Kein gültiger Reset-Code gefunden. Bitte öffne den Link aus der E-Mail erneut.");
            setStage("error");
          }
        }, 600);
      } catch (e: any) {
        setError(e?.message || "Reset-Link ungültig oder abgelaufen.");
        setStage("error");
      }
    }

    bootstrap();
    return () => { if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pw1.length < 8) return setError("Bitte wähle ein Passwort mit mindestens 8 Zeichen.");
    if (pw1 !== pw2) return setError("Die Passwörter stimmen nicht überein.");

    setBusy(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: pw1 });
      if (upErr) throw upErr;

      // Recovery-Session beenden, dann sauber zum Login
      await supabase.auth.signOut();
      setStage("success");
      setTimeout(() => navigate("/login?reset=done"), 900);
    } catch (err: any) {
      setError(err?.message || "Passwort konnte nicht gesetzt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* kleines Logo oben links */}
      <div className="absolute left-6 top-6">
        <img src="/assets/propora-logo.png" alt="PROPORA" className="h-6 w-auto" />
      </div>

      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl md:p-8">
          <h1 className="mb-2 text-center text-xl font-bold text-gray-900">
            Neues Passwort setzen
          </h1>

          {stage === "exchanging" && (
            <p className="text-center text-sm text-gray-600">
              Einen Moment bitte – wir bereiten den Reset vor …
            </p>
          )}

          {stage === "error" && (
            <div>
              <div className="mb-4 flex items-center justify-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-semibold">Reset fehlgeschlagen</span>
              </div>
              {error && (
                <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}
              <div className="text-center">
                <Link to="/login" className="text-sm text-[#0F2C8A] hover:underline">
                  Zurück zum Login
                </Link>
              </div>
            </div>
          )}

          {stage === "form" && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Neues Passwort
                <div className="mt-1 flex items-center rounded-xl border border-gray-300 bg-white px-3">
                  <Lock className="mr-2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); }}
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Passwort bestätigen
                <div className="mt-1 flex items-center rounded-xl border border-gray-300 bg-white px-3">
                  <Lock className="mr-2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); }}
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#0F2C8A] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Wird gespeichert …" : "Passwort speichern"}
              </button>

              <div className="mt-3 text-center">
                <Link to="/login" className="text-xs text-gray-600 underline underline-offset-2">
                  Zurück zum Login
                </Link>
              </div>
            </form>
          )}

          {stage === "success" && (
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">Passwort aktualisiert</span>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Du wirst gleich zum Login weitergeleitet …
              </p>
              <Link to="/login?reset=done" className="text-sm text-[#0F2C8A] hover:underline">
                Jetzt zum Login
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
