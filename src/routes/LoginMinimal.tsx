// src/routes/LoginMinimal.tsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

export default function LoginMinimal() {
  const { signInWithPassword } = useAuth(); // funktioniert direkt mit neuem AuthProvider
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await signInWithPassword(email, pw);
      if (error) throw error;
      navigate(next, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Einloggen</h1>

      {err && <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700">
          E-Mail
          <div className="mt-1 flex items-center rounded border border-gray-300 bg-white px-3">
            <Mail className="mr-2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
            />
          </div>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Passwort
          <div className="mt-1 flex items-center rounded border border-gray-300 bg-white px-3">
            <Lock className="mr-2 h-4 w-4 text-gray-400" />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              minLength={8}
              className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Bitte warten…" : "Anmelden"}
        </button>
      </form>

      <div className="mt-3 flex justify-between text-sm text-gray-600">
        <Link to="/reset" className="hover:underline">
          Passwort vergessen
        </Link>
        <Link to="/preise" className="hover:underline">
          Noch keinen Zugang?
        </Link>
      </div>
    </div>
  );
}
