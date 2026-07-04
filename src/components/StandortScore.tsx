// src/routes/StandortScore.tsx
// Propora Standort-Score – PLZ-basierte Marktdaten (PriceHubble / immocation, Stand Jan 2022)

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, TrendingUp, Home, Banknote, Info } from "lucide-react";

interface PlzData {
  s: string;   // Stadt
  k: number;   // Kaufpreis €/m²
  m: number;   // Miete €/m²
  r: number;   // Rendite brutto
}

interface StandortDaten {
  meta: { source: string; stand: string; objekt: string; count: number };
  plz: Record<string, PlzData>;
  bundesland: Record<string, string>;
}

// Score-Berechnung
function calcScore(data: PlzData): { score: number; label: string; color: string } {
  // Rendite: 0–10 Punkte (4% = 5, 6% = 10)
  const renditeScore = Math.min(10, Math.max(0, (data.r - 0.02) / 0.04 * 10));
  // Kaufpreis-Faktor: niedriger = besser (unter 25 = gut, über 35 = schlecht)
  const faktor = data.k / (data.m * 12);
  const faktorScore = Math.min(10, Math.max(0, (35 - faktor) / 10 * 10));
  // Mietpreis absolut (7€ = mittel, 14€+ = teuer → weniger Rendite, aber Nachfrage)
  const nachfrageScore = Math.min(10, Math.max(0, (data.m - 5) / 10 * 10));

  const total = renditeScore * 0.5 + faktorScore * 0.3 + nachfrageScore * 0.2;
  const score = Math.round(total * 10);

  const label = score >= 70 ? "Attraktiv" : score >= 45 ? "Durchschnitt" : "Weniger attraktiv";
  const color = score >= 70 ? "#4ade80" : score >= 45 ? "#FCDC45" : "#f87171";
  return { score, label, color };
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 32, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#e6edf3", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>Score</span>
      </div>
    </div>
  );
}

function KpiTile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#e6edf3", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

export default function StandortScore() {
  const [daten, setDaten] = useState<StandortDaten | null>(null);
  const [plzInput, setPlzInput] = useState("");
  const [result, setResult] = useState<{ plz: string; data: PlzData } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/data/standortDaten.json")
      .then(r => r.json())
      .then(d => { setDaten(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function search(plz: string) {
    if (!daten || plz.length < 5) return;
    const d = daten.plz[plz];
    if (d) {
      setResult({ plz, data: d });
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 5);
    setPlzInput(v);
    setNotFound(false);
    if (v.length === 5) search(v);
    else setResult(null);
  }

  const scored = result ? calcScore(result.data) : null;
  const faktor = result ? (result.data.k / (result.data.m * 12)).toFixed(1) : null;
  const bundesland = result && daten ? (daten.bundesland[result.plz.slice(0, 2)] || "–") : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MapPin size={20} color="#FCDC45" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Standort-Score</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: "3px 0 0" }}>
              PLZ eingeben – Marktdaten & Attraktivitätsscore sofort
            </p>
          </div>
        </div>

        {/* Suchfeld */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ position: "relative", maxWidth: 340 }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.85)" }} />
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="PLZ eingeben, z.B. 80331"
              value={plzInput}
              onChange={handleInput}
              style={{
                width: "100%", height: 48, paddingLeft: 42, paddingRight: 16,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, fontSize: 16, color: "#e6edf3", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {notFound && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>
              Keine Daten für PLZ {plzInput} – nur Städte ab 50.000 Einwohner verfügbar.
            </div>
          )}
          {loading && <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>Daten werden geladen…</div>}
        </div>

        {/* Ergebnis */}
        {result && scored && (
          <>
            {/* Score-Card */}
            <div style={{ background: "linear-gradient(135deg, rgba(15,44,138,0.85), rgba(124,58,237,0.6))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 18, padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <ScoreRing score={scored.score} color={scored.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>Standort-Score</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: scored.color, lineHeight: 1.1 }}>{scored.label}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
                    {result.data.s} · PLZ {result.plz} · {bundesland}
                  </div>
                </div>
                {/* Score-Balken */}
                <div style={{ width: "100%", marginTop: 4 }}>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${scored.score}%`, background: scored.color, borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                    <span>Weniger attraktiv</span><span>Sehr attraktiv</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI-Kacheln */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
              <KpiTile
                label="Kaufpreis Ø"
                value={`${result.data.k.toLocaleString("de-DE")} €/m²`}
                sub="Eigentumswohnung 70m²"
              />
              <KpiTile
                label="Miete Ø"
                value={`${result.data.m.toFixed(2)} €/m²`}
                sub="Nettokaltmiete"
                color="#FCDC45"
              />
              <KpiTile
                label="Bruttomietrendite"
                value={`${(result.data.r * 100).toFixed(2)} %`}
                sub="vor Kosten & Steuern"
                color={result.data.r >= 0.05 ? "#4ade80" : result.data.r >= 0.035 ? "#FCDC45" : "#f87171"}
              />
              <KpiTile
                label="Kaufpreisfaktor"
                value={`${faktor}×`}
                sub="Jahreskaltmiete"
                color={parseFloat(faktor!) <= 25 ? "#4ade80" : parseFloat(faktor!) <= 30 ? "#FCDC45" : "#f87171"}
              />
            </div>

            {/* Einordnung */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", marginBottom: 14 }}>Einordnung</div>
              {[
                {
                  icon: <TrendingUp size={15} />,
                  label: "Rendite",
                  value: result.data.r >= 0.05 ? "Überdurchschnittlich – über dem 5%-Zielkorridor" :
                    result.data.r >= 0.035 ? "Marktüblich – im normalen Bereich für deutsche Städte" :
                    "Unterdurchschnittlich – typisch für Großstädte mit hohen Kaufpreisen",
                  ok: result.data.r >= 0.05 ? "g" : result.data.r >= 0.035 ? "a" : "r"
                },
                {
                  icon: <Home size={15} />,
                  label: "Kaufpreisfaktor",
                  value: parseFloat(faktor!) <= 25 ? "Günstig – gutes Verhältnis Kaufpreis zu Miete" :
                    parseFloat(faktor!) <= 30 ? "Marktüblich – typisch für mittelgroße Städte" :
                    "Teuer – hoher Kaufpreis relativ zur Miete, geringere Rendite",
                  ok: parseFloat(faktor!) <= 25 ? "g" : parseFloat(faktor!) <= 30 ? "a" : "r"
                },
                {
                  icon: <Banknote size={15} />,
                  label: "Mietpreisniveau",
                  value: result.data.m >= 12 ? "Hohes Mietpreisniveau – starke Nachfrage, A-Lage" :
                    result.data.m >= 8 ? "Mittleres Niveau – solider Wohnungsmarkt" :
                    "Niedriges Niveau – strukturschwächere Region, höheres Leerstandsrisiko",
                  ok: result.data.m >= 8 ? "g" : "a"
                },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ color: row.ok === "g" ? "#4ade80" : row.ok === "a" ? "#FCDC45" : "#f87171", marginTop: 1, flexShrink: 0 }}>{row.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Datenhinweis */}
            <div style={{ marginTop: 14, display: "flex", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
              <Info size={13} style={{ color: "rgba(255,255,255,0.75)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                Daten: PriceHubble / immocation · Datenstand Januar 2022 · Musterwohnung ETW 70m², 3 Zimmer, Bj. 1977 · Nur Orientierungswerte, keine Anlageberatung.
              </span>
            </div>
          </>
        )}

        {/* Leer-Zustand */}
        {!result && !notFound && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.7)" }}>
            <MapPin size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>PLZ eingeben um Marktdaten & Score zu sehen</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>1.228 PLZ-Gebiete in 184 Städten verfügbar</div>
          </div>
        )}
      </div>
    </div>
  );
}
