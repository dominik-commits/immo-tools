import { useEffect, useState } from "react";

const POPUP_KEY = "propora_features_v2_seen";
const MAX_SHOWS = 3;

const SLIDES = [
  {
    badge: "NEU",
    proBadge: "BASIS / PRO",
    title: "Standort-Score",
    subtitle: "PLZ eingeben – Marktdaten & Attraktivitätsscore sofort im Analyzer.",
    howTo: "So findest du die Funktion",
    howToDesc: "Direkt in Schritt 1 – neben dem Adressfeld. PLZ eingeben, fertig.",
    mockup: (
      <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(252,220,69,0.15)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, marginBottom: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 28, border: "1px solid rgba(255,255,255,0.08)" }} />
          <div style={{ background: "rgba(252,220,69,0.15)", borderRadius: 6, height: 28, border: "1px solid rgba(252,220,69,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#F5C842", fontWeight: 600 }}>PLZ</span>
          </div>
        </div>
        <div style={{ background: "rgba(252,220,69,0.06)", border: "1px solid rgba(252,220,69,0.2)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#F5C842" }}>📍</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>München · 72/100 · Attraktiv</div>
            <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
              {["5.840 €/m²", "16,40 €/m²", "3,38 %"].map(v => (
                <span key={v} style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 4 }}>{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    features: [
      { title: "Automatische Marktdaten", desc: "Kaufpreis, Miete & Rendite der Region" },
      { title: "Attraktivitätsscore", desc: "0–100 Punktwert für den Standort" },
      { title: "1.228 PLZ verfügbar", desc: "184 deutsche Städte ab 50.000 EW" },
    ],
    planColor: "#F5C842",
    planBg: "rgba(245,200,66,0.15)",
    planBorder: "rgba(245,200,66,0.35)",
    planIcon: "📍",
    planTitle: "Ab BASIS-Plan verfügbar",
    planDesc: "Der Standort-Score ist in ETW-, MFH- und EFH-Analyzer integriert.",
    planLink: "/preise",
  },
  {
    badge: "NEU",
    proBadge: "BASIS / PRO",
    title: "Bankgespräch-Report",
    subtitle: "Erstelle mit einem Klick einen professionellen PDF-Bericht für dein Bankgespräch.",
    howTo: "So findest du die Funktion",
    howToDesc: "Oben rechts in der Navigationsleiste – direkt neben \"Export\".",
    mockup: (
      <div style={{ background: "#1a1d4e", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(120,100,255,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
        {["Einfach", "Erweitert", "Export"].map(label => (
          <span key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 5, padding: "4px 9px", fontSize: 11, color: "rgba(200,195,255,0.6)" }}>{label}</span>
        ))}
        <span style={{ background: "rgba(245,200,66,1)", borderRadius: 5, padding: "4px 9px", fontSize: 11, color: "#12100a", fontWeight: 600, outline: "2px solid #F5C842", outlineOffset: 2 }}>Bankbericht</span>
      </div>
    ),
    features: [
      { title: "Automatischer Bericht", desc: "alle relevanten Kennzahlen auf einen Blick" },
      { title: "PDF-Export", desc: "direkt als druckfertiges Dokument herunterladen" },
      { title: "Bankoptimiert", desc: "strukturiert nach typischen Anforderungen von Kreditinstituten" },
    ],
    planColor: "#a855f7",
    planBg: "rgba(124,58,237,0.2)",
    planBorder: "rgba(168,85,247,0.4)",
    planIcon: "★",
    planTitle: "Ab BASIS-Plan verfügbar",
    planDesc: "Diese Funktion ist Teil des BASIS- und PRO-Plans.",
    planLink: "/preise",
  },
];

export interface NewFeaturePopupProps { isSignedIn?: boolean; }
export function NewFeaturePopup({ isSignedIn: _ }: NewFeaturePopupProps = {}) {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem(POPUP_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count < MAX_SHOWS) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function handleClose() {
    setVisible(false);
    const raw = localStorage.getItem(POPUP_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    localStorage.setItem(POPUP_KEY, String(count + 1));
  }

  function handleDontShow() {
    setVisible(false);
    localStorage.setItem(POPUP_KEY, String(MAX_SHOWS));
  }

  if (!visible) return null;

  const s = SLIDES[slide];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,10,22,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", zIndex: 9999, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#12153a", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(120,100,255,0.35)", boxShadow: "0 0 0 1px rgba(120,100,255,0.1), 0 32px 64px rgba(0,0,0,0.6)", animation: "propora-fadein 0.4s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* HEADER */}
        <div style={{ padding: "26px 26px 18px", background: "linear-gradient(135deg, #1a1d4e 0%, #2d1f6e 100%)", borderBottom: "1px solid rgba(120,100,255,0.25)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(140,100,255,0.12)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,200,60,0.15)", border: "1px solid rgba(255,200,60,0.35)", color: "#ffc83c", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "3px 10px", borderRadius: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ffc83c", display: "inline-block" }} />
              {s.badge}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.planBg, border: `1px solid ${s.planBorder}`, color: s.planColor, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, padding: "4px 10px", borderRadius: 20 }}>
              {s.proBadge}
            </div>
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 6px", lineHeight: 1.2, position: "relative", zIndex: 1 }}>{s.title}</p>
          <p style={{ fontSize: 13, color: "rgba(180,170,255,0.85)", margin: 0, fontWeight: 300, lineHeight: 1.55, position: "relative", zIndex: 1 }}>{s.subtitle}</p>
        </div>

        {/* BODY */}
        <div style={{ padding: "22px 26px 20px" }}>

          {/* Mockup / How-To */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,200,60,0.25)", borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ background: "rgba(255,200,60,0.1)", borderBottom: "1px solid rgba(255,200,60,0.15)", padding: "7px 14px", fontSize: 11, fontWeight: 500, color: "#ffc83c", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
              ⏱ {s.howTo}
            </div>
            <div style={{ padding: "12px 14px" }}>{s.mockup}</div>
            <p style={{ padding: "0 14px 12px", fontSize: 12, color: "rgba(180,175,220,0.7)", margin: 0, lineHeight: 1.5 }}>{s.howToDesc}</p>
          </div>

          {/* Features */}
          <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {s.features.map(f => (
              <li key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "rgba(220,215,255,0.9)", lineHeight: 1.5 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(130,100,255,0.2)", border: "1px solid rgba(130,100,255,0.4)", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#b89fff" }}>✓</div>
                <div><strong style={{ color: "#fff", fontWeight: 500 }}>{f.title}</strong> – <span style={{ color: "rgba(200,195,255,0.7)" }}>{f.desc}</span></div>
              </li>
            ))}
          </ul>

          {/* Plan Banner */}
          <div style={{ background: s.planBg, border: `1px solid ${s.planBorder}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.planBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${s.planBorder}` }}>{s.planIcon}</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: s.planColor, margin: "0 0 3px" }}>{s.planTitle}</p>
              <p style={{ fontSize: 12, color: "rgba(200,180,255,0.65)", margin: 0, lineHeight: 1.45 }}>
                {s.planDesc}{" "}
                <a href={s.planLink} style={{ color: s.planColor, textDecoration: "underline" }}>Jetzt upgraden</a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Slide dots */}
            <div style={{ display: "flex", gap: 5 }}>
              {SLIDES.map((_, i) => (
                <div key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 18 : 6, height: 6, borderRadius: 3, background: i === slide ? "#7c5fff" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s" }} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={handleDontShow} style={{ background: "none", border: "none", fontSize: 12, color: "rgba(200,195,255,0.5)", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                Nicht mehr anzeigen
              </button>
              {slide < SLIDES.length - 1 ? (
                <button onClick={() => setSlide(slide + 1)} style={{ background: "#7c5fff", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
                  Weiter →
                </button>
              ) : (
                <button onClick={handleClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(200,195,255,0.6)", fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "6px 14px", cursor: "pointer" }}>
                  Verstanden
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes propora-fadein {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
