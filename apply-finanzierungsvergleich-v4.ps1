# apply-finanzierungsvergleich-v4.ps1
# Schreibt die komplette, aktualisierte FinanzierungsVergleich.tsx nach src\routes\
# (PDF-Import entfernt jetzt automatisch unbearbeitete Platzhalter-Angebote)
# Ausführen aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\apply-finanzierungsvergleich-v4.ps1

$path = "src\routes\FinanzierungsVergleich.tsx"

if (Test-Path $path) {
    Copy-Item $path "$path.bak4" -Force
    Write-Host "Backup angelegt: $path.bak4"
}

$content = @'
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
  Cell,
  LabelList,
} from "recharts";
import { Download, Plus, Trash2, FileUp, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite URL-Import des Workers
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
  isDefault: boolean; // true = unbearbeiteter Platzhalter, wird bei PDF-Import automatisch entfernt
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

const METRIC_CONFIG: Record<
  SortKey,
  { label: string; accessor: (r: OfferResult) => number; format: (n: number) => string }
> = {
  empfehlung: { label: "Gesamtkosten", accessor: (r) => r.gesamtkosten, format: (n) => eur0(n) },
  gesamtkosten: { label: "Gesamtkosten", accessor: (r) => r.gesamtkosten, format: (n) => eur0(n) },
  monatsrate: { label: "Monatsrate", accessor: (r) => r.monatsrate, format: (n) => eur(n) },
  restschuld: { label: "Restschuld", accessor: (r) => r.restschuld, format: (n) => eur0(n) },
  sollzins: { label: "Sollzins", accessor: (r) => r.sollzinsPct * 100, format: (n) => `${n.toFixed(2)} %` },
};

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
    isDefault: true,
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
  const [kaufpreis, setKaufpreis] = useState(400_000);
  const [nebenkostenPct, setNebenkostenPct] = useState(0.1);
  const [eigenkapital, setEigenkapital] = useState(100_000);
  const [bereitstellungsdauerMonate, setBereitstellungsdauerMonate] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([
    neuesAngebot(1),
    neuesAngebot(2),
  ]);
  const [sortKey, setSortKey] = useState<SortKey>("empfehlung");
  const [maxRate, setMaxRate] = useState<number>(0); // 0 = kein Filter
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const nebenkosten = useMemo(
    () => Math.max(0, kaufpreis * clamp(nebenkostenPct, 0, 0.2)),
    [kaufpreis, nebenkostenPct]
  );
  const kapitalbedarf = useMemo(() => kaufpreis + nebenkosten, [kaufpreis, nebenkosten]);
  const kreditsumme = useMemo(
    () => Math.max(0, kapitalbedarf - Math.max(0, eigenkapital)),
    [kapitalbedarf, eigenkapital]
  );
  const eigenkapFehler = eigenkapital > kapitalbedarf;
  const activeOfferCount = useMemo(() => offers.filter((o) => !o.isDefault).length, [offers]);

  function addOffer() {
    if (offers.length >= 5) return;
    setOffers((o) => [...o, neuesAngebot(o.length + 1)]);
  }
  function removeOffer(id: string) {
    setOffers((o) => o.filter((x) => x.id !== id));
  }
  function updateOffer(id: string, patch: Partial<Offer>) {
    setOffers((o) => o.map((x) => (x.id === id ? { ...x, ...patch, isDefault: false } : x)));
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
      [
        JSON.stringify(
          { kaufpreis, nebenkostenPct, eigenkapital, bereitstellungsdauerMonate, offers },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finanzierungsvergleich-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ============ PDF-Import ============ */
  async function extractPdfText(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n";
    }
    return text;
  }

  async function extractOfferFromText(text: string): Promise<Partial<Offer> | null> {
    const prompt = `Du bekommst den Text eines Bankangebots für eine Immobilienfinanzierung. Extrahiere die folgenden Werte, falls vorhanden, und antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown, ohne Codeblock, ohne weiteren Text.

{
  "name": string,                      // Bankname/Anbieter, falls erkennbar, sonst "Angebot"
  "sollzinsPct": number,                // Sollzins p.a. in Prozent, z.B. 3.8
  "zinsbindungJahre": number,           // Sollzinsbindung in Jahren
  "tilgungStartPct": number,            // anfängliche Tilgung in Prozent
  "bereitstellungsfreieMonate": number, // bereitstellungsfreie Monate
  "bereitstellungszinsPct": number,     // Bereitstellungszins p.a. in Prozent
  "sondertilgungPct": number,           // kostenlose Sondertilgung p.a. in Prozent
  "bearbeitungsgebuehrPct": number,     // Bearbeitungsgebühr in Prozent der Kreditsumme
  "effektiverJahreszinsPct": number     // effektiver Jahreszins in Prozent, falls angegeben
}

Verwende 0 als Wert, wenn eine Angabe im Text nicht auffindbar ist. Text des Angebots:
"""
${text.slice(0, 12000)}
"""`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`API-Fehler (${res.status})`);
    }

    const data = await res.json();
    const textBlock = data.content?.[0]?.text ?? "";
    const cleaned = textBlock.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  async function handlePdfFile(file: File) {
    const activeCount = offers.filter((o) => !o.isDefault).length;
    if (activeCount >= 5) {
      setImportError("Maximal 5 Angebote möglich - bitte zuerst eines entfernen.");
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const text = await extractPdfText(file);
      const extracted = await extractOfferFromText(text);
      if (!extracted) {
        setImportError("Konnte keine Werte aus dem PDF extrahieren. Bitte manuell eintragen.");
        return;
      }
      const base = neuesAngebot(activeCount + 1);
      const merged: Offer = {
        ...base,
        isDefault: false,
        name: extracted.name || base.name,
        sollzinsPct: pctOrFallback(extracted.sollzinsPct, base.sollzinsPct),
        zinsbindungJahre: numOrFallback(extracted.zinsbindungJahre, base.zinsbindungJahre),
        tilgungStartPct: pctOrFallback(extracted.tilgungStartPct, base.tilgungStartPct),
        bereitstellungsfreieMonate: numOrFallback(
          extracted.bereitstellungsfreieMonate,
          base.bereitstellungsfreieMonate
        ),
        bereitstellungszinsPct: pctOrFallback(
          extracted.bereitstellungszinsPct,
          base.bereitstellungszinsPct
        ),
        sondertilgungPct: pctOrFallback(extracted.sondertilgungPct, base.sondertilgungPct),
        bearbeitungsgebuehrPct: pctOrFallback(
          extracted.bearbeitungsgebuehrPct,
          base.bearbeitungsgebuehrPct
        ),
        effektiverJahreszinsPct: pctOrFallback(
          extracted.effektiverJahreszinsPct,
          base.effektiverJahreszinsPct
        ),
      };
      // Unbearbeitete Platzhalter-Angebote werden beim ersten Import automatisch entfernt,
      // damit man nicht manuell aufräumen muss.
      setOffers((o) => [...o.filter((x) => !x.isDefault), merged]);
    } catch (e: any) {
      setImportError(e?.message || "PDF-Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  function pctOrFallback(v: unknown, fallback: number): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return clamp(n, 0, 100) / 100;
  }
  function numOrFallback(v: unknown, fallback: number): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return n;
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <label
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: activeOfferCount >= 5 ? "not-allowed" : "pointer", background: "rgba(252,220,69,0.1)", border: "1px solid rgba(252,220,69,0.3)", color: "#FCDC45", display: "inline-flex", alignItems: "center", gap: 6, opacity: activeOfferCount >= 5 ? 0.5 : 1 }}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {importing ? "Importiere…" : "PDF-Angebot importieren"}
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                disabled={importing || activeOfferCount >= 5}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdfFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={exportJson}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {importError && (
          <div className="rounded-xl p-3" style={{ background: hexToRgba(COLORS.rose, 0.08), border: `1px solid ${hexToRgba(COLORS.rose, 0.25)}`, fontSize: 12, color: "#f87171" }}>
            {importError}
          </div>
        )}

        {/* Globale Eingaben */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Darlehen (für alle Angebote gleich)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
            <PercentField
              label="Nebenkosten pauschal (%)"
              value={nebenkostenPct * 100}
              step={0.1}
              onChange={(p) => setNebenkostenPct(clamp(p, 0, 100) / 100)}
              hint="Daumenregel: 8–12 %"
            />
            <NumberField label="Eigenkapital (€)" value={eigenkapital} onChange={setEigenkapital} />
          </div>

          {eigenkapFehler && (
            <div style={{ fontSize: 11, color: "#f87171" }}>
              Eigenkapital ist höher als der Kapitalbedarf – bitte prüfen.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <NumberField
              label="Abrufdauer der Kreditsumme (Monate)"
              value={bereitstellungsdauerMonate}
              onChange={(v) => setBereitstellungsdauerMonate(clamp(Math.round(v), 0, 60))}
              help="z. B. Bauphase – nur relevant für Bereitstellungszinsen"
            />
            <KpiDisplay label="Kapitalbedarf" value={eur0(kapitalbedarf)} hint="Kaufpreis + pauschale NK" />
            <KpiDisplay label="Darlehen (Kreditsumme)" value={eur0(kreditsumme)} hint="Kapitalbedarf − Eigenkapital" />
          </div>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Alle Angebote werden für dieselbe Kreditsumme (Darlehen) verglichen, damit Zinssätze und Konditionen fair
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
                <option value="empfehlung" style={{ color: "#111827", background: "#fff" }}>Empfehlung (Gesamtkosten)</option>
                <option value="monatsrate" style={{ color: "#111827", background: "#fff" }}>Monatsrate (niedrigste zuerst)</option>
                <option value="restschuld" style={{ color: "#111827", background: "#fff" }}>Restschuld (niedrigste zuerst)</option>
                <option value="sollzins" style={{ color: "#111827", background: "#fff" }}>Sollzins (niedrigster zuerst)</option>
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
              {METRIC_CONFIG[sortKey].label} im Vergleich
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filtered.map((r) => ({
                    name: r.name,
                    wert: METRIC_CONFIG[sortKey].accessor(r),
                    id: r.id,
                  }))}
                  barSize={44}
                  margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                    tickFormatter={(v) => METRIC_CONFIG[sortKey].format(Number(v))}
                  />
                  <RTooltip
                    content={<ChartTooltip formatter={METRIC_CONFIG[sortKey].format} />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="wert" radius={[8, 8, 8, 8]}>
                    {filtered.map((r, i) => (
                      <Cell key={r.id} fill={i === 0 ? COLORS.emerald : "rgba(255,255,255,0.16)"} />
                    ))}
                    <LabelList
                      dataKey="wert"
                      position="top"
                      formatter={(v: any) => METRIC_CONFIG[sortKey].format(Number(v))}
                      style={{ fill: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
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

function ChartTooltip({ active, payload, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const fmt = typeof formatter === "function" ? formatter : (n: number) => eur0(n);
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{p.payload.name}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#FCDC45" }}>{fmt(Number(p.value))}</div>
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
          label="Bearbeitungsgebühr (% einmalig)"
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
function KpiDisplay({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5, display: "flex", alignItems: "center" }}>
        {label}
        {hint && <Help title={hint} />}
      </div>
      <div style={{ height: 40, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

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
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block" }}>
      <span className="inline-flex items-center">
        {label}
        {hint && <Help title={hint} />}
      </span>
      <input
        style={{ marginTop: 4, width: "100%", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", height: 40, boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
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
    </label>
  );
}

'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $path), $content, $utf8NoBom)
Write-Host "Datei geschrieben: $path"
