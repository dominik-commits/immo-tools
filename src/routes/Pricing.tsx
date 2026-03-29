// src/routes/Pricing.tsx
import React from "react";
import { Check, Zap, ArrowRight } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

/* ----------------------------- Typen ----------------------------- */

type Interval = "yearly" | "monthly";
type PlanKind = "basis" | "pro";

/* ----------------------------- Hilfs-Komponenten ----------------------------- */

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

type PlanCardProps = {
  label: string;
  price: string;
  period: string;
  badge?: React.ReactNode;
  features: React.ReactNode;
  ctaLabel: string;
  onClick?: () => void;
  highlight?: boolean;
};

function PlanCard({
  label,
  price,
  period,
  badge,
  features,
  ctaLabel,
  onClick,
  highlight,
}: PlanCardProps) {
  return (
    <div
      className={
        "flex h-full flex-col rounded-2xl border shadow-sm " +
        (highlight ? "border-indigo-200 ring-1 ring-indigo-100" : "border-gray-200")
      }
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          {badge}
        </div>

        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold tracking-tight text-gray-900">
              {price}
            </div>
            <div className="text-sm text-gray-500">/ {period}</div>
          </div>
        </div>

        <ul className="mt-2 space-y-2">{features}</ul>
        <div className="flex-1" />
      </div>

      <div className="border-t border-gray-100 p-5">
        <button
          onClick={onClick}
          className={
            "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold " +
            (highlight
              ? "bg-gray-900 text-white hover:brightness-110"
              : "bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50")
          }
        >
          {ctaLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Seite ----------------------------- */

export default function Pricing() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [interval, setInterval] = React.useState<Interval>("yearly");

  // zentrale Checkout-Funktion → ruft direkt die Vercel-Function auf
  const startCheckout = React.useCallback(
    (plan: PlanKind) => {
      // Wenn nicht eingeloggt: zuerst Registrierung/Login,
      // danach zurück auf die Preisseite mit den ursprünglichen Parametern
      if (!isSignedIn || !user) {
        const nextParams = new URLSearchParams({
          plan,
          interval,
        });
        const nextUrl = `/preise?${nextParams.toString()}`;
        navigate(`/register?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      // Eingeloggt → Stripe-Checkout-Session erzeugen
      const params = new URLSearchParams({
        plan,
        interval,
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
      });

      // Browser wird zur API-Route umgeleitet; diese macht dann Redirect zu Stripe
      window.location.href = `/api/stripe/create-checkout-session?${params.toString()}`;
    },
    [isSignedIn, user, navigate, interval]
  );

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* kleines Logo oben links */}
      <div className="absolute left-6 top-6">
        <img src="/assets/propora-logo.png" alt="PROPORA" className="h-6 w-auto" />
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Einfach starten –{" "}
            <span className="text-[#0F2C8A]">fokussiert investieren</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Zwei klare Pläne. Keine versteckten Kosten. Kündigung jederzeit zum
            Laufzeitende.
          </p>

          {/* Intervall-Umschalter */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1 text-sm">
            <button
              className={
                "rounded-lg px-3 py-1.5 " +
                (interval === "yearly" ? "bg-gray-900 text-white" : "text-gray-700")
              }
              onClick={() => setInterval("yearly")}
            >
              Jährlich
            </button>
            <button
              className={
                "rounded-lg px-3 py-1.5 " +
                (interval === "monthly" ? "bg-gray-900 text-white" : "text-gray-700")
              }
              onClick={() => setInterval("monthly")}
            >
              Monatlich
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* BASIC */}
          <PlanCard
            label="Basic"
            price={interval === "yearly" ? "99 €" : "10 €"}
            period={interval === "yearly" ? "Jahr" : "Monat"}
            ctaLabel="Jetzt starten"
            onClick={() => startCheckout("basis")}
            features={
              <>
                <Feature>ETW-, MFH- &amp; Gewerbe-Quick-Checks</Feature>
                <Feature>Mietkalkulation, AfA-Rechner</Feature>
                <Feature>Export (PDF/CSV)</Feature>
                <Feature>Regelmäßige Updates</Feature>
              </>
            }
          />

          {/* PRO */}
          <PlanCard
            label="Pro"
            price={interval === "yearly" ? "199 €" : "20 €"}
            period={interval === "yearly" ? "Jahr" : "Monat"}
            highlight
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                <Zap className="h-3.5 w-3.5" /> Meistgewählt
              </span>
            }
            ctaLabel="Pro holen"
            onClick={() => startCheckout("pro")}
            features={
              <>
                <Feature>Alles aus Basic</Feature>
                <Feature>Deal-Vergleich &amp; Portfolio-Exports</Feature>
                <Feature>Break-even &amp; 10-J-Projektion erweitert</Feature>
                <Feature>Chrome-Extension: Exposés-Import</Feature>
                <Feature>Priorisierter Support</Feature>
              </>
            }
          />
        </div>

        <div className="mx-auto mt-6 max-w-3xl text-center">
          <p className="text-xs text-gray-500">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />
              Stripe-Checkout • Sichere Zahlung • Rechnung per E-Mail
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
