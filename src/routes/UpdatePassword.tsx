// src/routes/UpdatePassword.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePassword() {
  const [pw, setPw] = useState("");
  const [repeat, setRepeat] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (pw.length < 8) {
      setState("error");
      setMsg("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (pw !== repeat) {
      setState("error");
      setMsg("Passwörter stimmen nicht überein.");
      return;
    }

    setState("loading");
    setMsg("");

    const { error } = await supabase.auth.updateUser({ password: pw });

    if (error) {
      setState("error");
      setMsg(error.message || "Aktualisierung fehlgeschlagen.");
    } else {
      setState("done");
      setMsg("Passwort aktualisiert. Du kannst dich jetzt anmelden.");
      setTimeout(() => navigate("/login", { replace: true }), 900);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Neues Passwort setzen</h1>
      <p className="mt-1 text-sm text-gray-600">
        Du wurdest über den Link in der E-Mail hierher geleitet. Lege jetzt dein neues Passwort fest.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Neues Passwort"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Neues Passwort wiederholen"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
        />
        <button
          className="w-full rounded bg-black px-3 py-2 font-semibold text-white disabled:opacity-50"
          disabled={state === "loading"}
        >
          {state === "loading" ? "Speichere…" : "Passwort speichern"}
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
