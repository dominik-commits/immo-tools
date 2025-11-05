// src/components/LoginDialog.tsx
import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { useAuth } from "../contexts/AuthProvider";

type Props = { open: boolean; onClose: () => void };
type Mode = "login" | "signup";

export default function LoginDialog({ open, onClose }: Props) {
  const { supabase } = useAuth();
  const [mode, setMode] = React.useState<Mode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // ⛑️ nur nach Client-Mount rendern (Portal-Ziel existiert sicher)
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Reset bei Öffnen
  React.useEffect(() => {
    if (open) {
      setMode("login");
      setEmail("");
      setPassword("");
      setBusy(false);
      setMsg(null);
      setErr(null);
    }
  }, [open]);

  // Body-Scroll sperren + ESC schließt
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else { setMsg("Erfolgreich eingeloggt."); onClose(); window.location.reload(); }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/reset` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else { setMsg("Account erstellt. Du bist eingeloggt."); onClose(); window.location.reload(); }
  }

  async function handleReset() {
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Reset-Link wurde per E-Mail gesendet.");
  }

  const body = (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/30 p-4"
      role="dialog" aria-modal="true" onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {mode === "login" ? "Einloggen" : "Registrieren"}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Dialog schließen">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-Mail</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@domain.de" autoComplete="email" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Passwort</label>
            <input type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••" autoComplete={mode==="login"?"current-password":"new-password"} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-600">{msg}</p>}

          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center rounded-lg bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy ? "Bitte warten…" : (mode === "login" ? "Einloggen" : "Registrieren")}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between text-sm">
          <button onClick={()=>setMode(mode==="login"?"signup":"login")}
            className="text-gray-700 underline underline-offset-2 hover:text-gray-900">
            {mode==="login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Einloggen"}
          </button>
          <button onClick={handleReset} disabled={!email || busy}
            className="text-gray-700 underline underline-offset-2 hover:text-gray-900 disabled:opacity-50">
            Passwort vergessen
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(body, document.body);
}
