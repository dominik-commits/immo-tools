// src/routes/Pricing.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Pricing() {
  const navigate = useNavigate();

  const goCheckout = (plan: "basic" | "pro") => {
    navigate(`/checkout?plan=${plan}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Preise</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BASIC */}
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Basic</h2>
          <p className="text-gray-600 mt-1">
            Für Einsteiger: ETW-, MFH- & Gewerbe-Quick-Checks, Vergleich, AfA, Finanzierung simple.
          </p>
          <div className="mt-4">
            <div className="text-3xl font-bold">89 €</div>
            <div className="text-xs text-gray-500">pro Jahr (zzgl. USt)</div>
          </div>
          <ul className="mt-4 text-sm space-y-1 text-gray-700 list-disc list-inside">
            <li>Alle Kern-Tools</li>
            <li>CSV/PDF-Export</li>
            <li>E-Mail-Support</li>
          </ul>
          <button
            onClick={() => goCheckout("basic")}
            className="mt-6 w-full rounded-lg bg-black text-white py-2.5 hover:bg-gray-900"
          >
            Basic starten
          </button>
        </div>

        {/* PRO */}
        <div className="rounded-2xl border bg-white p-6 ring-1 ring-black/5">
          <div className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs">
            Beliebt
          </div>
          <h2 className="text-lg font-semibold mt-2">Pro</h2>
          <p className="text-gray-600 mt-1">
            Alles aus Basic + **Chrome-Extension** zum Import von Exposés (Scout, Immowelt, eBay …).
          </p>
          <div className="mt-4">
            <div className="text-3xl font-bold">149 €</div>
            <div className="text-xs text-gray-500">pro Jahr (zzgl. USt)</div>
          </div>
          <ul className="mt-4 text-sm space-y-1 text-gray-700 list-disc list-inside">
            <li>Alles aus Basic</li>
            <li>Chrome-Extension für Listing-Import</li>
            <li>Priorisierter Support</li>
          </ul>
          <button
            onClick={() => goCheckout("pro")}
            className="mt-6 w-full rounded-lg bg-black text-white py-2.5 hover:bg-gray-900"
          >
            Pro starten
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6">
        Kündigung jederzeit zum Laufzeitende. Abrechnung via Stripe. Preise zzgl. USt.
      </p>
    </div>
  );
}
