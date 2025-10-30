// src/components/LoginDialog.tsx
import React from "react";
import { X, Mail, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
};

type Mode = "magic" | "password";

export default function LoginDialog({ open, onClose, defaultEmail = "" }: Props) {
  const { supabase } = useAuth();
  const [email, setEmail] = React.useState(defaultEmail);
  const [password, setPassword] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("magic");
  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSuccessMsg(null);
      setErrorMsg(null);
      if (defaultEmail) setEmail(defaultEmail);
    }
  }, [open, defaultEmail]);

  if (!open) return null;

  const emailRedirectTo =
    (typeof window !== "undefined" && window.location.origin) || undefined;

  async function onSubmitMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo, // bei Supabase → Auth Redirect URL muss passen
        },
      });
      if (error) throw error;
      setSuccessMsg(
        "Login-Link wurde gesendet. Bitte prüfe dein Postfach und klicke auf den Link."
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setSuccessMsg("Erfolgreich eingeloggt. Fenster wird geschlossen …");
      // Kleiner Delay, damit die Meldung sichtbar ist
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            In dein PROPORA-Konto einloggen
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Modus-Toggle */}
          <div className="mb-4 inline-flex overflow-hidden rounded-lg border">
            <button
              className={`px-3 py-1.5 text-sm ${mode === "magic" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              onClick={() => setMode("magic")}
            >
              Magic-Link
            </button>
            <button
              className={`px-3 py-1.5 text-sm ${mode === "password" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              onClick={() => setMode("password")}
            >
              Passwort
            </button>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Forms */}
          {mode === "magic" ? (
            <form onSubmit={onSubmitMagic} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                E-Mail
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-gray-400"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {loading ? "Senden…" : "Login-Link senden"}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Du erhältst einen sicheren Login-Link per E-Mail. Der Link führt
                dich zurück in die App.
              </p>
            </form>
          ) : (
            <form onSubmit={onSubmitPassword} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                E-Mail
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <label className="mt-2 block text-sm font-medium text-gray-700">
                Passwort
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? "Einloggen…" : "Einloggen"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
