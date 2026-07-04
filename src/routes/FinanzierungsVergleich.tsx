// src/routes/FinanzierungsVergleich.tsx
// Finanzierungsvergleich – v1.0
// - Bis zu 5 Bankangebote manuell erfassen (erweiterte Felder)
// - Vergleichstabelle mit Monatsrate, Gesamtkosten, Restschuld
// - Filter/Sortierung + automatische Empfehlung
// - BASIS-Plan (PlanGuard)

import React, { useMemo, useState } from "react";
import PlanGuard from "@/components/PlanGuard";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Download, Plus, Trash2 } from "lucide-react";

/* ================================
   Palette & Helpers (identisch zu FinanzierungSimple.tsx)
==================================*/
const COLORS = {
  primary: "#2563eb",
  indigo: "#4f46e5",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
  gold: "#FCDC45",
};

const eur0 = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const eur = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const nice = (n: number) => Math.round(n);
const uid = () => Math.random().toString(36).slice(2, 9);

const hexToRgba = (hex: string, alpha = 1) => {
  const m = hex.replace("#", "");
  const bigint = parseInt(m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ================================
   Types
==================================*/
type Offer = {
  id: string;
  name: string;
  sollzinsPct: number; // 0..1 p.a.
  zinsbindungJahre: number;
  tilgungStartPct: number; // 0..1 p.a.
  bereitstellungsfreieMonate: number;
  bereitstellungszinsPct: number; // 0..1 p.a.
  sondertilgungPct: number; // 0..1 p.a. kostenlos möglich
  bearbeitungsgebuehrPct: number; // 0..1 einmalig auf Kreditsumme
  effektiverJahreszinsPct: number; // 0..1, 0 = nicht angegeben
};

type OfferResult = Offer & {
  monatsrate: number;
  zinsenGesamt: number;
  tilgungGesamt: number;
  restschuld: number;
  bearbeitungsgebuehr: number;
  bereitstellungskosten: number;
  gesamtkosten: number;
};

type SortKey = "empfehlung" | "gesamtkosten" | "monatsrate" | "restschuld" | "sollzins";

function neuesAngebot(nr: number): Offer {
  return {
    id: uid(),
    name: `Angebot ${nr}`,
    sollzinsPct: 0.038,
    zinsbindungJahre: 10,
    tilgungStartPct: 0.02,
    bereitstellungsfreieMonate: 6,
    bereitstellungszinsPct: 0.03,
    sondertilgungPct: 0.05,
    bearbeitungsgebuehrPct: 0,
    effektiverJahreszinsPct: 0,
  };
}

/* ================================
   Page (Basis-Plan)
==================================*/
export default function FinanzierungsVergleich() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  const [kreditsumme, setKreditsumme] = useState(320_000);
  const [bereitstellungsdauerMonate, setBereitstellungsdauerMonate] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([
    neuesAngebot(1),
    neuesAngebot(2),
  ]);
  const [sortKey, setSortKey] = useState<SortKey>("empfehlung");
  const [maxRate, setMaxRate] = useState<number>(0); // 0 = kein Filter

  function addOffer() {
    if (offers.length >= 5) return;
    setOffers((o) => [...o, neuesAngebot(o.length + 1)]);
  }
  function removeOffer(id: string) {
    setOffers((o) => o.filter((x) => x.id !== id));
  }
  function updateOffer(id: string, patch: Partial<Offer>) {
    setOffers((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  /* ============ Berechnung pro Angebot ============ */
  const results = useMemo<OfferResult[]>(() => {
    return offers.map((offer) => {
      const H = clamp(Math.round(offer.zinsbindungJahre), 1, 30);
      const i_m = offer.sollzinsPct / 12;
      const A = (kreditsumme * (offer.sollzinsPct + offer.tilgungStartPct)) / 12;

      let rest = kreditsumme;
      let zinsenGesamt = 0;
      let tilgungGesamt = 0;

      for (let m = 1; m <= H * 12; m++) {
        if (rest <= 0.01) break;
        const z = rest * i_m;
        const tilg = Math.max(0, A - z);
        rest = Math.max(0, rest - tilg);
        zinsenGesamt += z;
        tilgungGesamt += tilg;
      }

      const bearbeitungsgebuehr = kreditsumme * clamp(offer.bearbeitungsgebuehrPct, 0, 0.1);

      const freieMonate = clamp(offer.bereitstellungsfreieMonate, 0, 36);
      const pflichtigeMonate = Math.max(0, bereitstellungsdauerMonate - freieMonate);
      // Vereinfachung: Bereitstellungszins auf die halbe Kreditsumme im Durchschnitt
      // des noch nicht abgerufenen Zeitraums (typische Abruf-Annahme).
      const bereitstellungskosten =
        kreditsumme * 0.5 * offer.bereitstellungszinsPct * (pflichtigeMonate / 12);

      const gesamtkosten = zinsenGesamt + bearbeitungsgebuehr + bereitstellungskosten;

      return {
        ...offer,
        monatsrate: A,
        zinsenGesamt,
        tilgungGesamt,
        restschuld: rest,
        bearbeitungsgebuehr,
        bereitstellungskosten,
        gesamtkosten,
      };
    });
  }, [offers, kreditsumme, bereitstellungsdauerMonate]);

  const bestId = useMemo(() => {
    if (results.length === 0) return null;
    const sorted = [...results].sort((a, b) => a.gesamtkosten - b.gesamtkosten);
    return sorted[0].id;
  }, [results]);

  const filtered = useMemo(() => {
    let list = [...results];
    if (maxRate > 0) list = list.filter((r) => r.monatsrate <= maxRate);
    const cmp: Record<SortKey, (a: OfferResult, b: OfferResult) => number> = {
      empfehlung: (a, b) => a.gesamtkosten - b.gesamtkosten,
      gesamtkosten: (a, b) => a.gesamtkosten - b.gesamtkosten,
      monatsrate: (a, b) => a.monatsrate - b.monatsrate,
      restschuld: (a, b) => a.restschuld - b.restschuld,
      sollzins: (a, b) => a.sollzinsPct - b.sollzinsPct,
    };
    list.sort(cmp[sortKey]);
    return list;
  }, [results, sortKey, maxRate]);

  const best = results.find((r) => r.id === bestId);

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ kreditsumme, bereitstellungsdauerMonate, offers }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finanzierungsvergleich-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", color: "#e6edf3" }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L10 4L17 10" stroke="#FCDC45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 9v6a1 1 0 001 1h8a1 1 0 001-1V9" stroke="#FCDC45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 16v-3h4v3" stroke="#FCDC45" strokeWidth="1.3" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Finanzierungsvergleich</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>
                Bis zu 5 Bankangebote nebeneinander vergleichen – inkl. Nebenkosten der Finanzierung.
              </p>
            </div>
          </div>
          <button
            onClick={exportJson}
            style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        {/* Globale Eingaben */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Darlehen (für alle Angebote gleich)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NumberField
              label="Kreditsumme (€)"
              value={kreditsumme}
              onChange={setKreditsumme}
            />
            <NumberField
              label="Abrufdauer der Kreditsumme (Monate)"
              value={bereitstellungsdauerMonate}
              onChange={(v) => setBereitstellungsdauerMonate(clamp(Math.round(v), 0, 60))}
              help="z. B. Bauphase – nur relevant für Bereitstellungszinsen"
            />
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Alle Angebote werden für die gleiche Kreditsumme verglichen, damit Zinssätze und Konditionen fair
            gegenübergestellt werden können.
          </p>
        </div>

        {/* Angebote */}
        <div className="space-y-4">
          {offers.map((offer, idx) => (
            <OfferCard
              key={offer.id}
              index={idx + 1}
              offer={offer}
              isBest={offer.id === bestId && offers.length > 1}
              onChange={(patch) => updateOffer(offer.id, patch)}
              onRemove={offers.length > 1 ? () => removeOffer(offer.id) : undefined}
            />
          ))}
          {offers.length < 5 && (
            <button
              onClick={addOffer}
              style={{ width: "100%", padding: "12px", borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Plus className="h-4 w-4" /> Angebot hinzufügen ({offers.length}/5)
            </button>
          )}
        </div>

        {/* Empfehlung */}
        {best && offers.length > 1 && (
          <div className="rounded-2xl p-4" style={{ background: hexToRgba(COLORS.emerald, 0.08), border: `1px solid ${hexToRgba(COLORS.emerald, 0.25)}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.emerald, display: "flex", alignItems: "center", gap: 8 }}>
              ✓ Empfehlung: {best.name}
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>
              Über die Sollzinsbindung von {best.zinsbindungJahre} Jahren fallen bei diesem Angebot die
              geringsten Gesamtkosten an ({eur0(nice(best.gesamtkosten))} aus Zinsen, Bereitstellungszinsen und
              Bearbeitungsgebühr). Die Restschuld am Ende der Zinsbindung liegt bei {eur0(nice(best.restschuld))}.
            </p>
          </div>
        )}

        {/* Filter/Sortierung */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Sortierung</div>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                style={{ width: "100%", height: 40, borderRadius: 10, padding: "0 12px", fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
              >
                <option value="empfehlung">Empfehlung (Gesamtkosten)</option>
                <option value="monatsrate">Monatsrate (niedrigste zuerst)</option>
                <option value="restschuld">Restschuld (niedrigste zuerst)</option>
                <option value="sollzins">Sollzins (niedrigster zuerst)</option>
              </select>
            </div>
            <NumberField
              label="Max. Monatsrate filtern (€, 0 = kein Filter)"
              value={maxRate}
              onChange={(v) => setMaxRate(Math.max(0, v))}
            />
          </div>
        </div>

        {/* Vergleichstabelle */}
        <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 8 }}>Vergleich</div>
          <table style={{ width: "100%", fontSize: 13, minWidth: 780, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Angebot", "Sollzins", "Zinsbindung", "Monatsrate", "Zinsen gesamt", "Restschuld", "Geb\u00fchren", "Gesamtkosten"].map((h) => (
                  <th key={h} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: r.id === bestId ? hexToRgba(COLORS.emerald, 0.06) : "transparent" }}>
                  <td className="py-2 pr-3" style={{ fontWeight: 600, color: r.id === bestId ? COLORS.emerald : "rgba(255,255,255,0.88)" }}>
                    {r.name} {r.id === bestId && offers.length > 1 ? "✓" : ""}
                  </td>
                  <td className="py-2 pr-3">{(r.sollzinsPct * 100).toFixed(2)} %</td>
                  <td className="py-2 pr-3">{r.zinsbindungJahre} J.</td>
                  <td className="py-2 pr-3">{eur(r.monatsrate)}</td>
                  <td className="py-2 pr-3">{eur0(nice(r.zinsenGesamt))}</td>
                  <td className="py-2 pr-3">{eur0(nice(r.restschuld))}</td>
                  <td className="py-2 pr-3">{eur0(nice(r.bearbeitungsgebuehr + r.bereitstellungskosten))}</td>
                  <td className="py-2 pr-3" style={{ fontWeight: 600 }}>{eur0(nice(r.gesamtkosten))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        {results.length > 1 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 8 }}>
              Gesamtkosten im Vergleich
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.map((r) => ({ name: r.name, kosten: nice(r.gesamtkosten) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} dataKey="name" />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <RTooltip formatter={(v: any) => eur0(Number(v))} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  <Legend />
                  <Bar dataKey="kosten" name="Gesamtkosten" fill={COLORS.gold} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          Vereinfachtes Modell: konstante Anfangs-Annuität je Angebot über die jeweilige Sollzinsbindung;
          Bereitstellungszinsen werden pauschal auf die halbe Kreditsumme während der Abrufdauer geschätzt.
          Keine Finanz- oder Rechtsberatung.
        </p>
      </div>
    </div>
  );
}

/* ================================
   Angebots-Karte
==================================*/
function OfferCard({
  index,
  offer,
  isBest,
  onChange,
  onRemove,
}: {
  index: number;
  offer: Offer;
  isBest: boolean;
  onChange: (patch: Partial<Offer>) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{
        background: "rgba(22,27,34,0.8)",
        border: isBest ? `1px solid ${hexToRgba(COLORS.emerald, 0.4)}` : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <input
          value={offer.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Angebot ${index}`}
          style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)", background: "transparent", border: "none", outline: "none", flex: 1 }}
        />
        {isBest && <KpiPill text="Empfehlung" color={COLORS.emerald} />}
        {onRemove && (
          <button onClick={onRemove} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <PercentField
          label="Sollzins p.a. (%)"
          value={offer.sollzinsPct * 100}
          step={0.01}
          onChange={(p) => onChange({ sollzinsPct: clamp(p, 0, 100) / 100 })}
        />
        <NumberField
          label="Sollzinsbindung (Jahre)"
          value={offer.zinsbindungJahre}
          onChange={(v) => onChange({ zinsbindungJahre: clamp(Math.round(v), 1, 30) })}
        />
        <PercentField
          label="Anf. Tilgung p.a. (%)"
          value={offer.tilgungStartPct * 100}
          step={0.01}
          onChange={(p) => onChange({ tilgungStartPct: clamp(p, 0, 100) / 100 })}
        />
        <PercentField
          label="Eff. Jahreszins (%, optional)"
          value={offer.effektiverJahreszinsPct * 100}
          step={0.01}
          onChange={(p) => onChange({ effektiverJahreszinsPct: clamp(p, 0, 100) / 100 })}
          hint="Falls von der Bank angegeben"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <NumberField
          label="Bereitstellungsfreie Monate"
          value={offer.bereitstellungsfreieMonate}
          onChange={(v) => onChange({ bereitstellungsfreieMonate: clamp(Math.round(v), 0, 36) })}
        />
        <PercentField
          label="Bereitstellungszins p.a. (%)"
          value={offer.bereitstellungszinsPct * 100}
          step={0.01}
          onChange={(p) => onChange({ bereitstellungszinsPct: clamp(p, 0, 100) / 100 })}
        />
        <PercentField
          label="Sondertilgung p.a. (%)"
          value={offer.sondertilgungPct * 100}
          step={0.5}
          onChange={(p) => onChange({ sondertilgungPct: clamp(p, 0, 100) / 100 })}
          hint="Kostenlos möglich"
        />
        <PercentField
          label="Bearbeitungsgeb\u00fchr (% einmalig)"
          value={offer.bearbeitungsgebuehrPct * 100}
          step={0.05}
          onChange={(p) => onChange({ bearbeitungsgebuehrPct: clamp(p, 0, 10) / 100 })}
        />
      </div>
    </div>
  );
}

/* ================================
   UI-Bausteine (identisch zu FinanzierungSimple.tsx)
==================================*/
function KpiPill({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, background: hexToRgba(color, 0.12), color, border: `1px solid ${hexToRgba(color, 0.3)}` }}
    >
      {text}
    </span>
  );
}

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)", marginLeft: 4 }} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>
  );
}

function NumberField({
  label, value, onChange, help,
}: {
  label: string; value: number; onChange: (n: number) => void; help?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const rawValue = Number.isFinite(value) ? Math.round(value) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE");
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5, display: "flex", alignItems: "center" }}>
        {label}
        {help && <Help title={help} />}
      </div>
      <input
        className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${focused ? "rgba(252,220,69,0.4)" : "rgba(255,255,255,0.08)"}`, color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
        type="text"
        inputMode="decimal"
        value={displayVal}
        placeholder={focused ? formattedValue : ""}
        onFocus={() => { setFocused(true); setDraft(""); }}
        onBlur={() => {
          setFocused(false);
          if (draft !== null && draft.trim() !== "") {
            const p = parseFloat(draft.replace(/\./g, "").replace(",", "."));
            if (Number.isFinite(p)) onChange(p);
          }
          setDraft(null);
        }}
        onChange={(e) => {
          const r = e.target.value;
          setDraft(r);
          if (r.trim() !== "") {
            const p = parseFloat(r.replace(/\./g, "").replace(",", "."));
            if (Number.isFinite(p)) onChange(p);
          }
        }}
        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
      />
    </div>
  );
}

function PercentField({
  label, value, onChange, hint, step = 0.1,
}: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; step?: number;
}) {
  return (
    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block" }}>
      <span className="inline-flex items-center">
        {label}
        {hint && <Help title={hint} />}
      </span>
      <input
        style={{ marginTop: 4, width: "100%", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", height: 40, boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
        type="number"
        step={step}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}
