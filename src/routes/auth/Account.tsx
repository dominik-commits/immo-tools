import React from "react";
import { UserProfile, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { Loader2, ReceiptText } from "lucide-react";
import { isPro, useUserPlan } from "../../hooks/useUserPlan";

// Button für Stripe-Kundenportal (Rechnungen, Zahlungsmethode, Kündigung).
// Bewusst hier auf der einzigen aktuell erreichbaren Konto-Seite platziert --
// die alte Konto.tsx/api/stripe/portal.js-Kombination war über keine Route
// erreichbar, PRO-Kunden hatten dadurch gar keinen Weg, ihr Abo selbst zu
// verwalten oder zu kündigen.
function BillingPortalButton() {
  const { getToken } = useAuth();
  const { plan } = useUserPlan();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  if (!isPro(plan)) return null;

  async function openPortal() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ return_url: `${window.location.origin}/account` }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) throw new Error(json?.error || "Portal-Fehler");
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message || "Konnte Kundenportal nicht öffnen.");
      setBusy(false);
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={openPortal}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
        Rechnungen & Abo verwalten
      </button>
      {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
    </div>
  );
}

export default function Account() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <SignedIn>
        <BillingPortalButton />
        <UserProfile
          appearance={{ variables: { colorPrimary: "#0F2C8A" } }}
          // Tabs Password, Email, MFA, Sessions etc. sind enthalten
        />
      </SignedIn>

      <SignedOut>
        <p className="text-sm text-gray-600">
          Bitte zuerst <a className="underline" href="/login">anmelden</a>.
        </p>
      </SignedOut>
    </div>
  );
}
