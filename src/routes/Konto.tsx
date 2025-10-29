import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Konto() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openBillingPortal() {
    setLoading(true); setErr(null);
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;
    if (!email) { setErr("Nicht eingeloggt."); setLoading(false); return; }

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          return_url: `${window.location.origin}/konto`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "Portal-Fehler");
      window.location.href = json.url; // Weiterleitung zu Stripe
    } catch (e:any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Dein Konto</h1>
      <p className="mt-1 text-gray-600">Verwalte Abo & Rechnungen im Kundenportal.</p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={openBillingPortal}
          disabled={loading}
          className="rounded-md bg-[#0F2C8A] px-4 py-2 text-white hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Öffne Kundenportal…" : "Rechnungen & Abo verwalten"}
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      {/* Optional: weitere Profildaten, E-Mail, Plan etc. */}
    </main>
  );
}
