// src/routes/Upgrade.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Lock, ArrowRight } from "lucide-react";

const PLAN_CONFIG = {
  basis: {
    label: "BASIS",
    price: "99 €",
    monthly: "8,25 € / Monat",
    plan: "basis",
    features: [
      "Wohnungs-Rendite (ETW)",
      "Mietshaus-Analyse (MFH)",
      "Finanzierungsrechner",
      "Bankgespräch-Report (PDF)",
      "Export (PDF / CSV / JSON)",
    ],
  },
  pro: {
    label: "PRO",
    price: "199 €",
    monthly: "16,58 € / Monat",
    plan: "pro",
    features: [
      "Einfamilienhaus-Check",
      "Gewerbe- & Mixed-Use-Check",
      "Objekt-Vergleich & Portfolio",
      "AfA-Rechner & Finanzierung Pro",
      "Chrome-Extension: Exposé-Import",
      "Priorisierter Support",
    ],
  },
};

export default function Upgrade() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const fromModule = params.get("from");
  const required = (params.get("required") === "basis" ? "basis" : "pro") as "basis" | "pro";
  const cfg = PLAN_CONFIG[required];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{
        background: "radial-gradient(ellipse at 50% -10%, #1e4080 0%, #0F1E3D 50%, #060d1a 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="https://www.propora.de">
            <img src="/assets/propora-logo.png" alt="PROPORA" className="h-9 w-auto" />
          </a>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            boxShadow:
              "0 0 0 1px rgba(252,220,69,0.2), 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(252,220,69,0.05)",
          }}
        >
          <div
            className="px-7 py-7 text-center"
            style={{ background: "linear-gradient(135deg, #0F2C8A 0%, #15348f 100%)" }}
          >
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(252,220,69,0.15)", border: "1px solid rgba(252,220,69,0.3)" }}
            >
              <Lock className="w-5 h-5 text-[#FCDC45]" />
            </div>
            <h1 className="text-white text-xl font-bold mb-1">
              {fromModule ? `${fromModule} ist Teil von ${cfg.label}` : `Upgrade auf ${cfg.label}`}
            </h1>
            <p className="text-blue-200 text-sm">
              Schalte {required === "basis" ? "diesen Analyzer" : "alle Analyzer und Tools"} frei
            </p>
          </div>

          <div className="bg-white px-7 py-7">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-bold text-gray-900">{cfg.price}</span>
              <span className="text-sm text-gray-400">/ Jahr</span>
            </div>
            <p className="text-xs text-gray-400 mb-5">≈ {cfg.monthly} · jährlich abgerechnet</p>

            <ul className="space-y-2.5 mb-6">
              {cfg.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-[#0F2C8A] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to={`/checkout?plan=${cfg.plan}&interval=yearly`}
              className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              style={{ background: "#FCDC45", color: "#0F1E3D" }}
            >
              Jetzt auf {cfg.label} upgraden <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/preise"
              className="block text-center text-xs text-gray-400 mt-4 hover:text-gray-600 transition-colors"
            >
              Alle Pläne im Vergleich ansehen
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          SSL-verschlüsselt · Stripe · Jederzeit kündbar
        </p>
      </div>
    </div>
  );
}
