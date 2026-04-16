// src/routes/Compare.tsx
// Propora Compare v2 – Typ-first, PDF-Import, Side-by-side Vergleich

import React, { useMemo, useRef, useState } from "react";
import PlanGuard from "@/components/PlanGuard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Download, Scale, FileText,
  Loader2, CheckCircle, AlertCircle, ChevronDown, RotateCcw, X
} from "lucide-react";

/* ── Dark Theme Tokens ─────────────────────────────────────── */
const BG       = "#0d1117";
const BG_CARD  = "rgba(22,27,34,0.95)";
const BG_INPUT = "rgba(255,255,255,0.05)";
const BORDER   = "rgba(255,255,255,0.08)";
const TEXT     = "rgba(255,255,255,0.88)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";
const TEXT_DIM = "rgba(255,255,255,0.3)";
const YELLOW   = "#FCDC45";
const GREEN    = "#22c55e";
const RED      = "#ef4444";
const AMBER    = "#f59e0b";
const BLUE     = "#3b82f6";

/* ── Types ──────────────────────────────────────────────────── */
type Immotyp = "ETW" | "MFH" | "EFH";

type Objekt = {
  id: string;
  name: string;
  kaufpreis: number;
  flaecheM2: number;
  baujahr: number;
  lage: string;
  mieteKaltProM2: number;
  leerstandPct: number;
  opexPctBrutto: number;
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  tilgungPct: number;
  capRateAssumed: number;
  pdfStatus: "idle" | "loading" | "done" | "error";
  pdfNote: string;
};

type KpiRow = {
  id: string;
  name: string;
  kaufpreisM2: number;
  bruttorendite: number;
  noiYield: number;
  cashflowMonat: number;
  dscr: number | null;
  wertAusCap: number;
  valueGap: number;
  score: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
};

/* ── Utils ──────────────────────────────────────────────────── */
const eur = (n: number) => Number.isFinite(n) ? n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "–";
const pct = (x: number, d = 1) => Number.isFinite(x) ? (x * 100).toFixed(d) + " %" : "–";
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function calcKpi(o: Objekt): KpiRow {
  const grossYear = o.flaecheM2 * o.mieteKaltProM2 * 12;
  const effYear = grossYear * (1 - clamp01(o.leerstandPct));
  const opexYear = grossYear * clamp01(o.opexPctBrutto);
  const noiYear = effYear - opexYear;
  const loan = o.financingOn ? o.kaufpreis * clamp01(o.ltvPct) : 0;
  const annuity = o.financingOn ? loan * (o.zinsPct + o.tilgungPct) : 0;
  const dscr = o.financingOn && annuity > 0 ? noiYear / annuity : null;
  const cf = (noiYear - annuity) / 12;
  const cap = Math.max(0.0001, o.capRateAssumed);
  const wert = noiYear / cap;
  const gap = wert - o.kaufpreis;
  const noiYield = o.kaufpreis > 0 ? noiYear / o.kaufpreis : 0;
  const bruttorendite = o.kaufpreis > 0 ? grossYear / o.kaufpreis : 0;
  const s1 = clamp01((noiYield - 0.04) / 0.05);
  const s2 = clamp01(((dscr ?? 0) - 1.1) / 0.6);
  const s3 = clamp01((cf + 500) / 1500);
  const score = clamp01(s1 * 0.5 + s2 * 0.35 + s3 * 0.15);
  const scoreLabel: "BUY" | "CHECK" | "NO" = score >= 0.65 ? "BUY" : score >= 0.45 ? "CHECK" : "NO";
  return {
    id: o.id, name: o.name,
    kaufpreisM2: o.flaecheM2 > 0 ? o.kaufpreis / o.flaecheM2 : 0,
    bruttorendite, noiYield,
    cashflowMonat: Math.round(cf),
    dscr: dscr ? Number(dscr.toFixed(2)) : null,
    wertAusCap: Math.round(wert), valueGap: Math.round(gap),
    score, scoreLabel,
  };
}

function defaultObjekt(n: number): Objekt {
  return {
    id: uid(), name: `Objekt ${n}`, kaufpreis: 350_000, flaecheM2: 75,
    baujahr: 1995, lage: "", mieteKaltProM2: 12, leerstandPct: 0.05,
    opexPctBrutto: 0.22, financingOn: true, ltvPct: 0.8, zinsPct: 0.039,
    tilgungPct: 0.02, capRateAssumed: 0.055, pdfStatus: "idle", pdfNote: "",
  };
}

/* ── Input Atoms ────────────────────────────────────────────── */
const iStyle: React.CSSProperties = {
  width: "100%", height: 36, borderRadius: 8, padding: "0 10px",
  background: BG_INPUT, border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: 12, boxSizing: "border-box", outline: "none",
};
const lStyle: React.CSSProperties = { fontSize: 11, color: TEXT_MUTED, marginBottom: 4, display: "block" };

function NF({ label, value, onChange, step = 1, suffix }: {
  label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const dec = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const raw = Number.isFinite(value) ? Number(value.toFixed(dec)) : 0;
  const display = focused ? String(raw) : raw.toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input style={iStyle} type={focused ? "number" : "text"} step={step} value={display}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value.replace(/[^0-9.,-]/g, "").replace(",", ".")))}
          onWheel={e => (e.currentTarget as HTMLInputElement).blur()} />
        {suffix && <span style={{ fontSize: 10, color: TEXT_DIM, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SF({ label, value, onChange, step = 0.001, min = 0, max = 0.95 }: {
  label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <label style={{ ...lStyle, marginBottom: 0 }}>{label}</label>
        <span style={{ fontSize: 11, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{pct(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: YELLOW, height: 3 }} />
    </div>
  );
}

function TF({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <input style={iStyle} type="text" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

/* ── Score Badge ────────────────────────────────────────────── */
function ScoreBadge({ score, label }: { score: number; label: "BUY" | "CHECK" | "NO" }) {
  const color = label === "BUY" ? GREEN : label === "CHECK" ? AMBER : RED;
  const pctVal = Math.round(score * 100);
  const circ = 2 * Math.PI * 18;
  const dash = (pctVal / 100) * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
        <svg viewBox="0 0 44 44" style={{ position: "absolute", inset: 0 }}>
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 22 22)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{pctVal}%</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          {label === "BUY" ? "Kaufen" : label === "CHECK" ? "Prüfen" : "Ablehnen"}
        </div>
      </div>
    </div>
  );
}

/* ── PDF Import via Backend ─────────────────────────────────── */
async function extractPdfData(file: File): Promise<Partial<Objekt> & { notFound?: string[] }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/import-expose-mfh", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Import fehlgeschlagen");
  const inp = json.data?.input ?? json.data ?? {};
  return {
    name: inp.name ?? inp.adresse ?? undefined,
    kaufpreis: inp.kaufpreis ?? undefined,
    flaecheM2: inp.gesamtFlaecheM2 ?? inp.flaecheM2 ?? undefined,
    baujahr: inp.baujahr ?? undefined,
    lage: inp.lage ?? inp.ort ?? inp.bundesland ?? undefined,
    mieteKaltProM2: inp.kaltmieteMonat && inp.gesamtFlaecheM2
      ? inp.kaltmieteMonat / inp.gesamtFlaecheM2
      : inp.mieteProM2Monat ?? undefined,
    notFound: inp.notFound ?? [],
  };
}

/* ── Objekt Karte ───────────────────────────────────────────── */
function ObjektKarte({ obj, kpi, onChange, onDelete, isOnly }: {
  obj: Objekt; kpi: KpiRow;
  onChange: (patch: Partial<Objekt>) => void;
  onDelete: () => void; isOnly: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const color = kpi.scoreLabel === "BUY" ? GREEN : kpi.scoreLabel === "CHECK" ? AMBER : RED;

  async function handlePdf(file: File) {
    onChange({ pdfStatus: "loading", pdfNote: "Analysiere PDF..." });
    try {
      const extracted = await extractPdfData(file);
      const notFound: string[] = extracted.notFound ?? [];
      const patch: Partial<Objekt> = {
        pdfStatus: "done",
        pdfNote: notFound.length ? `Nicht gefunden: ${notFound.join(", ")}` : "Alle Felder extrahiert",
      };
      if (extracted.name) patch.name = extracted.name as string;
      if (extracted.kaufpreis) patch.kaufpreis = extracted.kaufpreis as number;
      if (extracted.flaecheM2) patch.flaecheM2 = extracted.flaecheM2 as number;
      if (extracted.baujahr) patch.baujahr = extracted.baujahr as number;
      if (extracted.lage) patch.lage = extracted.lage as string;
      if (extracted.mieteKaltProM2) patch.mieteKaltProM2 = extracted.mieteKaltProM2 as number;
      onChange(patch);
    } catch {
      onChange({ pdfStatus: "error", pdfNote: "Fehler beim Analysieren. Bitte manuell ausfüllen." });
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input value={obj.name} onChange={e => onChange({ name: e.target.value })}
          style={{ ...iStyle, flex: 1, fontSize: 14, fontWeight: 600, height: 38, background: "transparent" }} />
        {!isOnly && (
          <button onClick={onDelete} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: RED, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Score */}
      <div style={{ background: `${color}0d`, borderRadius: 12, padding: "12px 14px", border: `1px solid ${color}22` }}>
        <ScoreBadge score={kpi.score} label={kpi.scoreLabel} />
      </div>

      {/* PDF Import */}
      <div>
        <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePdf(f); e.target.value = ""; }} />
        <button onClick={() => fileRef.current?.click()} disabled={obj.pdfStatus === "loading"}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: obj.pdfStatus === "loading" ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px dashed ${obj.pdfStatus === "done" ? GREEN + "44" : BORDER}`, background: obj.pdfStatus === "done" ? "rgba(34,197,94,0.05)" : "rgba(252,220,69,0.04)", color: obj.pdfStatus === "done" ? GREEN : YELLOW }}>
          {obj.pdfStatus === "loading" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> :
           obj.pdfStatus === "done" ? <CheckCircle size={14} /> :
           obj.pdfStatus === "error" ? <AlertCircle size={14} /> :
           <FileText size={14} />}
          {obj.pdfStatus === "loading" ? "Analysiere..." : obj.pdfStatus === "done" ? "PDF importiert" : "Expose-PDF importieren"}
        </button>
        {obj.pdfNote && (
          <p style={{ fontSize: 11, marginTop: 5, color: obj.pdfStatus === "error" ? RED : obj.pdfStatus === "done" ? GREEN : TEXT_MUTED }}>{obj.pdfNote}</p>
        )}
      </div>

      {/* Objekt */}
      <Section label="Objekt">
        <NF label="Kaufpreis (EUR)" value={obj.kaufpreis} onChange={v => onChange({ kaufpreis: v })} />
        <NF label="Wohnflaeche (m2)" value={obj.flaecheM2} onChange={v => onChange({ flaecheM2: v })} />
        <NF label="Baujahr" value={obj.baujahr} onChange={v => onChange({ baujahr: v })} />
        <TF label="Lage / Adresse" value={obj.lage} onChange={v => onChange({ lage: v })} />
      </Section>

      {/* Miete */}
      <Section label="Miete & Kosten">
        <NF label="Kaltmiete (EUR/m2/Monat)" value={obj.mieteKaltProM2} onChange={v => onChange({ mieteKaltProM2: v })} step={0.1} />
        <SF label="Leerstand" value={obj.leerstandPct} onChange={v => onChange({ leerstandPct: v })} max={0.3} />
        <SF label="Opex (% Bruttomiete)" value={obj.opexPctBrutto} onChange={v => onChange({ opexPctBrutto: v })} max={0.5} />
      </Section>

      {/* Finanzierung */}
      <Section label="Finanzierung" right={
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT_MUTED, cursor: "pointer" }}>
          <input type="checkbox" checked={obj.financingOn} onChange={e => onChange({ financingOn: e.target.checked })} style={{ accentColor: YELLOW }} />
          aktiv
        </label>
      }>
        <AnimatePresence initial={false}>
          {obj.financingOn && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
              <SF label="LTV (Beleihung)" value={obj.ltvPct} onChange={v => onChange({ ltvPct: v })} step={0.005} max={0.95} />
              <SF label="Zins p.a." value={obj.zinsPct} onChange={v => onChange({ zinsPct: v })} step={0.001} max={0.1} />
              <SF label="Tilgung p.a." value={obj.tilgungPct} onChange={v => onChange({ tilgungPct: v })} step={0.001} max={0.1} />
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* Cap Rate */}
      <Section label="Bewertung">
        <SF label="Cap Rate (Modell)" value={obj.capRateAssumed} onChange={v => onChange({ capRateAssumed: v })} step={0.0005} min={0.02} max={0.12} />
      </Section>

      {/* Mini KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          ["Kaufpreis/m2", eur(kpi.kaufpreisM2)],
          ["Bruttorendite", pct(kpi.bruttorendite)],
          ["NOI-Yield", pct(kpi.noiYield)],
          ["CF mtl.", eur(kpi.cashflowMonat)],
          ["DSCR", kpi.dscr?.toFixed(2) ?? "–"],
          ["Value Gap", eur(kpi.valueGap)],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Section({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ── Vergleichstabelle ──────────────────────────────────────── */
function Vergleichstabelle({ objekte, kpis }: { objekte: Objekt[]; kpis: KpiRow[] }) {
  const rows: { label: string; key: keyof KpiRow; fmt: (v: number) => string; higher: boolean }[] = [
    { label: "Kaufpreis/m2", key: "kaufpreisM2", fmt: eur, higher: false },
    { label: "Bruttorendite", key: "bruttorendite", fmt: v => pct(v), higher: true },
    { label: "NOI-Yield", key: "noiYield", fmt: v => pct(v), higher: true },
    { label: "Cashflow mtl.", key: "cashflowMonat", fmt: eur, higher: true },
    { label: "DSCR", key: "dscr", fmt: v => v?.toFixed(2) ?? "–", higher: true },
    { label: "Modellwert", key: "wertAusCap", fmt: eur, higher: true },
    { label: "Value Gap", key: "valueGap", fmt: eur, higher: true },
    { label: "Score", key: "score", fmt: v => Math.round(v * 100) + "%", higher: true },
  ];

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Kennzahlen-Vergleich</div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>Gruen = bester Wert · Rot = schlechtester Wert</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Kennzahl</th>
              {objekte.map(o => (
                <th key={o.id} style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: TEXT, fontWeight: 600, whiteSpace: "nowrap" }}>{o.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const vals = kpis.map(k => (k[row.key] as number) ?? 0);
              const best = row.higher ? Math.max(...vals) : Math.min(...vals);
              const worst = row.higher ? Math.min(...vals) : Math.max(...vals);
              return (
                <tr key={row.label} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{row.label}</td>
                  {kpis.map(k => {
                    const v = (k[row.key] as number) ?? 0;
                    const isBest = row.higher ? v >= best : v <= best;
                    const isWorst = row.higher ? v <= worst : v >= worst;
                    const allEqual = vals.every(x => x === vals[0]);
                    return (
                      <td key={k.id} style={{ padding: "10px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13,
                        color: allEqual ? TEXT : isBest ? GREEN : isWorst ? RED : TEXT,
                        fontWeight: isBest && !allEqual ? 700 : 400,
                        background: allEqual ? "transparent" : isBest ? "rgba(34,197,94,0.06)" : isWorst ? "rgba(239,68,68,0.06)" : "transparent",
                      }}>
                        {row.fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr style={{ borderTop: `1px solid ${BORDER}` }}>
              <td style={{ padding: "12px 16px", fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>Empfehlung</td>
              {kpis.map(k => {
                const c = k.scoreLabel === "BUY" ? GREEN : k.scoreLabel === "CHECK" ? AMBER : RED;
                return (
                  <td key={k.id} style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: c + "18", border: `1px solid ${c}44`, color: c }}>
                      {k.scoreLabel}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Typ-Auswahl Screen ─────────────────────────────────────── */
function TypAuswahl({ onSelect }: { onSelect: (t: Immotyp) => void }) {
  const typen: { typ: Immotyp; label: string; desc: string; icon: string }[] = [
    { typ: "ETW", label: "Eigentumswohnung", desc: "Wohnung in Mehrfamilienhaus, vermietet oder zur Eigennutzung", icon: "🏠" },
    { typ: "MFH", label: "Mehrfamilienhaus", desc: "Gesamtes Haus mit mehreren Einheiten als Investment", icon: "🏢" },
    { typ: "EFH", label: "Einfamilienhaus", desc: "Freistehendes Haus, Kapitalanlage oder Eigenheim", icon: "🏡" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, #1b2c47, ${YELLOW})`, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
          <Scale size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEXT, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Immobilien vergleichen</h1>
        <p style={{ fontSize: 14, color: TEXT_MUTED, margin: "0 0 36px" }}>Wähle den Immobilientyp. Alle Objekte im Vergleich müssen vom gleichen Typ sein.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {typen.map(t => (
            <motion.button key={t.typ} onClick={() => onSelect(t.typ)}
              whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
              style={{ padding: "16px 20px", borderRadius: 14, background: BG_CARD, border: `1px solid ${BORDER}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
              <span style={{ fontSize: 28 }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{t.label}</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{t.desc}</div>
              </div>
              <ChevronDown size={14} color={TEXT_DIM} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Hauptkomponente ────────────────────────────────────────── */
export default function Compare() {
  return <PlanGuard required="pro"><CompareInner /></PlanGuard>;
}

function CompareInner() {
  const [typ, setTyp] = useState<Immotyp | null>(null);
  const [objekte, setObjekte] = useState<Objekt[]>([]);

  function initTyp(t: Immotyp) {
    setTyp(t);
    setObjekte([defaultObjekt(1), defaultObjekt(2)]);
  }

  const addObjekt = () => { if (objekte.length < 5) setObjekte(l => [...l, defaultObjekt(l.length + 1)]); };
  const deleteObjekt = (id: string) => setObjekte(l => l.filter(o => o.id !== id));
  const patchObjekt = (id: string, patch: Partial<Objekt>) => setObjekte(l => l.map(o => o.id === id ? { ...o, ...patch } : o));

  const kpis = useMemo(() => objekte.map(calcKpi), [objekte]);
  const best = useMemo(() => kpis.length ? [...kpis].sort((a, b) => b.score - a.score)[0] : null, [kpis]);

  function exportJson() {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify({ typ, objekte }, null, 2)], { type: "application/json" })), download: "vergleich.json" });
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!typ) return <TypAuswahl onSelect={initTyp} />;

  const typLabels: Record<Immotyp, string> = { ETW: "Eigentumswohnung", MFH: "Mehrfamilienhaus", EFH: "Einfamilienhaus" };
  const cols = Math.min(objekte.length, 3);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, #1b2c47, ${YELLOW})`, display: "grid", placeItems: "center" }}>
              <Scale size={18} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Vergleich</h1>
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "rgba(252,220,69,0.12)", border: "1px solid rgba(252,220,69,0.25)", color: YELLOW, fontWeight: 600 }}>{typLabels[typ]}</span>
              </div>
              <p style={{ fontSize: 13, color: TEXT_MUTED, margin: "2px 0 0" }}>{objekte.length} Objekte · bis zu 5 möglich</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {objekte.length < 5 && (
              <button onClick={addObjekt} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: YELLOW, color: "#111", border: "none", cursor: "pointer", fontWeight: 600 }}>
                <Plus size={14} /> Objekt
              </button>
            )}
            <button onClick={exportJson} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              <Download size={14} /> Export
            </button>
            <button onClick={() => setTyp(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              <RotateCcw size={14} /> Typ wechseln
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 120px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Objekt Karten */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
          {objekte.map(o => (
            <ObjektKarte key={o.id} obj={o} kpi={kpis.find(k => k.id === o.id)!}
              onChange={patch => patchObjekt(o.id, patch)}
              onDelete={() => deleteObjekt(o.id)}
              isOnly={objekte.length <= 1} />
          ))}
        </div>

        {/* Vergleichstabelle */}
        {objekte.length >= 2 && <Vergleichstabelle objekte={objekte} kpis={kpis} />}
      </div>

      {/* Sticky Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 16px" }}>
          <div style={{ background: "rgba(13,17,23,0.97)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)" }}>
            {best ? (
              <>
                <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: TEXT_DIM }}>Beste Option</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{best.name}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: GREEN + "18", border: `1px solid ${GREEN}44`, color: GREEN, fontWeight: 700 }}>Score {Math.round(best.score * 100)}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: TEXT_MUTED, flexWrap: "wrap" }}>
                    <span>NOI-Yield <b style={{ color: TEXT }}>{pct(best.noiYield)}</b></span>
                    <span>CF <b style={{ color: TEXT }}>{eur(best.cashflowMonat)}/Monat</b></span>
                    {best.dscr && <span>DSCR <b style={{ color: TEXT }}>{best.dscr}</b></span>}
                    <span>Value Gap <b style={{ color: best.valueGap >= 0 ? GREEN : RED }}>{eur(best.valueGap)}</b></span>
                  </div>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ height: "100%", width: `${Math.round(best.score * 100)}%`, background: `linear-gradient(90deg, ${GREEN}, ${BLUE})`, transition: "width 0.3s" }} />
                </div>
              </>
            ) : (
              <div style={{ padding: "14px 20px", fontSize: 13, color: TEXT_DIM }}>Füge mindestens 2 Objekte hinzu.</div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
