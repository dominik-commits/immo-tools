// src/routes/Konto.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { useUserPlan } from "@/hooks/useUserPlan";
import { LogOut, ArrowRight, Loader2, ReceiptText } from "lucide-react";

export default function Konto() {
  const { supabase, session, loading } = useAuth();
  const plan = useUserPlan(); // "basis" | "pro" | null (während Ladephase)

  const [busy, setBusy] = React.useState(false);
  const [portalBusy, setPortalBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // 1) Auth lädt noch → Skeleton
  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
      </main>
    );
  }

  // 2) Keine Session → zum Login (öffnet Dialog über ?login=true)
  if (!session) return <Navigate to="/login?login=true" replace />;

  const email = session.user.email ?? "—";
  const planLabel = plan ? (plan === "pro" ? "PRO" : "BASIS") : "…";

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await supabase.auth.signOut();
      window.location.href = "/"; // hart navigieren, räumt alles sauber auf
    } catch (e: any) {
      setErr(e?.message || "Logout fehlgeschlagen.");
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      });
      if (error) throw error;
      alert("Wir haben dir einen Link zum Zurücksetzen gesendet.");
    } catch (e: any) {
      setErr(e?.message || "Konnte E-Mail nicht senden.");
    } finally {
      setBusy(false);
    }
  }

  async function openBillingPortal() {
    if (portalBusy) return;
    setPortalBusy(true);
    setErr(null);

    try {
      const { data: s } = await supabase.auth.getSession();
      const mail = s.session?.user?.email;
      if (!mail) throw new Error("Nicht eingeloggt.");

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mail,
          return_url: `${window.location.origin}/konto`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "Portal-Fehler");
      window.location.href = json.url; // Weiterleitung zu Stripe
    } catch (e: any) {
      setErr(e?.message || "Konnte Kundenportal nicht öffnen.");
      setPortalBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Dein Konto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Angemeldet als <span className="font-medium text-gray-900">{email}</span>
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-600">Plan:</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {planLabel}
          </span>
        </div>

        {err && (
          <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {err}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={openBillingPortal}
            disabled={portalBusy}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {portalBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Öffne Kundenportal…
              </>
            ) : (
              <>
                <ReceiptText className="h-4 w-4" /> Rechnungen & Abo verwalten
              </>
            )}
          </button>

          <button
            onClick={handleResetPassword}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Passwort zurücksetzen <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleLogout}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Abmelden…
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" /> Logout
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Hinweis: Falls in der Konsole Warnungen von Browser-Extensions erscheinen,
          teste einmal im Inkognito-Fenster ohne Extensions – das betrifft nicht die App.
        </p>
      </div>
    </main>
  );
}
