// src/routes/ResetPassword.tsx
import React from "react";
import { useAuth } from "../contexts/AuthProvider";

export default function ResetPassword() {
  const { supabase } = useAuth();
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Bei Supabase reicht es nach Redirect i.d.R., updateUser direkt aufzurufen.
  // (Falls nicht, könnte man zusätzlich setSession mit Tokens aus der URL machen.)
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Passwort aktualisiert. Du kannst dich jetzt einloggen.");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-xl font-semibold">Neues Passwort setzen</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Neues Passwort"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Aktualisiere…" : "Passwort speichern"}
        </button>
      </form>
    </main>
  );
}
