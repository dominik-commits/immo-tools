import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";

type Props = { open: boolean; onClose: () => void };

export default function LoginDialog({ open, onClose }: Props) {
  const { signIn, signUp, sendMagicLink, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "magic">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      if (mode === "login") {
        await signIn(email, pw);
        setMsg("Eingeloggt.");
        onClose();
      } else if (mode === "register") {
        await signUp(email, pw);
        setMsg("Registriert. Prüfe ggf. deine E-Mail.");
        onClose();
      } else {
        await sendMagicLink(email);
        setMsg("Magic Link gesendet. Bitte E-Mail prüfen.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Fehler");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "login" ? "Login" : mode === "register" ? "Konto erstellen" : "Magic Link anfordern"}
          </h2>
          <button onClick={onClose} className="rounded p-2 hover:bg-gray-100">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {mode !== "magic" && (
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Passwort"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}

          <button
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === "login" ? "Einloggen" : mode === "register" ? "Registrieren" : "Magic Link senden"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="text-blue-600 hover:underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Login"}
          </button>
          <button className="text-blue-600 hover:underline" onClick={() => setMode("magic")}>
            Login per Magic-Link
          </button>
        </div>
      </div>
    </div>
  );
}
