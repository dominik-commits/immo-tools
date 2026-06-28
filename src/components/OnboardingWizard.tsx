/**
 * Propora – OnboardingWizard
 * Erscheint einmalig nach dem ersten Login, pro Analyzer individuell.
 * Aufruf: <OnboardingWizard analyzer="etw" />
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

// ── Typen ────────────────────────────────────────────────────────────────────
type AnalyzerKey = "etw" | "mfh" | "efh" | "gewerbe" | "mixeduse";

interface Slide {
  title: string;
  desc: string;
  mockup: React.ReactNode;
  tip?: string;
  actionHref?: string;
  actionLabel?: string;
}

// ── Mockup-Helfer ────────────────────────────────────────────────────────────
const Y = "#F5C842";
const S = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, height: 34, display: "flex", alignItems: "center", padding: "0 10px" };
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{children}</div>
);
const Field = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div>
    <Label>{label}</Label>
    <div style={{ ...S, border: highlight ? `1px solid ${Y}` : S.border, color: highlight ? Y : "rgba(255,255,255,0.7)", fontWeight: highlight ? 600 : 400, fontSize: 13 }}>{value}</div>
  </div>
);
const ResultBadge = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", textAlign: "center" as const }}>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
  </div>
);
const BrowserMockup = () => (
  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
    <div style={{ background: "rgba(255,255,255,0.06)", padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
      </div>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 5, height: 16, marginLeft: 4 }} />
      <div style={{ width: 18, height: 18, borderRadius: 5, background: Y, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🏠</div>
    </div>
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>immobilienscout24.de · Exposé</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label="Kaufpreis" value="389.000 €" highlight />
        <Field label="Wohnfläche" value="78 m²" highlight />
      </div>
    </div>
  </div>
);

// ── Slide-Definitionen pro Analyzer ─────────────────────────────────────────
const SLIDES: Record<AnalyzerKey, Slide[]> = {
  etw: [
    {
      title: "Willkommen beim Wohnungs-Analyzer",
      desc: "In 3 Schritten siehst du sofort ob sich eine Eigentumswohnung lohnt. Kaufpreis, Miete und Finanzierung – fertig.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Adresse" value="Musterstr. 1, Berlin" /></div>
            <div style={{ width: 80 }}><Field label="PLZ" value="10115" highlight /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Kaufpreis" value="350.000 €" highlight />
            <Field label="Wohnfläche" value="70 m²" />
          </div>
        </div>
      ),
      tip: "PLZ eingeben → Standortdaten werden automatisch geladen.",
    },
    {
      title: "Miete & laufende Kosten",
      desc: "Gib die Kaltmiete pro m² und den Leerstand ein. Die nicht-umlagefähigen Kosten sind bereits vorausgefüllt.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Field label="Kaltmiete/m²" value="12,00 €" highlight />
          <Field label="Leerstand" value="3,0 %" />
          <Field label="Nicht-uml. Kosten" value="25 %" />
        </div>
      ),
      tip: "Tipp: 25% Bewirtschaftungsquote ist ein konservativer Richtwert.",
    },
    {
      title: "Finanzierung eingeben",
      desc: "Optional: Trage Zinssatz, Tilgung und Eigenkapitalquote ein – der DSCR wird sofort berechnet.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Field label="Eigenkapital" value="90 %" />
          <Field label="Zinssatz" value="3,5 %" highlight />
          <Field label="Tilgung" value="2,0 %" />
        </div>
      ),
      tip: "Kein Darlehen? Haken bei Finanzierung entfernen.",
    },
    {
      title: "Dein Ergebnis – live",
      desc: "Score, Cashflow, Rendite und DSCR werden in Echtzeit rechts angezeigt. Nutze die Spielwiese um Szenarien durchzuspielen.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <ResultBadge label="Cashflow/Mo" value="+320 €" color="#4ade80" />
          <ResultBadge label="NOI-Rendite" value="5,2 %" color={Y} />
          <ResultBadge label="DSCR" value="1,28" color="#4ade80" />
        </div>
      ),
      tip: "Bankbericht-Button → PDF für dein Bankgespräch (BASIS+).",
    },
    {
      title: "Spar dir das Abschreiben",
      desc: "Mit der PROPORA Chrome-Erweiterung übernimmst du Kaufpreis, Fläche und Adresse direkt aus dem Exposé – ein Klick statt Abtippen.",
      mockup: <BrowserMockup />,
      tip: "Funktioniert mit ImmoScout24, Immowelt, Immonet & mehr.",
      actionHref: "/extension",
      actionLabel: "Erweiterung ansehen",
    },
  ],

  mfh: [
    {
      title: "Willkommen beim MFH-Analyzer",
      desc: "Analysiere Mehrfamilienhäuser: NOI, Cashflow, DSCR und Rendite. Unterstützt bis zu 20 Mieteinheiten.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
            <Field label="Adresse" value="Hauptstr. 5, München" />
            <Field label="PLZ" value="80331" highlight />
          </div>
          <Field label="Kaufpreis" value="1.200.000 €" highlight />
        </div>
      ),
      tip: "PLZ eingeben für automatische Marktdaten der Region.",
    },
    {
      title: "Mieteinheiten erfassen",
      desc: "Wähle zwischen Gesamt-Eingabe (eine Zahl) oder detaillierter Einheiten-Erfassung. Für Banken empfehlen wir einzelne Einheiten.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["Gesamt", "Einheiten"].map((m, i) => (
              <div key={m} style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, background: i === 1 ? Y : "rgba(255,255,255,0.06)", color: i === 1 ? "#111" : "rgba(255,255,255,0.5)", fontWeight: i === 1 ? 600 : 400 }}>{m}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="Einheit" value="3-Zi. OG" />
            <Field label="Fläche" value="75 m²" highlight />
            <Field label="Miete/m²" value="11,50 €" />
          </div>
        </div>
      ),
      tip: "Jede Einheit bekommt eigene Miete, Fläche und Leerstand.",
    },
    {
      title: "Bewirtschaftung & Finanzierung",
      desc: "Nicht-umlagefähige Kosten, Capex-Rücklage und Finanzierungskonditionen vervollständigen die Analyse.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Nicht-uml. Kosten" value="18 %" />
          <Field label="Capex-Rücklage" value="8 %" highlight />
          <Field label="Zinssatz" value="3,5 %" />
          <Field label="Tilgung" value="2,0 %" />
        </div>
      ),
      tip: "Capex-Rücklage von 8–10% ist für ältere Objekte empfohlen.",
    },
    {
      title: "Ergebnis & Bankbericht",
      desc: "NOI-Rendite, DSCR und Cashflow erscheinen live. Erstelle mit einem Klick den professionellen 5-seitigen Bankbericht.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <ResultBadge label="NOI-Rendite" value="5,8 %" color={Y} />
          <ResultBadge label="DSCR" value="1,34" color="#4ade80" />
          <ResultBadge label="Cashflow/Mo" value="+680 €" color="#4ade80" />
        </div>
      ),
      tip: "Bankbericht enthält Tilgungsplan, Projektion & Stresstest.",
    },
    {
      title: "Spar dir das Abschreiben",
      desc: "Mit der PROPORA Chrome-Erweiterung übernimmst du Kaufpreis, Fläche und Adresse direkt aus dem Exposé – ein Klick statt Abtippen.",
      mockup: <BrowserMockup />,
      tip: "Funktioniert mit ImmoScout24, Immowelt, Immonet & mehr.",
      actionHref: "/extension",
      actionLabel: "Erweiterung ansehen",
    },
  ],

  efh: [
    {
      title: "Willkommen beim EFH-Analyzer",
      desc: "Berechne ob sich ein Einfamilienhaus als Kapitalanlage lohnt – Cashflow, Rendite und DSCR auf einen Blick.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
            <Field label="Adresse" value="Gartenweg 3, Hamburg" />
            <Field label="PLZ" value="22765" highlight />
          </div>
          <Field label="Kaufpreis" value="650.000 €" highlight />
        </div>
      ),
      tip: "PLZ eingeben für Marktvergleich Kaufpreis & Miete.",
    },
    {
      title: "Miete & laufende Kosten",
      desc: "Gib die Jahreskaltmiete, Mietausfallwagnis und Instandhaltungskosten ein.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Jahreskaltmiete" value="18.000 €" highlight />
          <Field label="Mietausfall" value="5 %" />
          <Field label="Nicht-uml. Kosten" value="3.600 €" />
          <Field label="Instandhaltung" value="2.400 €" />
        </div>
      ),
      tip: "Instandhaltung: 1–1,5% des Kaufpreises p.a. als Richtwert.",
    },
    {
      title: "Finanzierung & Ergebnis",
      desc: "Finanzierungskonditionen eingeben – Cashflow und DSCR werden sofort berechnet.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="LTV" value="80 %" />
            <Field label="Zinssatz" value="3,5 %" highlight />
            <Field label="Laufzeit" value="25 J." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <ResultBadge label="Cashflow/Mo" value="+180 €" color="#4ade80" />
            <ResultBadge label="NOI-Rendite" value="4,1 %" color={Y} />
            <ResultBadge label="DSCR" value="1,22" color={Y} />
          </div>
        </div>
      ),
      tip: "Bankbericht-Button erstellt PDF-Report für Kreditgespräch (PRO).",
    },
    {
      title: "Spar dir das Abschreiben",
      desc: "Mit der PROPORA Chrome-Erweiterung übernimmst du Kaufpreis, Fläche und Adresse direkt aus dem Exposé – ein Klick statt Abtippen.",
      mockup: <BrowserMockup />,
      tip: "Funktioniert mit ImmoScout24, Immowelt, Immonet & mehr.",
      actionHref: "/extension",
      actionLabel: "Erweiterung ansehen",
    },
  ],

  gewerbe: [
    {
      title: "Willkommen beim Gewerbe-Analyzer",
      desc: "Analysiere Gewerbeimmobilien mit Zonenmodell, Cap-Rate-Bewertung, WALT und Bonitätsklassen.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
            <Field label="Adresse" value="Gewerbepark Süd 1" />
            <Field label="PLZ" value="70173" highlight />
          </div>
          <Field label="Kaufpreis" value="2.500.000 €" highlight />
        </div>
      ),
      tip: "PLZ eingeben für Standortdaten der Gewerberegion.",
    },
    {
      title: "Zonen erfassen",
      desc: "Teile das Objekt in Zonen auf – Büro, Lager, Einzelhandel etc. Jede Zone bekommt eigene Miete, Leerstand und WALT.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 6 }}>
            {["Zone", "Fläche", "€/m²", "WALT"].map(h => <div key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{h}</div>)}
            {["Büro EG", "450 m²", "12,50 €", "5,0 J."].map((v, i) => <div key={i} style={{ fontSize: 12, color: i === 0 ? "rgba(255,255,255,0.8)" : Y, fontWeight: i > 0 ? 600 : 400 }}>{v}</div>)}
            {["Lager", "200 m²", "6,00 €", "3,5 J."].map((v, i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{v}</div>)}
          </div>
        </div>
      ),
      tip: "WALT = gewichtete durchschnittliche Restlaufzeit der Mietverträge.",
    },
    {
      title: "Cap-Rate & Bewertung",
      desc: "Gib die angenommene Cap-Rate ein – das Tool berechnet den modellierten Wert und vergleicht ihn mit dem Kaufpreis.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Cap Rate" value="5,5 %" highlight />
          <Field label="Bonität Top 3" value="Klasse A" />
          <Field label="Modellwert" value="2.320.000 €" />
          <Field label="Wert-Gap" value="−180.000 €" />
        </div>
      ),
      tip: "Cap-Rate Richtwert: Büro 4–6%, Lager 5–7%, Einzelhandel 5–8%.",
    },
    {
      title: "Ergebnis & Bankbericht",
      desc: "NOI-Rendite, DSCR, Score und Cap-Rate-Bewertung erscheinen live. Der Bankbericht enthält Zonenanalyse & Stresstest.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <ResultBadge label="NOI-Rendite" value="6,1 %" color={Y} />
          <ResultBadge label="DSCR" value="1,41" color="#4ade80" />
          <ResultBadge label="Score" value="74/100" color="#4ade80" />
        </div>
      ),
      tip: "Bankbericht enthält 5-seitige Zonenanalyse & Sensitivitätsmatrix (PRO).",
    },
    {
      title: "Spar dir das Abschreiben",
      desc: "Mit der PROPORA Chrome-Erweiterung übernimmst du Kaufpreis, Fläche und Adresse direkt aus dem Exposé – ein Klick statt Abtippen.",
      mockup: <BrowserMockup />,
      tip: "Funktioniert mit ImmoScout24, Immowelt, Immonet & mehr.",
      actionHref: "/extension",
      actionLabel: "Erweiterung ansehen",
    },
  ],

  mixeduse: [
    {
      title: "Willkommen beim Mixed-Use-Analyzer",
      desc: "Analysiere gemischt genutzte Immobilien mit getrennten Wohn- und Gewerbesegmenten – NOI, Cap-Rate und Wertermittlung.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Field label="Kaufpreis" value="1.800.000 €" highlight />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#60a5fa", marginBottom: 4 }}>WOHNEN</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>400 m² · 11 €/m²</div>
            </div>
            <div style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#a78bfa", marginBottom: 4 }}>GEWERBE</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>200 m² · 9 €/m²</div>
            </div>
          </div>
        </div>
      ),
      tip: "Wohn- und Gewerbeteil werden separat bewertet und addiert.",
    },
    {
      title: "Segmente konfigurieren",
      desc: "Gib für Wohnen und Gewerbe jeweils Fläche, Miete/m², Leerstand, Opex und Cap-Rate ein.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Wohnen Miete/m²" value="11,00 €" highlight />
          <Field label="Gewerbe Miete/m²" value="9,00 €" highlight />
          <Field label="Wohnen Cap Rate" value="4,0 %" />
          <Field label="Gewerbe Cap Rate" value="6,0 %" />
        </div>
      ),
      tip: "Unterschiedliche Cap-Rates je Segment sind typisch für Mixed-Use.",
    },
    {
      title: "Ergebnis & Wertermittlung",
      desc: "Das Tool addiert beide Segmente und zeigt Gesamt-NOI, Wert aus Cap und Wert-Gap zum Kaufpreis.",
      mockup: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <ResultBadge label="NOI-Rendite" value="5,4 %" color={Y} />
          <ResultBadge label="Wert aus Cap" value="1,72 Mio" color="#4ade80" />
          <ResultBadge label="Cashflow/Mo" value="+520 €" color="#4ade80" />
        </div>
      ),
      tip: "Bankbericht enthält Segmentvergleich Wohnen vs. Gewerbe (PRO).",
    },
    {
      title: "Spar dir das Abschreiben",
      desc: "Mit der PROPORA Chrome-Erweiterung übernimmst du Kaufpreis, Fläche und Adresse direkt aus dem Exposé – ein Klick statt Abtippen.",
      mockup: <BrowserMockup />,
      tip: "Funktioniert mit ImmoScout24, Immowelt, Immonet & mehr.",
      actionHref: "/extension",
      actionLabel: "Erweiterung ansehen",
    },
  ],
};

// ── Wizard-Komponente ────────────────────────────────────────────────────────
interface Props {
  analyzer: AnalyzerKey;
}

function storageKey(analyzer: AnalyzerKey) {
  return `propora_onboarding_${analyzer}_v1`;
}

export function OnboardingWizard({ analyzer }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const slides = SLIDES[analyzer] ?? [];

  useEffect(() => {
    const t = setTimeout(() => {
      const seen = localStorage.getItem(storageKey(analyzer));
      if (!seen) setVisible(true);
    }, 800);
    return () => clearTimeout(t);
  }, [analyzer]);

  function close() {
    setVisible(false);
    localStorage.setItem(storageKey(analyzer), "1");
  }

  function next() {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      close();
      if (s.actionHref) navigate(s.actionHref);
    }
  }

  if (!visible || slides.length === 0) return null;

  const s = slides[slide];
  const isLast = slide === slides.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,10,22,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", zIndex: 9999, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#0d1117", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(245,200,66,0.2)", boxShadow: "0 32px 64px rgba(0,0,0,0.7)", animation: "onboard-in 0.35s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, rgba(15,44,138,0.9), rgba(124,58,237,0.6))", padding: "20px 24px 16px", position: "relative" }}>
          <button onClick={close} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
            <X size={14} />
          </button>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: Y, marginBottom: 6 }}>
            Schritt {slide + 1} von {slides.length}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", lineHeight: 1.2, marginBottom: 6 }}>{s.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{s.desc}</div>
        </div>

        {/* Mockup */}
        <div style={{ padding: "20px 24px", background: "rgba(22,27,34,0.8)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {s.mockup}
        </div>

        {/* Tip */}
        {s.tip && (
          <div style={{ padding: "12px 24px", background: "rgba(245,200,66,0.04)", borderBottom: "1px solid rgba(245,200,66,0.1)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{s.tip}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Dots */}
          <div style={{ display: "flex", gap: 5 }}>
            {slides.map((_, i) => (
              <div key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? Y : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s" }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={close} style={{ background: "none", border: "none", fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Überspringen
            </button>
            <button onClick={next} style={{ background: isLast ? Y : "rgba(245,200,66,0.15)", border: isLast ? "none" : `1px solid rgba(245,200,66,0.3)`, borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: isLast ? "#111" : Y, cursor: "pointer" }}>
              {isLast ? (s.actionLabel ? (s.actionLabel + " →") : "Los gehts →") : "Weiter →"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onboard-in {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}