// src/routes/Pricing.tsx
import React from "react";
import { Check, Zap, ArrowRight, Lock, ArrowLeft } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

type Interval = "yearly" | "monthly";
type PlanKind = "basis" | "pro";

/* ── Feature-Zeile ─────────────────────────────────────────────── */
function Feature({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0" }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        background: highlight ? "#F5C842" : "rgba(245,200,66,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Check style={{ width: 11, height: 11, color: highlight ? "#111" : "#F5C842" }} />
      </div>
      <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{children}</span>
    </li>
  );
}

/* ── Plan-Karte ─────────────────────────────────────────────────── */
function PlanCard({
  label, price, priceNote, period, badge, features, ctaLabel, onClick, highlight,
}: {
  label: string; price: string; priceNote?: string; period: string;
  badge?: React.ReactNode; features: React.ReactNode;
  ctaLabel: string; onClick?: () => void; highlight?: boolean;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", borderRadius: 20,
      background: highlight ? "rgba(245,200,66,0.04)" : "rgba(22,27,34,0.8)",
      border: highlight ? "1.5px solid rgba(245,200,66,0.35)" : "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden", position: "relative",
    }}>
      {highlight && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, #F5C842, #D4A800)",
        }} />
      )}
      <div style={{ padding: "28px 28px 20px" }}>
        {/* Label + Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
          {badge}
        </div>
        {/* Preis */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: highlight ? "#F5C842" : "#e6edf3", letterSpacing: "-1px" }}>{price}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>/ {period}</span>
          </div>
          {priceNote && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{priceNote}</div>}
        </div>
        {/* Features */}
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>{features}</ul>
      </div>
      {/* CTA */}
      <div style={{ padding: "0 28px 28px", marginTop: "auto" }}>
        <button
          onClick={onClick}
          style={{
            width: "100%", padding: "13px 20px", borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, transition: "all 0.15s",
            background: highlight ? "#F5C842" : "rgba(255,255,255,0.06)",
            border: highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
            color: highlight ? "#111" : "rgba(255,255,255,0.8)",
          }}
        >
          {ctaLabel} <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

/* ── Vergleichstabelle ──────────────────────────────────────────── */
function CompareRow({ feature, basis, pro }: { feature: string; basis: React.ReactNode; pro: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <td style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{feature}</td>
      <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{basis}</td>
      <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, color: "#F5C842", fontWeight: 500 }}>{pro}</td>
    </tr>
  );
}

function Tick({ on = true }: { on?: boolean }) {
  return on
    ? <Check style={{ width: 16, height: 16, color: "#F5C842", margin: "0 auto" }} />
    : <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 18 }}>–</span>;
}

/* ── Hauptseite ─────────────────────────────────────────────────── */
export default function Pricing() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [interval, setInterval] = React.useState<Interval>("yearly");

  const startCheckout = React.useCallback((plan: PlanKind) => {
    if (!isSignedIn || !user) {
      const nextParams = new URLSearchParams({ plan, interval });
      navigate(`/register?next=${encodeURIComponent(`/preise?${nextParams.toString()}`)}`);
      return;
    }
    const params = new URLSearchParams({
      plan, interval,
      userId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
    });
    window.location.href = `/api/stripe/create-checkout-session?${params.toString()}`;
  }, [isSignedIn, user, navigate, interval]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/assets/propora-logo.png" alt="PROPORA" style={{ height: 28, width: "auto" }} />
        <button onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.85)", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}>
          <ArrowLeft size={15} /> Zurück zum Dashboard
        </button>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
            borderRadius: 20, background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.2)",
            fontSize: 12, fontWeight: 600, color: "#F5C842", marginBottom: 20, letterSpacing: "0.06em",
          }}>
            <Zap style={{ width: 13, height: 13 }} /> JETZT STARTEN
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: "#e6edf3", margin: "0 0 12px", lineHeight: 1.15 }}>
            Einfach starten –{" "}
            <span style={{ color: "#F5C842" }}>fokussiert investieren</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", maxWidth: 480, margin: "0 auto" }}>
            Zwei klare Pläne. Keine versteckten Kosten. Kündigung jederzeit zum Laufzeitende.
          </p>

          {/* Intervall-Toggle */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 24,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 4,
          }}>
            {(["yearly", "monthly"] as Interval[]).map((iv) => (
              <button key={iv} onClick={() => setInterval(iv)} style={{
                padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                cursor: "pointer", border: "none", transition: "all 0.15s",
                background: interval === iv ? "#F5C842" : "transparent",
                color: interval === iv ? "#111" : "rgba(255,255,255,0.5)",
              }}>
                {iv === "yearly" ? "Jährlich" : "Monatlich"}
                {iv === "yearly" && (
                  <span style={{
                    marginLeft: 6, fontSize: 12, padding: "2px 6px", borderRadius: 6,
                    background: interval === iv ? "rgba(0,0,0,0.15)" : "rgba(245,200,66,0.15)",
                    color: interval === iv ? "#111" : "#F5C842",
                  }}>–17%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Karten */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 56 }}>
          <PlanCard
            label="BASIS"
            price={interval === "yearly" ? "99 €" : "10 €"}
            priceNote={interval === "yearly" ? "entspricht 8,25 €/Monat" : undefined}
            period={interval === "yearly" ? "Jahr" : "Monat"}
            ctaLabel="Jetzt starten"
            onClick={() => startCheckout("basis")}
            features={<>
              <Feature>ETW-, MFH- & Gewerbe-Analyzer</Feature>
              <Feature>Mietkalkulation & AfA-Rechner</Feature>
              <Feature>Bankgespräch-Report (PDF)</Feature>
              <Feature>Export (PDF / CSV / JSON)</Feature>
              <Feature>Regelmäßige Updates</Feature>
            </>}
          />
          <PlanCard
            label="PRO"
            price={interval === "yearly" ? "199 €" : "20 €"}
            priceNote={interval === "yearly" ? "entspricht 16,58 €/Monat" : undefined}
            period={interval === "yearly" ? "Jahr" : "Monat"}
            highlight
            badge={
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                borderRadius: 20, background: "rgba(245,200,66,0.15)", border: "1px solid rgba(245,200,66,0.3)",
                fontSize: 13, fontWeight: 600, color: "#F5C842",
              }}>
                <Zap style={{ width: 12, height: 12 }} /> Meistgewählt
              </span>
            }
            ctaLabel="Pro holen"
            onClick={() => startCheckout("pro")}
            features={<>
              <Feature highlight>Alles aus BASIS</Feature>
              <Feature>Deal-Vergleich & Portfolio-Exports</Feature>
              <Feature>Break-even & 10-J-Projektion erweitert</Feature>
              <Feature>Finanzierungs-Analyse (vollständig)</Feature>
              <Feature>Chrome-Extension: Exposé-Import</Feature>
              <Feature>Priorisierter Support</Feature>
            </>}
          />
        </div>

        {/* Vergleichstabelle */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", marginBottom: 16, textAlign: "center" }}>
            Alle Features im Vergleich
          </h2>
          <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Feature</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em" }}>BASIS</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#F5C842", textTransform: "uppercase", letterSpacing: "0.08em" }}>PRO</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow feature="Wohnungs-Rendite Analyzer" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Mietshaus-Analyse (MFH)" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Gewerbe-Rendite" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Finanzierungsrechner" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Miet-Kalkulator" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="AfA-Rechner" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Bankgespräch-Report (PDF)" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Export (PDF / CSV / JSON)" basis={<Tick />} pro={<Tick />} />
                <CompareRow feature="Einfamilienhaus-Rendite" basis={<Tick on={false} />} pro={<Tick />} />
                <CompareRow feature="Gemischte Immobilie" basis={<Tick on={false} />} pro={<Tick />} />
                <CompareRow feature="Objekt-Vergleich (2–5 Objekte)" basis={<Tick on={false} />} pro={<Tick />} />
                <CompareRow feature="Abschreibungs-Planer" basis={<Tick on={false} />} pro={<Tick />} />
                <CompareRow feature="Finanzierungs-Analyse (vollständig)" basis={<Tick on={false} />} pro={<Tick />} />
                <CompareRow feature="Chrome-Extension: Exposé-Import" basis={<Tick on={false} />} pro={<Tick />} />
                <CompareRow feature="Priorisierter Support" basis={<Tick on={false} />} pro={<Tick />} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer-Hinweis */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            <Lock style={{ width: 13, height: 13 }} />
            Stripe-Checkout · Sichere Zahlung · Rechnung per E-Mail · Kündigung jederzeit
          </div>
        </div>
      </main>
    </div>
  );
}