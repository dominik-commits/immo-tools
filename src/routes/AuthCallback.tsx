// src/routes/AuthCallback.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Authentifiziere…");
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const type = params.get("type"); // z. B. "recovery" bei Passwort-Reset

    const t = setTimeout(async () => {
      if (type === "recovery") {
        // Nutzer kommt aus „Passwort vergessen“ → weiter zur Seite Neues Passwort
        navigate("/update-password", { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMsg("Fehler bei der Sitzung. Bitte erneut einloggen.");
        return;
      }

      if (data.session) {
        // Nach erfolgreicher Authentifizierung weiterleiten
        const nextFromQs = params.get("next");
        const nextFromLs = localStorage.getItem("propora.next_after_login");
        const next = nextFromQs || nextFromLs || "/";
        localStorage.removeItem("propora.next_after_login");
        navigate(next, { replace: true });
      } else {
        setMsg("Keine aktive Sitzung gefunden. Bitte erneut einloggen.");
      }
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Weiterleitung…</h1>
      <p className="mt-2 text-sm text-gray-600">{msg}</p>
    </div>
  );
}
