/**
 * StandortPanel – zeigt Standortdaten inline im Analyzer
 * Einbinden nach PLZ-Feld:
 * <StandortPanel plz={plz} />
 */

import React from "react";
import { useStandort } from "../hooks/useStandort";
import { MapPin, TrendingUp, Info } from "lucide-react";

interface Props {
  plz: string;
  kaufpreisEingabe?: number;
}

export function StandortPanel({ plz, kaufpreisEingabe }: Props) {
  const { info, notFound, loading } = useStandort(plz);

  if (plz.length !== 5) return null;
  if (loading) return (
    <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
      Standortdaten werden geladen…
    </div>
  );
  if (notFound) return (
    <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Info size={13} style={{ color: "rgba(255,255,255,0.75)", flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
        Keine Marktdaten für PLZ {plz} – nur Städte ab 50.000 Einwohner verfügbar. Standort-Score wird nicht berücksichtigt.
      </span>
    </div>
  );
  if (!info) return null;

  // Kaufpreis-Vergleich
  const kpVergleich = kaufpreisEingabe && info.kaufpreis_m2 > 0
    ? null // wird auf m² Basis schwer – weglassen ohne Fläche
    : null;

  return (
    <div style={{ marginTop: 8, background: "rgba(252,220,69,0.03)", border: "1px solid rgba(252,220,69,0.12)", borderRadius: 12, padding: "14px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <MapPin size={14} style={{ color: "#FCDC45", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
          Standort: {info.stadt} ({plz})
        </span>
        {/* Score-Badge */}
        <div style={{
          marginLeft: "auto", padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600,
          background: info.scoreColor + "18", color: info.scoreColor,
          border: `1px solid ${info.scoreColor}44`
        }}>
          {info.score}/100 · {info.scoreLabel === "attraktiv" ? "Attraktiv" : info.scoreLabel === "durchschnitt" ? "Durchschnitt" : "Schwach"}
        </div>
      </div>

      {/* Marktdaten */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { label: "Markt Kaufpreis", value: `${info.kaufpreis_m2.toLocaleString("de-DE")} €/m²`, sub: "Ø Region" },
          { label: "Markt Miete", value: `${info.miete_m2.toFixed(2)} €/m²`, sub: "Ø Region" },
          { label: "Bruttomietrendite", value: `${(info.rendite_brutto * 100).toFixed(2)} %`, sub: `Faktor ${info.faktor}×`,
            color: info.rendite_brutto >= 0.05 ? "#4ade80" : info.rendite_brutto >= 0.035 ? "#FCDC45" : "#f87171" },
        ].map((k, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: k.color || "#e6edf3", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
        Quelle: PriceHubble / immocation · Stand Jan 2022 · ETW 70m², Bj. 1977
      </div>
    </div>
  );
}
