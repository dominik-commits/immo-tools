// src/routes/Pricing.tsx
import React, { useState } from "react";
import { Check, ArrowRight, Shield, Sparkles, Zap } from "lucide-react";

type PlanKey = "basic" | "pro";

const FEATURES = {
  basic: [
    "ETW-, MFH- & Gewerbe-Quick-Checks",
    "Mietkalkulation, AfA-Rechner",
    "Export (PDF/CSV)",
    "Regelmäßige Updates",
  ],
  pro: [
    "Alles aus Basic",
    "Deal-Vergleich & Portfolio-Exports",
    "Break-even & 10J-Projektion erweitert",
    "Chrome-Extension: ExposÃ©-Import (Scout/Immonet/Immowelt/eBay)",
    "Priorisierter Support",
  ],
};

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: PlanKey) {
    try {
      setError(null);
      setLoadingPlan(plan);

      // Erfolg/Abbruch-URLs dynamisch auf deine Domain
      const origin = window.location.origin;
      const successUrl = `${origin}/?checkout=success`;
      const cancelUrl = `${origin}/pricing?checkout=cancel`;

      // WICHTIG:
      // - Die Zuordnung priceId macht dein Server (api/create-checkout-session.js)
      //   anhand des 'plan'-Strings ODER du sendest hier direkt priceId mit.
      //   Im aktuellen Setup schicken wir 'plan', damit keine geheimen IDs ins Frontend müssen.
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Wähle hier das Produkt im Backend per plan: 'basic' | 'pro'
        body: JSON.stringify({ plan, successUrl, cancelUrl }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Checkout fehlgeschlagen (${res.status}) ${txt}`);
      }

      const data = (await res.json()) as { url?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (!data.url) throw new Error("Keine Checkout-URL erhalten.");

      // Weiter zu Stripe
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message ?? "Unbekannter Fehler beim Start des Checkouts.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border bg-white shadow-sm mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Neuer Release – jährliche Abrechnung</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Einfach starten – <span className="text-gray-600">fokussiert investieren</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Zwei klare Pläne. Keine versteckten Kosten. Kündigung jederzeit zum Laufzeitende.
        </p>
      </div>

      {/* Fehlerhinweis */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PlanCard
          title="Basic"
          price="99"
          period="Jahr"
          badge="Für Einsteiger"
          features={FEATURES.basic}
          cta="Jetzt starten"
          loading={loadingPlan === "basic"}
          onClick={() => startCheckout("basic")}
        />

        <PlanCard
          title="Pro"
          price="199"
          period="Jahr"
          badge="Meistgewählt"
          highlight
          features={FEATURES.pro}
          cta="Pro holen"
          loading={loadingPlan === "pro"}
          iconRight={<Zap className="h-4 w-4" />}
          onClick={() => startCheckout("pro")}
        />
      </div>

      {/* Kleingedrucktes */}
      <div className="mt-8 text-xs text-gray-500 flex items-center gap-2 justify-center">
        <Shield className="h-3.5 w-3.5" />
        <span>Stripe-Checkout ”¢ Sichere Zahlung ”¢ Rechnung per E-Mail</span>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  period,
  badge,
  highlight,
  features,
  cta,
  loading,
  onClick,
  iconRight,
}: {
  title: string;
  price: string;
  period: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  cta: string;
  loading?: boolean;
  onClick: () => void;
  iconRight?: React.ReactNode;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-white p-5 shadow-sm flex flex-col" +
        (highlight ? " ring-2 ring-indigo-200 border-indigo-300" : "")
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">{price} €</span>
            <span className="text-gray-500">/ {period}</span>
          </div>
        </div>
        {badge && (
          <span
            className={
              "px-2 py-1 rounded-full text-xs border " +
              (highlight
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-gray-50 text-gray-700 border-gray-200")
            }
          >
            {badge}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-gray-700">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={loading}
        className={
          "mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm " +
          (highlight
            ? "bg-black text-white border-black hover:bg-gray-900"
            : "bg-white border-gray-300 hover:bg-gray-50")
        }
      >
        {cta}
        {iconRight ?? <ArrowRight className="h-4 w-4" />}
        {loading && (
          <span className="ml-1 animate-pulse text-xs opacity-80">”¦</span>
        )}
      </button>
    </div>
  );
}
