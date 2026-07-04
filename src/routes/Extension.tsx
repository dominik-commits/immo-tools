// src/routes/Extension.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserPlan } from "../hooks/useUserPlan";
import {
  ArrowLeft, Chrome, CheckCircle2, ArrowRight, Lock,
  Zap, Clock, MousePointerClick,
} from "lucide-react";

const EXTENSION_STORE_URL = "https://chromewebstore.google.com/detail/mnpknchagbboopmiogcffegdgmhjmfdk";

const PLATFORMS = [
  "ImmobilienScout24", "Immowelt", "Immonet", "Kleinanzeigen",
  "Wohnungsbörse", "Homes24", "Immobilo", "Neubau-Kompass",
];

const FIELDS_DEMO = [
  { label: "Kaufpreis", value: "389.000 €" },
  { label: "Wohnfläche", value: "78 m²" },
  { label: "Zimmer", value: "3" },
  { label: "Baujahr", value: "1998" },
  { label: "Adresse", value: "Sendling, München" },
  { label: "PLZ", value: "81369" },
];

function TypingDemo() {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFilled((f) => (f >= FIELDS_DEMO.length ? 0 : f + 1));
    }, 550);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      borderRadius: 16, padding: 22, background: "rgba(13,17,23,0.6)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: filled >= FIELDS_DEMO.length ? "#34d399" : "#FCDC45", transition: "background 0.3s" }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
          {filled >= FIELDS_DEMO.length ? "Übernommen ✓" : "PROPORA liest Exposé..."}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FIELDS_DEMO.map((f, i) => (
          <div key={i} style={{
            padding: "9px 12px", borderRadius: 9,
            background: i < filled ? "rgba(252,220,69,0.08)" : "rgba(255,255,255,0.02)",
            border: i < filled ? "1px solid rgba(252,220,69,0.25)" : "1px solid rgba(255,255,255,0.05)",
            transition: "all 0.3s ease",
          }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: i < filled ? "#FCDC45" : "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>
              {i < filled ? f.value : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExtensionPage() {
  const navigate = useNavigate();
  const { plan } = useUserPlan();
  const hasAccess = plan === "basis" || plan === "pro";

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", overflow: "hidden" }}>
      {/* Glow background */}
      <div style={{
        position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 600, background: "radial-gradient(ellipse, rgba(252,220,69,0.08) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/assets/propora-logo.png" alt="PROPORA" style={{ height: 28, width: "auto" }} />
        <button
          onClick={() => navigate("/")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.85)", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}
        >
          <ArrowLeft size={15} /> Zurück zum Dashboard
        </button>
      </div>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "20px 24px 90px" }}>

        {/* Split Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center", marginBottom: 64 }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 100,
              background: "rgba(252,220,69,0.1)", border: "1px solid rgba(252,220,69,0.25)", marginBottom: 22,
            }}>
              <Zap size={12} color="#FCDC45" />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#FCDC45" }}>
                Spar dir 5 Minuten pro Exposé
              </span>
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.12, letterSpacing: "-0.01em" }}>
              Nie wieder<br />
              Zahlen abschreiben.
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 28, maxWidth: 420 }}>
              Ein Klick auf einem Exposé – PROPORA übernimmt Kaufpreis, Fläche, Zimmer und Adresse automatisch. Du startest direkt mit der Analyse, statt mit dem Abtippen.
            </p>
            <a
              href={EXTENSION_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 30px", borderRadius: 13,
                fontSize: 15, fontWeight: 700, textDecoration: "none", background: "#FCDC45", color: "#0d1117",
                boxShadow: "0 8px 24px rgba(252,220,69,0.25)",
              }}
            >
              <Chrome size={18} /> Jetzt installieren <ArrowRight size={16} />
            </a>
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              Kostenlos · 1 Klick · Kein Konto nötig
            </div>
          </div>

          <TypingDemo />
        </div>

        {/* Vorher/Nachher Vergleich */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 64 }}>
          <div style={{
            borderRadius: 16, padding: 24, background: "rgba(22,27,34,0.6)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Clock size={16} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Ohne Extension
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>~5 Min.</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              Exposé lesen, Zahlen raussuchen, Tab wechseln, alles eintippen, Tippfehler korrigieren.
            </div>
          </div>
          <div style={{
            borderRadius: 16, padding: 24, background: "rgba(252,220,69,0.05)", border: "1.5px solid rgba(252,220,69,0.3)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ height: 2.5, background: "linear-gradient(90deg, transparent, #FCDC45, transparent)", position: "absolute", top: 0, left: 0, right: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Zap size={16} color="#FCDC45" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FCDC45", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Mit Extension
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#FCDC45", marginBottom: 6 }}>~5 Sek.</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              Klick auf das PROPORA-Symbol – Analyse öffnet sich, Felder sind schon gefüllt.
            </div>
          </div>
        </div>

        {/* 3 Schritte, horizontal mit Verbindungslinie */}
        <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginBottom: 24, textAlign: "center" }}>
          So einfach geht's
        </h3>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, marginBottom: 64, flexWrap: "wrap" }}>
          {[
            { n: "1", title: "Erweiterung holen", text: "Einmalig im Chrome Web Store installieren." },
            { n: "2", title: "Exposé öffnen", text: "Auf einer unterstützten Plattform ein Inserat ansehen." },
            { n: "3", title: "Symbol klicken", text: "PROPORA öffnet sich mit allen Daten – fertig." },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <div style={{ width: 220, textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px",
                  background: "linear-gradient(135deg, #FCDC45, #e8ca2e)", color: "#0d1117",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800,
                }}>
                  {s.n}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{s.text}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 60, height: 2, background: "linear-gradient(90deg, rgba(252,220,69,0.4), rgba(252,220,69,0.1))", marginTop: 25, flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Plan-Hinweis */}
        {!hasAccess && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
            marginBottom: 56, padding: "20px 26px", borderRadius: 16,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Lock size={17} color="rgba(255,255,255,0.4)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>Automatischer Import ist Teil von BASIS</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}>Erweiterung jetzt schon installierbar – Daten werden automatisch übernommen, sobald du upgradest.</div>
              </div>
            </div>
            <Link to="/upgrade?required=basis&from=Exposé-Import" style={{
              flexShrink: 0, padding: "10px 20px", borderRadius: 10, background: "#FCDC45", color: "#0d1117",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>
              Jetzt upgraden
            </Link>
          </div>
        )}

        {/* Plattformen als Chips */}
        <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginBottom: 18, textAlign: "center" }}>
          Funktioniert mit
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, marginBottom: 56 }}>
          {PLATFORMS.map((p, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 100,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
            }}>
              <CheckCircle2 size={13} color="#FCDC45" />
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{p}</span>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{
          borderRadius: 20, padding: "36px 32px", textAlign: "center",
          background: "linear-gradient(135deg, rgba(15,44,138,0.25) 0%, rgba(252,220,69,0.06) 100%)",
          border: "1px solid rgba(252,220,69,0.2)",
        }}>
          <MousePointerClick size={28} color="#FCDC45" style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Bereit, Zeit zu sparen?</h2>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", margin: "0 0 22px" }}>
            30 Sekunden Installation. Jedes Exposé danach in Sekunden statt Minuten.
          </p>
          <a
            href={EXTENSION_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12,
              fontSize: 14, fontWeight: 700, textDecoration: "none", background: "#FCDC45", color: "#0d1117",
            }}
          >
            <Chrome size={17} /> Zum Chrome Web Store
          </a>
        </div>
      </main>
    </div>
  );
}
