import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Falls du bereits einen Client-Wrapper nutzt, ersetze diesen Block durch: import { supabase } from "@/lib/supabaseClient";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});

export default function AuthCallback() {
  const [msg, setMsg] = useState("Authentifiziere…");
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const type = params.get("type"); // z.B. "recovery"
    // detectSessionInUrl: true kümmert sich um den Token aus der URL.
    const t = setTimeout(async () => {
      if (type === "recovery") {
        // Nutzer kommt aus "Passwort vergessen" → neues Passwort setzen
        navigate("/update-password", { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMsg("Fehler bei der Sitzung. Bitte erneut einloggen.");
        return;
      }
      if (data.session) {
        // Optional: "next" aus localStorage/Query abholen
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
