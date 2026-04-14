// src/routes/Compare.tsx
// Propora Compare (PRO) – vollständig dark mode, kein recharts, Canvas-Charts

import React, { useMemo, useRef, useState, useEffect } from "react";
import PlanGuard from "@/components/PlanGuard";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, Copy, Trash2, Download, Upload, ChevronDown,
  Gauge, Banknote, TrendingUp, LineChart as LineIcon,
  Scale, Stars, Info, Target,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ── Dark Theme Tokens ─────────────────────────────────────── */
const BG        = "#0d1117";
const BG_CARD   = "rgba(22,27,34,0.9)";
const BG_INPUT  = "rgba(255,255,255,0.05)";
const BG_INPUT_SECTION = "rgba(255,255,255,0.03)";
const BORDER    = "rgba(255,255,255,0.08)";
const TEXT      = "rgba(255,255,255,0.88)";
const TEXT_MUTED= "rgba(255,255,255,0.5)";
const TEXT_DIM  = "rgba(255,255,255,0.32)";
const YELLOW    = "#FCDC45";
const BLUE      = "#1b2c47";

/* ── Types ──────────────────────────────────────────────────── */
type SzenarioTyp = "ETW" | "MFH" | "GEWERBE";
type Szenario = {
  id: string; name: string; typ: SzenarioTyp; color: string;
  kaufpreis: number; flaecheM2: number; mieteProM2Monat: number;
  leerstandPct: number; opexPctBrutto: number;
  financingOn: boolean; ltvPct: number; zinsPct: number; tilgungPct: number;
  capRateAssumed: number;
};
type ViewRow = {
  id: string; name: string; typ: SzenarioTyp; color: string;
  noiYear: number; noiYield: number; cashflowMonat: number;
  dscr: number | null; wertAusCap: number; valueGap: number;
  score: number; scoreLabel: "BUY" | "CHECK" | "NO";
};

/* ── Utils ──────────────────────────────────────────────────── */
const eur = (n: number) => Number.isFinite(n) ? n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "–";
const pct = (x: number) => Number.isFinite(x) ? (x * 100).toFixed(1) + " %" : "–";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const scale = (x: number, a: number, b: number) => b === a ? 0 : clamp01((x - a) / (b - a));
const uid = () => Math.random().toString(36).slice(2, 10);
const num = (v: any, fb: number) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
const num0 = (v: number) => Number.isFinite(v) ? String(Math.round(v)) : "";
const numDec = (v: number, d: number) => Number.isFinite(v) ? v.toFixed(d).replace(".", ",") : "";
const safe = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
const pickColor = (i: number) => ["#60a5fa","#34d399","#f59e0b","#f472b6","#a78bfa","#fb7185"][(i-1)%6];
const scoreLabelFrom = (s: number): "BUY"|"CHECK"|"NO" => s >= 0.7 ? "BUY" : s >= 0.5 ? "CHECK" : "NO";
const labelText = (s: "BUY"|"CHECK"|"NO") => s === "BUY" ? "Kaufen (unter Vorbehalt)" : s === "CHECK" ? "Weiter prüfen" : "Eher Nein";
const scoreColor = (l: "BUY"|"CHECK"|"NO") => l === "BUY" ? "#22c55e" : l === "CHECK" ? "#f59e0b" : "#ef4444";

/* ── Rechenlogik ────────────────────────────────────────────── */
function calcViewRow(s: Szenario): ViewRow {
  const grossRentYear = s.flaecheM2 * s.mieteProM2Monat * 12;
  const effRentYear = grossRentYear * (1 - clamp01(s.leerstandPct));
  const opexYear = grossRentYear * clamp01(s.opexPctBrutto);
  const noiYear = effRentYear - opexYear;
  const loan = s.financingOn ? s.kaufpreis * clamp01(s.ltvPct) : 0;
  const annuityYear = s.financingOn ? loan * (s.zinsPct + s.tilgungPct) : 0;
  const dscr = s.financingOn && annuityYear > 0 ? noiYear / annuityYear : null;
  const cashflowMonat = (noiYear - annuityYear) / 12;
  const cap = Math.max(0.0001, s.capRateAssumed);
  const wertAusCap = noiYear / cap;
  const valueGap = Math.round(wertAusCap - s.kaufpreis);
  const noiYield = s.kaufpreis > 0 ? noiYear / s.kaufpreis : 0;
  const score = clamp01(scale(noiYield,0.045,0.09)*0.5 + scale(dscr??0,1.2,1.7)*0.35 + scale(cashflowMonat,0,1200)*0.15);
  return { id: s.id, name: s.name, typ: s.typ, color: s.color, noiYear: Math.round(noiYear), noiYield, cashflowMonat: Math.round(cashflowMonat), dscr: dscr ? Number(dscr.toFixed(2)) : null, wertAusCap: Math.round(wertAusCap), valueGap, score, scoreLabel: scoreLabelFrom(score) };
}

/* ── Canvas Bar Chart ───────────────────────────────────────── */
function BarChartCanvas({ data, colors, labelKey, valueKey, valueFormat }: {
  data: any[]; colors?: string[]; labelKey: string; valueKey: string; valueFormat?: (v: number) => string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fmt = valueFormat ?? ((v: number) => String(v));
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pL = 70, pR = 20, pT = 30, pB = 40;
    const cW = W - pL - pR, cH = H - pT - pB;
    const vals = data.map(d => d[valueKey] as number);
    const minV = Math.min(...vals, 0), maxV = Math.max(...vals, 1);
    const range = maxV - minV || 1;
    const zeroY = pT + cH - ((0 - minV) / range) * cH;
    const barW = Math.max(20, cW / data.length * 0.5);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const v = minV + (range * i / 4);
      const y = pT + cH - ((v - minV) / range) * cH;
      ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
      ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "right";
      ctx.fillText(Math.abs(v) >= 1000 ? `${Math.round(v/1000)}k` : String(Math.round(v)), pL - 5, y + 3);
    }

    // Zero line
    if (minV < 0) {
      ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
      ctx.moveTo(pL, zeroY); ctx.lineTo(W - pR, zeroY); ctx.stroke();
    }

    data.forEach((d, i) => {
      const val = d[valueKey] as number;
      const x = pL + (i + 0.5) * (cW / data.length) - barW / 2;
      const barH = Math.abs((val / range) * cH);
      const y = val >= 0 ? zeroY - barH : zeroY;
      const color = colors?.[i] ?? (val >= 0 ? "#3b6bdb" : "#ef4444");
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, val >= 0 ? y : zeroY, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
      // Label on bar
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "center";
      ctx.fillText(fmt(val), x + barW / 2, val >= 0 ? y - 5 : zeroY + barH + 14);
      // X label
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui";
      const name = String(d[labelKey]);
      ctx.fillText(name.length > 14 ? name.slice(0,13)+"…" : name, x + barW / 2, H - pB + 16);
    });
  }, [data, colors, labelKey, valueKey]);

  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* ── Grouped Bar Chart (Preis vs Wert) ─────────────────────── */
function GroupedBarCanvas({ data }: { data: { name: string; Preis: number; Wert: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pL = 70, pR = 20, pT = 30, pB = 40;
    const cW = W - pL - pR, cH = H - pT - pB;
    const maxV = Math.max(...data.flatMap(d => [d.Preis, d.Wert]), 1);
    const groupW = cW / data.length;
    const barW = Math.max(12, groupW * 0.3);

    for (let i = 0; i <= 4; i++) {
      const y = pT + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
      ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "right";
      const v = maxV * i / 4;
      ctx.fillText(v >= 1000 ? `${Math.round(v/1000)}k` : String(Math.round(v)), pL - 5, y + 3);
    }

    data.forEach((d, gi) => {
      const cx = pL + gi * groupW + groupW / 2;
      const pairs = [{ val: d.Preis, color: "#374151", label: eur(d.Preis) }, { val: d.Wert, color: "#22c55e", label: eur(d.Wert) }];
      pairs.forEach(({ val, color, label }, si) => {
        const x = cx + (si - 0.5) * (barW + 4);
        const bH = (val / maxV) * cH;
        const y = pT + cH - bH;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(x, y, barW, bH, [3,3,0,0]); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "10px system-ui"; ctx.textAlign = "center";
        ctx.fillText(label, x + barW/2, y - 4);
      });
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      const name = d.name.length > 14 ? d.name.slice(0,13)+"…" : d.name;
      ctx.fillText(name, cx, H - pB + 16);
    });
  }, [data]);

  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* ── Export Dropdown ────────────────────────────────────────── */
function ExportDropdown({ onRun }: { onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(true);
  const [csv, setCsv] = useState(false);
  const [pdf, setPdf] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT, cursor: "pointer" }}>
        <Download size={14} /> Export <ChevronDown size={14} style={{ opacity: 0.6 }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#161b22", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, zIndex: 50, width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Formate</div>
            {[["JSON", json, setJson], ["CSV", csv, setCsv], ["PDF", pdf, setPdf]].map(([label, val, set]) => (
              <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: TEXT, cursor: "pointer" }}>
                <input type="checkbox" checked={val as boolean} onChange={e => (set as any)(e.target.checked)} />{label as string}
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={() => { onRun({ json: json||(!csv&&!pdf), csv, pdf }); setOpen(false); }}
                style={{ flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, background: YELLOW, color: "#111", fontWeight: 600, border: "none", cursor: "pointer" }}>Export</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── UI Atoms ───────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = { width: "100%", height: 40, borderRadius: 10, padding: "0 12px", background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, boxSizing: "border-box", outline: "none" };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginBottom: 5, display: "block" };

function NumberField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  const [focused, setFocused] = useState(false);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const raw = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const display = focused ? String(raw) : raw.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input style={inputStyle} type={focused ? "number" : "text"} step={step} value={display}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")))}
          onWheel={e => (e.currentTarget as HTMLInputElement).blur()} />
        {suffix && <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function PercentField({ label, value, onChange, step = 0.005 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        <span style={{ fontSize: 12, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{pct(value)}</span>
      </div>
      <input type="range" min={0} max={0.95} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: YELLOW }} />
    </div>
  );
}

function Kpi({ label, value, icon, mini = false }: { label: string; value: React.ReactNode; icon?: React.ReactNode; mini?: boolean }) {
  return (
    <div style={{ background: mini ? "rgba(255,255,255,0.04)" : BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>{icon}{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_MUTED, background: BG_INPUT }}>
      {icon}{text}
    </span>
  );
}

function InputBadge() {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(252,220,69,0.12)", border: "1px solid rgba(252,220,69,0.25)", color: YELLOW, fontWeight: 600 }}>EINGABE</span>;
}

function ScoreCardSmall({ score, label }: { score: number; label: "BUY"|"CHECK"|"NO" }) {
  const pctVal = Math.round(score * 100);
  const color = scoreColor(label);
  const circ = 2 * Math.PI * 15.5;
  const dash = (pctVal / 100) * circ;
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6 }}>Score</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ position: "absolute", inset: 0 }}>
            <circle cx="18" cy="18" r="15.5" stroke="rgba(255,255,255,0.07)" strokeWidth="5" fill="none" />
            <circle cx="18" cy="18" r="15.5" stroke={color} strokeWidth="5" fill="none"
              strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 18 18)" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color }}>{pctVal}%</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function ScoreDots({ score, label }: { score: number; label: "BUY"|"CHECK"|"NO" }) {
  const filled = Math.round(score * 5);
  const color = scoreColor(label);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < filled ? color : "rgba(255,255,255,0.12)", display: "inline-block" }} />
      ))}
      <span style={{ marginLeft: 6, fontSize: 11, color: TEXT_MUTED }}>{labelText(label)}</span>
    </div>
  );
}

/* ── Glossar ────────────────────────────────────────────────── */
function Glossary({ onClose }: { onClose: () => void }) {
  const terms = [
    ["NOI (Net Operating Income)", "Jahresnettomiete nach Leerstand und laufenden Betriebskosten (Opex), aber vor Finanzierung."],
    ["NOI-Yield", "Verhältnis aus NOI und Kaufpreis. Zeigt, wie 'rentabel' das Objekt vor Finanzierung ist."],
    ["Cashflow (monatlich)", "Geld, das nach Zins- und Tilgungszahlung übrig bleibt (oder fehlt)."],
    ["DSCR", "Kennzahl, wie gut dein NOI die jährlichen Kreditraten deckt. Ab 1,2–1,3 wird es komfortabler."],
    ["LTV (Loan-to-Value)", "Verhältnis von Darlehenshöhe zum Kaufpreis. 80% LTV = 80% FK, 20% EK."],
    ["Cap Rate", "Rendite-Annahme des Marktes auf Basis des NOI. Höhere Cap Rate = niedrigerer Wert."],
    ["Modellwert (NOI/Cap)", "Theoretischer Objektwert basierend auf NOI und Cap Rate. Kein Gutachten."],
    ["Value Gap", "Differenz zwischen Modellwert und Kaufpreis. Positiv = unter Wert (Chance)."],
    ["Opex", "Laufende Betriebskosten, die beim Eigentümer hängen bleiben."],
    ["Leerstand", "Anteil der Flächen ohne Vermietung – reduziert unmittelbare Mieteinnahmen."],
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 440, background: "#161b22", borderLeft: `1px solid ${BORDER}`, padding: 24, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: 0 }}>Glossar – Kennzahlen</h3>
          <button onClick={onClose} style={{ fontSize: 13, color: TEXT, background: "transparent", border: `1px solid ${BORDER}`, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}>Schließen</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {terms.map(([term, def]) => (
            <div key={term}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 3 }}>{term}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>{def}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 20 }}>Vereinfachte Darstellung – ersetzt keine steuerliche, rechtliche oder finanzielle Beratung.</p>
      </div>
    </div>
  );
}

/* ── Demo & Normalizer ──────────────────────────────────────── */
function demoItems(): Szenario[] {
  return [
    { id: uid(), name: "ETW – Cityrand", typ: "ETW", color: "#60a5fa", kaufpreis: 320_000, flaecheM2: 68, mieteProM2Monat: 12.5, leerstandPct: 0.06, opexPctBrutto: 0.24, financingOn: true, ltvPct: 0.8, zinsPct: 0.039, tilgungPct: 0.02, capRateAssumed: 0.055 },
    { id: uid(), name: "MFH – solider Cashflow", typ: "MFH", color: "#34d399", kaufpreis: 1_200_000, flaecheM2: 165, mieteProM2Monat: 12.1, leerstandPct: 0.05, opexPctBrutto: 0.18, financingOn: true, ltvPct: 0.8, zinsPct: 0.039, tilgungPct: 0.02, capRateAssumed: 0.057 },
    { id: uid(), name: "Gewerbe – Büro 2 Zonen", typ: "GEWERBE", color: "#f59e0b", kaufpreis: 1_500_000, flaecheM2: 600, mieteProM2Monat: 15, leerstandPct: 0.08, opexPctBrutto: 0.26, financingOn: true, ltvPct: 0.65, zinsPct: 0.043, tilgungPct: 0.02, capRateAssumed: 0.065 },
  ];
}
function normalizeSzenario(x: any): Szenario {
  return { id: String(x.id ?? uid()), name: String(x.name ?? "Szenario"), typ: (x.typ as SzenarioTyp) ?? "ETW", color: String(x.color ?? pickColor(1)), kaufpreis: num(x.kaufpreis, 300_000), flaecheM2: num(x.flaecheM2, 70), mieteProM2Monat: num(x.mieteProM2Monat, 12), leerstandPct: clamp01(num(x.leerstandPct, 0.05)), opexPctBrutto: clamp01(num(x.opexPctBrutto, 0.25)), financingOn: Boolean(x.financingOn ?? true), ltvPct: clamp01(num(x.ltvPct, 0.8)), zinsPct: clamp01(num(x.zinsPct, 0.04)), tilgungPct: clamp01(num(x.tilgungPct, 0.02)), capRateAssumed: clamp01(num(x.capRateAssumed, 0.055)) };
}

/* ── Hauptkomponente ────────────────────────────────────────── */
export default function Compare() {
  return <PlanGuard required="pro"><CompareInner /></PlanGuard>;
}

function CompareInner() {
  const [items, setItems] = useState<Szenario[]>(() => demoItems());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => items.map(calcViewRow), [items]);
  const best = useMemo(() => rows.length ? [...rows].sort((a,b) => b.score - a.score)[0] : null, [rows]);

  /* Export / Import */
  function exportJson() {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify(items,null,2)],{type:"application/json"})), download: "vergleich-szenarien.json" });
    a.click(); URL.revokeObjectURL(a.href);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => { try { const arr = JSON.parse(String(r.result)); if (!Array.isArray(arr)) throw 0; setItems(arr.map(normalizeSzenario) || demoItems()); } catch { alert("Ungültige Datei"); } };
    r.readAsText(file);
  }
  function exportCSV() {
    const header = ["Name","Typ","Kaufpreis","Fläche_m2","Miete_m2_monat","Leerstand_%","Opex_%_Brutto","Finanzierung","LTV_%","Zins_%","Tilgung_%","CapRate_%","NOI_Jahr","NOI_Yield_%","Cashflow_monat","DSCR","Wert_NOI/Cap","ValueGap"];
    const lines = [header.join(";"), ...items.map(s => { const v = calcViewRow(s); return [safe(s.name),s.typ,num0(s.kaufpreis),num0(s.flaecheM2),numDec(s.mieteProM2Monat,1),numDec(s.leerstandPct*100,1),numDec(s.opexPctBrutto*100,1),s.financingOn?"Ja":"Nein",numDec(s.ltvPct*100,1),numDec(s.zinsPct*100,2),numDec(s.tilgungPct*100,2),numDec(s.capRateAssumed*100,2),num0(v.noiYear),numDec(v.noiYield*100,2),num0(v.cashflowMonat),v.dscr??"",num0(v.wertAusCap),num0(v.valueGap)].join(";"); })];
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"})), download: "vergleich.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function exportPDF() {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#0d1117" });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 20, 20, 555, (canvas.height * 555) / canvas.width);
    pdf.save("vergleich.pdf");
  }

  /* CRUD */
  const addItem = () => setItems(list => [...list, { id: uid(), name: `Szenario ${list.length+1}`, typ: "ETW", color: pickColor(list.length+1), kaufpreis: 350000, flaecheM2: 70, mieteProM2Monat: 12, leerstandPct: 0.05, opexPctBrutto: 0.25, financingOn: true, ltvPct: 0.8, zinsPct: 0.039, tilgungPct: 0.02, capRateAssumed: 0.055 }]);
  const cloneItem = (id: string) => { const it = items.find(x => x.id === id); if (it) setItems(list => [...list, { ...it, id: uid(), name: it.name+" (Kopie)", color: pickColor(list.length+1) }]); };
  const deleteItem = (id: string) => { setItems(list => list.filter(x => x.id !== id)); if (selectedId === id) setSelectedId(null); };
  const patchItem = (id: string, patch: Partial<Szenario>) => setItems(list => list.map(x => x.id === id ? { ...x, ...patch } : x));

  const chartCashflow = rows.map(r => ({ name: r.name, CF: r.cashflowMonat }));
  const chartColors = rows.map(r => r.cashflowMonat >= 0 ? r.color : "#ef4444");
  const chartValueVsPrice = rows.map(r => { const base = items.find(x => x.id === r.id)!; return { name: r.name, Preis: Math.round(base.kaufpreis), Wert: r.wertAusCap }; });

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      {/* Header */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${BLUE}, #FCDC45)`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Scale size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Vergleichs-Rechner</h1>
              <p style={{ fontSize: 13, color: TEXT_MUTED, margin: "2px 0 0", maxWidth: 500 }}>Vergleiche unterschiedliche Objekte nebeneinander: Cashflow, NOI-Rendite, DSCR und Modellwert.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowGlossary(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              Glossar
            </button>
            <button onClick={() => setItems(demoItems())}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              Beispiel
            </button>
            <ExportDropdown onRun={opts => { if (opts.json) exportJson(); if (opts.csv) exportCSV(); if (opts.pdf) exportPDF(); }} />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              <Upload size={14} /> Import
              <input type="file" style={{ display: "none" }} accept="application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={printRef} style={{ maxWidth: 960, margin: "0 auto", padding: "20px 20px 120px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Szenarien */}
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>Lege hier deine Objekte an und passe Mieten, Kosten und Finanzierung an.</div>
            </div>
            <button onClick={addItem}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: YELLOW, color: "#111", border: "none", cursor: "pointer", fontWeight: 600 }}>
              <Plus size={14} /> Szenario hinzufügen
            </button>
          </div>

          {items.map(s => {
            const v = rows.find(r => r.id === s.id)!;
            const active = selectedId === s.id;
            return (
              <div key={s.id} style={{ background: BG_CARD, border: `1px solid ${active ? "rgba(99,102,241,0.5)" : BORDER}`, borderRadius: 16, padding: 18, boxShadow: active ? "0 0 0 2px rgba(99,102,241,0.2)" : "none" }}>
                {/* Kopfzeile */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.color + "20", border: `1px solid ${s.color}66`, color: s.color }}>{s.typ}</span>
                    <input value={s.name} onChange={e => patchItem(s.id, { name: e.target.value })}
                      style={{ ...inputStyle, width: "auto", minWidth: 180 }} />
                    <span style={{ fontSize: 11, color: TEXT_DIM }}>ID: {s.id.slice(0,6)}…</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
                    <ScoreCardSmall score={v.score} label={v.scoreLabel} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button onClick={() => setSelectedId(active ? null : s.id)} title="Hervorheben"
                        style={{ height: 36, borderRadius: 8, background: active ? "rgba(99,102,241,0.15)" : BG_INPUT, border: `1px solid ${active ? "rgba(99,102,241,0.4)" : BORDER}`, color: active ? "#818cf8" : TEXT_MUTED, cursor: "pointer", display: "grid", placeItems: "center" }}>
                        <Target size={14} />
                      </button>
                      <button onClick={() => cloneItem(s.id)} title="Duplizieren"
                        style={{ height: 36, borderRadius: 8, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer", display: "grid", placeItems: "center" }}>
                        <Copy size={14} />
                      </button>
                      <button onClick={() => deleteItem(s.id)} title="Löschen"
                        style={{ height: 36, borderRadius: 8, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", cursor: "pointer", display: "grid", placeItems: "center", gridColumn: "1/-1" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Eingaben */}
                <div style={{ background: BG_INPUT_SECTION, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Eingaben für dieses Objekt</span>
                    <InputBadge />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                    <NumberField label="Kaufpreis (€)" value={s.kaufpreis} onChange={n => patchItem(s.id, { kaufpreis: n })} />
                    <NumberField label="Fläche (m²)" value={s.flaecheM2} onChange={n => patchItem(s.id, { flaecheM2: n })} />
                    <NumberField label="Miete (€/m²/Monat)" value={s.mieteProM2Monat} step={0.1} onChange={n => patchItem(s.id, { mieteProM2Monat: n })} />
                    <PercentField label="Leerstand (%)" value={s.leerstandPct} onChange={x => patchItem(s.id, { leerstandPct: x })} />
                    <PercentField label="Opex auf Bruttomiete (%)" value={s.opexPctBrutto} onChange={x => patchItem(s.id, { opexPctBrutto: x })} />

                    {/* Finanzierung */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Finanzierung</span>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT_MUTED, cursor: "pointer" }}>
                          <input type="checkbox" checked={s.financingOn} onChange={e => patchItem(s.id, { financingOn: e.target.checked })} style={{ accentColor: YELLOW }} />
                          aktiv
                        </label>
                      </div>
                      <AnimatePresence initial={false}>
                        {s.financingOn && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <PercentField label="LTV (Beleihung, %)" value={s.ltvPct} onChange={x => patchItem(s.id, { ltvPct: x })} step={0.001} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <PercentField label="Zins p.a." value={s.zinsPct} onChange={x => patchItem(s.id, { zinsPct: x })} step={0.001} />
                              <PercentField label="Tilgung p.a." value={s.tilgungPct} onChange={x => patchItem(s.id, { tilgungPct: x })} step={0.001} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <PercentField label="Cap Rate (Modell, %)" value={s.capRateAssumed} onChange={x => patchItem(s.id, { capRateAssumed: x })} step={0.0005} />

                    {/* Mini KPIs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <Kpi mini label="NOI-Yield" value={pct(v.noiYield)} icon={<Gauge size={12} />} />
                      <Kpi mini label="CF mtl." value={eur(v.cashflowMonat)} icon={<Banknote size={12} />} />
                      <Kpi mini label="DSCR" value={v.dscr ?? "–"} icon={<TrendingUp size={12} />} />
                    </div>
                  </div>
                </div>

                {/* Wert vs Preis Zeile */}
                <div style={{ marginTop: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: TEXT_MUTED }}>
                    <LineIcon size={14} />
                    <span>Modellwert (NOI/Cap): <b style={{ color: TEXT }}>{eur(v.wertAusCap)}</b></span>
                    <span style={{ color: TEXT_DIM }}>|</span>
                    <span>Kaufpreis: <b style={{ color: TEXT }}>{eur(s.kaufpreis)}</b></span>
                  </div>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${v.valueGap >= 0 ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`, background: v.valueGap >= 0 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: v.valueGap >= 0 ? "#22c55e" : "#f59e0b" }}>
                    {v.valueGap >= 0 ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(v.valueGap))}
                  </span>
                </div>
              </div>
            );
          })}

          {items.length === 0 && <p style={{ fontSize: 13, color: TEXT_DIM }}>Noch keine Szenarien. Füge oben ein Szenario hinzu.</p>}
        </section>

        {/* Charts */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Cashflow Chart */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Cashflow (monatlich) – Ranking</div>
              <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>Zeigt, welches Objekt dir nach Zins und Tilgung den höchsten monatlichen Spielraum lässt.</p>
            </div>
            <div style={{ height: 260 }}>
              <BarChartCanvas data={chartCashflow} colors={chartColors} labelKey="name" valueKey="CF" valueFormat={v => eur(v)} />
            </div>
            <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 10 }}>Dauerhaft negativer Cashflow = aktives Zuschießen. Sollte bewusst entschieden sein.</p>
          </div>

          {/* Wert vs Preis */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Modellwert (NOI/Cap) vs. Kaufpreis</div>
              <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>So siehst du sofort, wo du „unter Wert" einkaufst – oder wo du eher zu viel bezahlst.</p>
            </div>
            <div style={{ height: 260 }}>
              <GroupedBarCanvas data={chartValueVsPrice} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
              {[["Kaufpreis", "#374151"], ["Modellwert (NOI/Cap)", "#22c55e"]].map(([label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 10 }}>Große positive Value-Gap = Chance. Negative Value-Gap = kritisch nachfragen oder nachverhandeln.</p>
          </div>
        </section>
      </div>

      {/* Sticky Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 16px" }}>
          <div style={{ background: "rgba(13,17,23,0.97)", border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)" }}>
            {best ? (
              <>
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: best.color, border: `1px solid ${BORDER}`, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, display: "flex", alignItems: "center", gap: 8 }}>
                        {best.name}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", border: "1px solid rgba(252,220,69,0.2)", color: YELLOW }}>
                          <Stars size={11} /> Beste Option aktuell
                        </span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <ScoreDots score={best.score} label={best.scoreLabel} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge icon={<Gauge size={12} />} text={`NOI-Yield ${pct(best.noiYield)}`} />
                    <Badge icon={<Banknote size={12} />} text={`CF mtl. ${eur(best.cashflowMonat)}`} />
                    <Badge icon={<TrendingUp size={12} />} text={`DSCR ${best.dscr ?? "–"}`} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT_DIM }}>
                    <Info size={13} />
                    <span>Modellwert {eur(best.wertAusCap)} · {best.valueGap >= 0 ? "Unter Wert" : "Über Wert"} {eur(Math.abs(best.valueGap))}</span>
                  </div>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ height: "100%", width: `${Math.round(best.score*100)}%`, background: `linear-gradient(90deg, ${scoreColor(best.scoreLabel)}, #60a5fa)`, transition: "width 0.3s" }} />
                </div>
              </>
            ) : (
              <div style={{ padding: "14px 20px", fontSize: 13, color: TEXT_DIM }}>Füge mindestens ein Szenario hinzu, um eine Empfehlung zu erhalten.</div>
            )}
          </div>
        </div>
      </div>

      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
    </div>
  );
}
