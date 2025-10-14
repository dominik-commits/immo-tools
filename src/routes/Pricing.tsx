// src/routes/Pricing.tsx
import * as React from "react";
import { useMemo, useState, useEffect } from "react";

type PlanKey = "basic" | "pro";

type Plan = {
  key: PlanKey;
  name: string;
  priceLabel: string;      // z.B. "99 € / Jahr"
  priceSubLabel?: string;  // z.B. "entspricht 8,25 € / Monat"
  cta: string;             // Button-Text
  highlight?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    key: "basic",
    name: "Basic",
    priceLabel: "99 € / Jahr",
    priceSubLabel: "entspricht 8,25 € / Monat",
    cta: "Basic wählen",
    features: [
      "Immo Quick-Checks (ETW, MFH, Gewerbe)",
      "AfA-Rechner & Finanzierung (simpel)",
      "Mietkalkulation (Basis)",
      "Vergleich von Objekten",
      "Export (CSV / PDF, Basis)",
      "E-Mail-Support (48h)"
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceLabel: "199 € / Jahr",
    priceSubLabel: "entspricht 16,60 € / Monat",
    cta: "Pro wählen",
    highlight: true,
    features: [
      "Alles aus Basic",
      "Erweiterte Szenarien & Sensitivitäten",
      "Erweiterte Exporte (PDF mit Branding)",
      "Priorisierter Support (24h)",
      "🔌 Chrome-Extension: Exposés direkt importieren (Scout24, Immowelt, eBay Kleinanzeigen, …)"
    ],
  },
];

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Hinweise aus Query-Params (z. B. ?canceled=1)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("canceled")) {
      setNotice("Zahlungsvorgang abgebrochen. Du kannst es jederzeit erneut versuchen.");
    }
  }, []);

  // Für SSR/SPA-Stabilität: Basis-URL zur API (Vercel/Static → relativ ist ok)
  const apiPath = useMemo(() => "/api/create-checkout-session", []);

  const handleCheckout = async (plan: PlanKey) => {
    setError(null);
    setLoadingPlan(plan);

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || `Unerwarteter Fehler (${res.status}). Bitte später erneut versuchen.`
        );
      }

      if (data?.url) {
        // Weiterleitung zu Stripe Checkout
        window.location.href = data.url as string;
        return;
      }

      throw new Error("Antwort ohne Weiterleitungs-URL. Bitte Support kontaktieren.");
    } catch (e: any) {
      console.error("[checkout] error", e);
      setError(e?.message ?? "Fehler beim Starten des Checkouts.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Kopfbereich */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Preise & Pläne
        </h1>
        <p className="text-gray-600 mt-2">
          Wähle den Plan, der zu dir passt. Jahreszahlung – jederzeit im Kundenportal verwaltbar.
        </p>
      </div>

      {/* Notices / Fehler */}
      {notice && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((p) => (
          <article
            key={p.key}
            className={[
              "relative rounded-2xl border bg-white p-6 shadow-sm",
              p.highlight ? "border-black ring-1 ring-black/5" : "border-gray-200",
            ].join(" ")}
          >
            {p.highlight && (
              <div className="absolute -top-3 right-4 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                Empfohlen
              </div>
            )}
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <div className="mt-2">
              <div className="text-2xl font-bold">{p.priceLabel}</div>
              {p.priceSubLabel && (
                <div className="text-sm text-gray-500">{p.priceSubLabel}</div>
              )}
            </div>

            <ul className="mt-5 space-y-2 text-sm">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-900"></span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(p.key)}
              disabled={loadingPlan !== null}
              className={[
                "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition",
                p.highlight
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-900 text-white hover:bg-gray-800",
                loadingPlan === p.key ? "opacity-60 cursor-wait" : "",
              ].join(" ")}
            >
              {loadingPlan === p.key ? "Weiterleitung …" : p.cta}
            </button>

            <p className="mt-3 text-xs text-gray-500">
              Jahresabo, inkl. MwSt. (falls zutreffend). Kündbar zum Laufzeitende. Verwaltung im
              Kundenportal.
            </p>
          </article>
        ))}
      </div>

      {/* FAQ/Footnote */}
      <div className="mt-10 text-xs text-gray-500">
        <p>
          Hinweise: Steuerberechnung erfolgt automatisch durch Stripe. Rabatte können (falls aktiv)
          im Checkout als Gutscheincode hinzugefügt werden.
        </p>
      </div>
    </div>
  );
}
