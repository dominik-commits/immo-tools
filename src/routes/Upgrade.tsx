// src/routes/Upgrade.tsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Lock, ArrowRight, ArrowLeft, Zap } from "lucide-react";

const PLAN_CONFIG = {
  basis: {
    label: "BASIS",
    price: "99 €",
    monthly: "8,25 €/Monat",
    plan: "basis",
    features: [
      "ETW-, MFH- & Gewerbe-Analyzer",
      "Mietkalkulation & AfA-Rechner",
      "Bankgespräch-Report (PDF)",
      "Export (PDF / CSV / JSON)",
      "Regelmäßige Updates",
    ],
  },
  pro: {
    label: "PRO",
    price: "199 €",
    monthly: "16,58 €/Monat",
    plan: "pro",
    features: [
      "Alles aus BASIS",
      "Deal-Vergleich & Portfolio-Exports",
      "Break-even & 10-J-Projektion erweitert",
      "Finanzierungs-Analyse (vollständig)",
      "Chrome-Extension: Exposé-Import",
      "Priorisierter Support",
    ],
  },
};

export default function Upgrade() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const fromModule = params.get("from");
  const required = (params.get("required") === "basis" ? "basis" : "pro") as "basis" | "pro";
  const cfg = PLAN_CONFIG[required];

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/assets/propora-logo.png" alt="PROPORA" style={{ height: 28, width: "auto" }} />
        <button
          onClick={() => navigate("/")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}
        >
          <ArrowLeft size={15} /> Zurück zum Dashboard
        </button>
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Badge */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 16px", borderRadius: 100,
            background: "rgba(252,220,69,0.1)", border: "1px solid rgba(252,220,69,0.25)",
          }}>
            <Lock size={13} color="#FCDC45" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#FCDC45" }}>
              Zugang gesperrt
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px", lineHeight: 1.25 }}>
          {fromModule ? (
            <>{fromModule} ist Teil von <span style={{ color: "#FCDC45" }}>{cfg.label}</span></>
          ) : (
            <>Upgrade auf <span style={{ color: "#FCDC45" }}>{cfg.label}</span></>
          )}
        </h1>
        <p style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 36px" }}>
          Schalte {required === "basis" ? "diesen Analyzer" : "alle Analyzer und Tools"} frei
        </p>

        {/* Plan Card */}
        <div style={{
          borderRadius: 20, position: "relative", overflow: "hidden",
          background: required === "pro" ? "rgba(245,200,66,0.04)" : "rgba(22,27,34,0.8)",
          border: required === "pro" ? "1.5px solid rgba(245,200,66,0.35)" : "1px solid rgba(255,255,255,0.07)",
        }}>
          {required === "pro" && (
            <div style={{ height: 3, background: "linear-gradient(90deg, transparent, #FCDC45, transparent)" }} />
          )}
          <div style={{ padding: "28px 28px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
              {cfg.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 38, fontWeight: 800 }}>{cfg.price}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>/ Jahr</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 22 }}>
              entspricht {cfg.monthly}
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 11 }}>
              {cfg.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    background: required === "pro" ? "#F5C842" : "rgba(245,200,66,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check style={{ width: 11, height: 11, color: required === "pro" ? "#111" : "#F5C842" }} />
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              to={`/checkout?plan=${cfg.plan}&interval=yearly`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 14.5, fontWeight: 700,
                textDecoration: "none",
                background: required === "pro" ? "#FCDC45" : "rgba(255,255,255,0.08)",
                color: required === "pro" ? "#0d1117" : "#e6edf3",
                border: required === "pro" ? "none" : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {cfg.label} holen <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <Link
          to="/preise"
          style={{ display: "block", textAlign: "center", fontSize: 12.5, color: "rgba(255,255,255,0.35)", marginTop: 22, textDecoration: "none" }}
        >
          Alle Pläne im Vergleich ansehen →
        </Link>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 36, fontSize: 11.5, color: "rgba(255,255,255,0.25)" }}>
          <Zap size={12} /> Stripe-Checkout · Sichere Zahlung · Jederzeit kündbar
        </div>
      </main>
    </div>
  );
}
