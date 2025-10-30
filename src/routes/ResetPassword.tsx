// src/routes/ResetPassword.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthProvider";
import { useNavigate } from "react-router-dom";

/**
 * Passwort-Reset Seite
 * - Erwartet, dass der Supabase-Reset-Link auf /reset zeigt (emailRedirectTo / redirectTo).
 * - Handhabt sowohl ?code=... (GoTrue v2) als auch #access_token=... (älterer Flow).
 * - Baut bei Bedarf eine Session auf (exchangeCodeForSession), danach updateUser({ password }).
 */
export default function ResetPassword() {
  const { supabase, session } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);   // bereit zum Eingeben eines neuen Passworts
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 1) Beim Aufruf ggf. Session über Code/Token herstellen
  useEffect(() => {
    (async () => {
      try {
        // a) Neuer Flow: ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErr(`Fehler beim Herstellen der Sitzung: ${error.message}`);
            setReady(false);
            return;
          }
          setReady(true);
          return;
        }

        // b) Fallback: alter Flow mit #access_token im Hash
        if (window.location.hash.includes("access_token")) {
          // Supabase verarbeitet den Hash automatisch über auth.getSession() – kleine Wartezeit
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            setErr(`Fehler beim Herstellen der Sitzung: ${error.message}`);
            setReady(false);
            return;
          }
          setReady(!!data.session);
          return;
        }

        // c) Kein Code/Token – wenn bereits eingeloggt, können wir direkt resetten, sonst Fehler
        setReady(!!session);
        if (!session) {
          setErr(
            "Kein gültiger Reset-Link. Öffne den Link aus der E-Mail erneut oder fordere einen neuen an."
          );
        }
      } catch (e: any) {
        setErr(e?.message || "Unerwarteter Fehler beim Initialisieren.");
        setReady(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      if (!pw || pw.length < 8) {
        throw new Error("Bitte ein Passwort mit mindestens 8 Zeichen eingeben.");
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      setMsg("Passwort aktualisiert. Du wirst gleich weitergeleitet …");
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (e: any) {
      setErr(e?.message || "Passwort konnte nicht aktualisiert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Neues Passwort setzen</h1>

      {!ready && !err && (
        <p className="text-sm text-gray-600">
          Einen Moment bitte – wir bereiten den Reset vor …
        </p>
      )}

      {err && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {ready && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Neues Passwort"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {msg && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Aktualisiere…" : "Passwort speichern"}
          </button>
        </form>
      )}
    </main>
  );
}
