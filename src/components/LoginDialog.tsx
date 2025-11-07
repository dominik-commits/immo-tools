// src/components/LoginDialog.tsx
import React from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Mail, Lock, X } from "lucide-react";

type Props = { open: boolean; onClose: () => void };

function withTimeout<T>(p: Promise<T>, ms = 15000) {
  return Promise.race<T>([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("Zeitüberschreitung beim Login")), ms)
    ) as any,
  ]);
}

export default function LoginDialog({ open, onClose }: Props) {
  const { supabase } = useAuth();
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!supabase) {
      setErr("Auth-Client nicht initialisiert.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pw,
        })
      );
      if (error) throw error;
      onClose();
    } catch (e: any) {
      // typische Supabase-Fehler als freundliche Texte
      const raw = String(e?.message ?? "");
      if (/invalid login credentials/i.test(raw)) {
        setErr("Ungültige E-Mail oder Passwort.");
      } else if (/over quota|rate/i.test(raw)) {
        setErr("Zu viele Versuche. Bitte kurz warten und erneut probieren.");
      } else if (/timeout/i.test(raw)) {
        setErr("Zeitüberschreitung beim Login. Bitte erneut versuchen.");
      } else {
        setErr(raw || "Login fehlgeschlagen.");
      }
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (!busy) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-3">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-semibold">Einloggen</h3>
          <button
            onClick={close}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {err && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>
        )}

        <form onSubmit={submit} className="space-y-3">
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

        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>Noch kein Konto? Registrieren</span>
          <span>Passwort vergessen</span>
        </div>
      </div>
    </div>
  );
}
