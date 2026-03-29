// src/routes/ResetPassword.tsx
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      setState("error");
      setMsg(error.message || "Unbekannter Fehler.");
    } else {
      setState("done");
      setMsg("E-Mail zum Zurücksetzen wurde gesendet. Bitte Posteingang prüfen.");
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Passwort zurücksetzen</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gib deine E-Mail ein. Wir senden dir einen Link zum Setzen eines neuen Passworts.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          className="w-full rounded bg-black px-3 py-2 font-semibold text-white disabled:opacity-50"
          disabled={!email || state === "loading"}
        >
          {state === "loading" ? "Sende…" : "Link senden"}
        </button>
      </form>

      {msg && (
        <p
          className={`mt-3 text-sm ${
            state === "error" ? "text-red-600" : "text-green-700"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
