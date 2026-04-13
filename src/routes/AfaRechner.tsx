// src/routes/AfaRechner.tsx
// Propora v4 – AfA-Rechner (PRO): vollständig dark mode, kein recharts, Canvas-Charts

import React, { useEffect, useMemo, useRef, useState } from "react";
import PlanGuard from "@/components/PlanGuard";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Calculator } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ── Dark Theme Tokens ─────────────────────────────────────── */
const BG = "#0d1117";
const BG_CARD = "rgba(22,27,34,0.9)";
const BG_INPUT = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_HOVER = "rgba(255,255,255,0.15)";
const TEXT = "rgba(255,255,255,0.88)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";
const TEXT_DIM = "rgba(255,255,255,0.35)";
const YELLOW = "#FCDC45";
const ORANGE = "#ff914d";
const BLUE = "#1b2c47";

/* Chart-Farben */
const C_HAUPT = "#3b6bdb";
const C_MODS = "#FCDC45";
const C_SONDER = "#ff914d";

/* ── Utils ─────────────────────────────────────────────────── */
const eur0 = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/* ── Types ──────────────────────────────────────────────────── */
type AfAMethod = "linear" | "degressiv" | "kombiniert";

type Modernisierung = {
  id: string;
  title: string;
  amount: number;
  capitalize: boolean;
  method: AfAMethod;
  years?: number;
  ratePct?: number;
  proratOn?: boolean;
  startMonat?: number;
  startJahrOffset?: number;
};

type SonderPosten = {
  id: string;
  title: string;
  amount: number;
  years: number;
  proratOn?: boolean;
  startMonat?: number;
  startJahrOffset?: number;
};

type AfaInput = {
  kaufpreis: number;
  bodenwert: number;
  method: AfAMethod;
  years?: number;
  ratePct?: number;
  kombiYears?: number;
  kombiRatePct?: number;
  switchYears?: number;
  horizonYears: number;
  proratOn: boolean;
  anschaffungsMonat: number;
  modernisierungen: Modernisierung[];
  sonder: SonderPosten[];
  taxOn: boolean;
  marginalTaxPct: number;
  autoSwitchDegToLin: boolean;
};

type AfaYearRow = {
  yearIndex: number;
  kalenderjahr: number;
  afaSum: number;
  parts: {
    haupt: number;
    modernisierungen: { id: string; value: number }[];
    sonder: { id: string; value: number }[];
  };
  taxSaving: number;
};

/* ── Rechenlogik ────────────────────────────────────────────── */
function gebaeudeAnteil(kaufpreis: number, bodenwert: number) {
  return Math.max(0, kaufpreis - Math.max(0, bodenwert));
}
function afaLinear(amount: number, years: number) {
  if (amount <= 0 || years <= 0) return 0;
  return amount / years;
}
function afaDegressiv(amount: number, rate: number, t: number) {
  if (amount <= 0 || rate <= 0) return 0;
  return amount * rate * Math.pow(1 - rate, t - 1);
}
function distributeLinear(amount: number, years: number) {
  if (amount <= 0 || years <= 0) return [];
  const p = amount / years;
  return Array.from({ length: years }, () => p);
}
function monthsFactor(monat: number) {
  const m = clamp(Math.round(monat), 1, 12);
  return (12 - (m - 1)) / 12;
}
function rid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}

const DRAFT_KEY = "afa.rechner.v4";

/* ── Canvas Stacked Bar Chart ───────────────────────────────── */
function BarChartCanvas({ data }: {
  data: { name: string; haupt: number; mods: number; sond: number }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    const padL = 60, padR = 16, padT = 32, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxVal = Math.max(...data.map(d => d.haupt + d.mods + d.sond), 1);
    const barW = Math.max(4, chartW / data.length * 0.6);
    const gap = chartW / data.length;

    // Grid lines
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = padT + chartH - (i / gridCount) * chartH;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      // Y-label
      const val = (maxVal * i / gridCount);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? `${Math.round(val / 1000)}k` : String(Math.round(val)), padL - 6, y + 3);
    }

    // Bars
    data.forEach((d, i) => {
      const x = padL + i * gap + gap / 2 - barW / 2;
      const total = d.haupt + d.mods + d.sond;
      let y = padT + chartH;

      const segments = [
        { val: d.haupt, color: C_HAUPT },
        { val: d.mods, color: C_MODS },
        { val: d.sond, color: C_SONDER },
      ];

      segments.forEach(({ val, color }) => {
        if (val <= 0) return;
        const h = (val / maxVal) * chartH;
        y -= h;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, val === segments[segments.length - 1]?.val ? [3, 3, 0, 0] : 0);
        ctx.fill();
      });

      // X label
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(d.name, padL + i * gap + gap / 2, H - padB + 14);
    });
  }, [data]);

  return (
    <div style={{ width: "100%", height: 220, position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        {[["Haupt", C_HAUPT], ["Modernisierungen", C_MODS], ["Sonder-AfA", C_SONDER]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Canvas Donut Chart ─────────────────────────────────────── */
function DonutCanvas({ data }: { data: { name: string; value: number; color: string }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const S = 160;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, S, S);

    if (total <= 0) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, 60, 0, Math.PI * 2);
      ctx.arc(S / 2, S / 2, 35, 0, Math.PI * 2, true);
      ctx.fill();
      return;
    }

    let startAngle = -Math.PI / 2;
    data.forEach(({ value, color }) => {
      if (value <= 0) return;
      const sweep = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(S / 2, S / 2);
      ctx.arc(S / 2, S / 2, 62, startAngle, startAngle + sweep);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      startAngle += sweep;
    });

    // Center hole
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 38, 0, Math.PI * 2);
    ctx.fillStyle = BG_CARD;
    ctx.fill();

  }, [data, total]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <canvas ref={canvasRef} style={{ width: 160, height: 160 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {data.map(({ name, value, color }) => (
          <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>{name}</span>
            </div>
            <span style={{ fontSize: 12, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{eur0(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Export Dropdown ────────────────────────────────────────── */
function ExportDropdown({ onRun }: { onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(true);
  const [csv, setCsv] = useState(false);
  const [pdf, setPdf] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 10, fontSize: 13,
          background: BG_INPUT, border: `1px solid ${BORDER}`,
          color: TEXT, cursor: "pointer",
        }}
      >
        <Download size={14} /> Export
        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, opacity: 0.6 }}>
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.207l3.71-3.977a.75.75 0 111.08 1.04l-4.24 4.54a.75.75 0 01-1.08 0l-4.24-4.54a.75.75 0 01.02-1.06z" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{
              position: "absolute", right: 0, top: "calc(100% + 6px)",
              background: "#161b22", border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: 14, zIndex: 50, width: 220,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Formate</div>
            {[["JSON", json, setJson], ["CSV", csv, setCsv], ["PDF", pdf, setPdf]].map(([label, val, set]) => (
              <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: TEXT, cursor: "pointer" }}>
                <input type="checkbox" checked={val as boolean} onChange={e => (set as any)(e.target.checked)} />
                {label as string}
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={() => { onRun({ json: json || (!csv && !pdf), csv, pdf }); setOpen(false); }}
                style={{ flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, background: YELLOW, color: "#111", fontWeight: 600, border: "none", cursor: "pointer" }}>
                Export
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? YELLOW : TEXT, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

/* ── Mode Toggle ────────────────────────────────────────────── */
function ModeToggle({ mode, setMode }: { mode: "basic" | "pro"; setMode: (m: "basic" | "pro") => void }) {
  return (
    <div style={{ display: "inline-flex", borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
      {(["basic", "pro"] as const).map(m => (
        <button key={m} type="button" onClick={() => setMode(m)}
          style={{
            padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
            background: mode === m ? YELLOW : "transparent",
            color: mode === m ? "#111" : TEXT_MUTED,
            transition: "all 0.15s",
          }}>
          {m === "basic" ? "Einsteiger" : "Pro"}
        </button>
      ))}
    </div>
  );
}

/* ── Preset Picker ──────────────────────────────────────────── */
function PresetPicker({ presets, apply }: { presets: Record<string, Partial<AfaInput>>; apply: (p: Partial<AfaInput>) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {Object.keys(presets).map(k => (
        <button key={k} type="button" onClick={() => apply(presets[k])}
          style={{
            padding: "5px 12px", fontSize: 12, borderRadius: 20,
            background: BG_INPUT, border: `1px solid ${BORDER}`,
            color: TEXT_MUTED, cursor: "pointer",
          }}>
          {k}
        </button>
      ))}
    </div>
  );
}

/* ── Form Fields ────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, borderRadius: 10, padding: "0 12px",
  background: BG_INPUT, border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: 13, boxSizing: "border-box", outline: "none",
};
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginBottom: 5, display: "block" };

function NumberField({ label, value, onChange, step = 1, help, suffix }: {
  label: string; value: number; onChange: (n: number) => void;
  step?: number; help?: string; suffix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const raw = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const display = focused ? String(raw) : raw.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div>
      <label style={labelStyle}>{label}{help && <span title={help} style={{ marginLeft: 4, opacity: 0.5, cursor: "help" }}>ⓘ</span>}</label>
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

function PercentField({ label, value, onChange, step = 0.1, help }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; help?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}{help && <span title={help} style={{ marginLeft: 4, opacity: 0.5, cursor: "help" }}>ⓘ</span>}</label>
      <input style={inputStyle} type="number" step={step} inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type="text" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function SelectField<T extends string>({ label, value, options, onChange, help }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; help?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}{help && <span title={help} style={{ marginLeft: 4, opacity: 0.5, cursor: "help" }}>ⓘ</span>}</label>
      <select style={{ ...inputStyle, appearance: "none" }} value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Btn ────────────────────────────────────────────────────── */
function Btn({ label, onClick, variant = "primary", leftIcon }: {
  label: string; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; leftIcon?: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: YELLOW, color: "#111", border: "none" },
    secondary: { background: BG_INPUT, color: TEXT, border: `1px solid ${BORDER}` },
    ghost: { background: "transparent", color: TEXT_MUTED, border: `1px solid transparent` },
  };
  return (
    <button type="button" onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", ...styles[variant] }}>
      {leftIcon}
      {label}
    </button>
  );
}

/* ── Section Card ───────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, ...style }}>
      {children}
    </div>
  );
}

/* ── Update Helpers ─────────────────────────────────────────── */
function updateMod(id: string, patch: Partial<Modernisierung>, setInput: React.Dispatch<React.SetStateAction<AfaInput>>) {
  setInput(s => ({ ...s, modernisierungen: s.modernisierungen.map(m => m.id === id ? { ...m, ...patch } : m) }));
}
function updateSonder(id: string, patch: Partial<SonderPosten>, setInput: React.Dispatch<React.SetStateAction<AfaInput>>) {
  setInput(s => ({ ...s, sonder: s.sonder.map(x => x.id === id ? { ...x, ...patch } : x) }));
}

/* ── Modernisierungen Block ─────────────────────────────────── */
function ModernisierungenBlock({ input, setInput }: { input: AfaInput; setInput: React.Dispatch<React.SetStateAction<AfaInput>> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Modernisierungen / HK</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["Bad (10J)", { title: "Bad", amount: 10000, capitalize: true, method: "linear" as AfAMethod, years: 10, proratOn: true, startMonat: 3 }],
            ["Fenster (12J)", { title: "Fenster", amount: 12000, capitalize: true, method: "linear" as AfAMethod, years: 12, proratOn: true, startMonat: 4 }]
          ].map(([label, preset]) => (
            <button key={label as string} type="button"
              onClick={() => setInput(s => ({ ...s, modernisierungen: [...s.modernisierungen, { id: rid(), ...(preset as any) }] }))}
              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 8, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              {label as string}
            </button>
          ))}
          <Btn variant="secondary" label="+ Position"
            onClick={() => setInput(s => ({ ...s, modernisierungen: [...s.modernisierungen, { id: rid(), title: "Neu", amount: 5000, capitalize: true, method: "linear", years: 10, proratOn: true, startMonat: 7 }] }))} />
        </div>
      </div>

      {input.modernisierungen.map(m => (
        <div key={m.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            <TextField label="Titel" value={m.title} onChange={v => updateMod(m.id, { title: v }, setInput)} />
            <NumberField label="Betrag (€)" value={m.amount} onChange={v => updateMod(m.id, { amount: v }, setInput)} />
            <SelectField label="Methode" value={m.method}
              options={[{ value: "linear" as AfAMethod, label: "Linear" }, { value: "degressiv" as AfAMethod, label: "Degressiv" }, { value: "kombiniert" as AfAMethod, label: "Kombiniert" }]}
              onChange={v => updateMod(m.id, { method: v as AfAMethod }, setInput)} />
            {m.method === "linear" && <NumberField label="Jahre" value={m.years ?? 10} onChange={v => updateMod(m.id, { years: clamp(Math.round(v), 1, 100) }, setInput)} />}
            {m.method === "degressiv" && <PercentField label="Satz (%)" value={(m.ratePct ?? 0.05) * 100} onChange={p => updateMod(m.id, { ratePct: p / 100 }, setInput)} />}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>
                <input type="checkbox" checked={!!m.capitalize} onChange={e => updateMod(m.id, { capitalize: e.target.checked }, setInput)} />
                Kapitalisieren
              </label>
              {m.capitalize && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!m.proratOn} onChange={e => updateMod(m.id, { proratOn: e.target.checked }, setInput)} />
                  Pro-rata (Monat {m.startMonat ?? 1})
                </label>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={() => setInput(s => ({ ...s, modernisierungen: s.modernisierungen.filter(x => x.id !== m.id) }))}
                style={{ padding: "5px 10px", fontSize: 11, borderRadius: 8, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", cursor: "pointer" }}>
                Entfernen
              </button>
            </div>
          </div>
        </div>
      ))}

      {input.modernisierungen.length === 0 && (
        <p style={{ fontSize: 12, color: TEXT_DIM }}>Keine Positionen hinzugefügt.</p>
      )}
    </div>
  );
}

/* ── Sonder-AfA Block ───────────────────────────────────────── */
function SonderBlock({ input, setInput }: { input: AfaInput; setInput: React.Dispatch<React.SetStateAction<AfaInput>> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Sonder-AfA (linear verteilt)</span>
        <Btn variant="secondary" label="+ Posten"
          onClick={() => setInput(s => ({ ...s, sonder: [...s.sonder, { id: rid(), title: "Sonder", amount: 4000, years: 4, proratOn: true, startMonat: 5 }] }))} />
      </div>

      {input.sonder.map(p => (
        <div key={p.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            <TextField label="Titel" value={p.title} onChange={v => updateSonder(p.id, { title: v }, setInput)} />
            <NumberField label="Betrag (€)" value={p.amount} onChange={v => updateSonder(p.id, { amount: v }, setInput)} />
            <NumberField label="Jahre" value={p.years} onChange={v => updateSonder(p.id, { years: clamp(Math.round(v), 1, 100) }, setInput)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>
                <input type="checkbox" checked={!!p.proratOn} onChange={e => updateSonder(p.id, { proratOn: e.target.checked }, setInput)} />
                Pro-rata (Monat {p.startMonat ?? 1})
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={() => setInput(s => ({ ...s, sonder: s.sonder.filter(x => x.id !== p.id) }))}
                style={{ padding: "5px 10px", fontSize: 11, borderRadius: 8, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", cursor: "pointer" }}>
                Entfernen
              </button>
            </div>
          </div>
        </div>
      ))}

      {input.sonder.length === 0 && <p style={{ fontSize: 12, color: TEXT_DIM }}>Keine Sonder-AfA angesetzt.</p>}
    </div>
  );
}

/* ── Hauptkomponente ────────────────────────────────────────── */
export default function AfaRechner() {
  return (
    <PlanGuard required="pro">
      <AfaInner />
    </PlanGuard>
  );
}

function AfaInner() {
  const [mode, setMode] = useState<"basic" | "pro">("basic");
  const printRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState<AfaInput>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as AfaInput;
    } catch {}
    return {
      kaufpreis: 350_000, bodenwert: 70_000,
      method: "linear", years: 50, ratePct: 0.05,
      kombiYears: 5, kombiRatePct: 0.05, switchYears: 50,
      autoSwitchDegToLin: true, horizonYears: 10,
      proratOn: true, anschaffungsMonat: 7,
      modernisierungen: [{ id: rid(), title: "Bad-Modernisierung", amount: 15_000, capitalize: true, method: "linear", years: 10, proratOn: true, startMonat: 9, startJahrOffset: 0 }],
      sonder: [{ id: rid(), title: "Sonder-AfA Beispiel", amount: 10_000, years: 4, proratOn: true, startMonat: 3, startJahrOffset: 0 }],
      taxOn: true, marginalTaxPct: 0.35,
    };
  });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(input)); } catch {}
  }, [input]);

  const PRESETS: Record<string, Partial<AfaInput>> = {
    "Neubau 2015": { method: "linear", years: 50, proratOn: true, anschaffungsMonat: 7, modernisierungen: [], sonder: [] },
    "Altbau 1955": { method: "linear", years: 50, proratOn: true, anschaffungsMonat: 3, modernisierungen: [{ id: rid(), title: "Fenster", amount: 12_000, capitalize: true, method: "linear", years: 10, proratOn: true, startMonat: 4 }], sonder: [] },
    "Buy & Hold 30J": { method: "linear", years: 50, horizonYears: 30, proratOn: true, anschaffungsMonat: 6, sonder: [] },
    "Fix & Flip": { method: "degressiv", ratePct: 0.05, horizonYears: 5, proratOn: true, anschaffungsMonat: 2, modernisierungen: [{ id: rid(), title: "Küche", amount: 8_000, capitalize: true, method: "linear", years: 8, proratOn: true, startMonat: 3 }], sonder: [] },
  };

  const gebAnteil = useMemo(() => gebaeudeAnteil(input.kaufpreis, input.bodenwert), [input.kaufpreis, input.bodenwert]);
  const bodenFehler = input.bodenwert > input.kaufpreis;
  const proratY1Main = useMemo(() => (input.proratOn ? monthsFactor(input.anschaffungsMonat) : 1), [input.proratOn, input.anschaffungsMonat]);

  const out = useMemo<AfaYearRow[]>(() => {
    const H = clamp(Math.round(input.horizonYears), 1, 40);
    const baseYear = new Date().getFullYear();
    const mainPerYear: number[] = Array(H).fill(0);

    if (input.method === "linear") {
      const y = clamp(Math.round(input.years ?? 50), 1, 100);
      const pa = afaLinear(gebAnteil, y);
      for (let t = 0; t < H; t++) mainPerYear[t] = pa * (t === 0 ? proratY1Main : 1);
    } else if (input.method === "degressiv") {
      const r = Math.max(0, input.ratePct ?? 0.05);
      for (let t = 0; t < H; t++) mainPerYear[t] = afaDegressiv(gebAnteil, r, t + 1) * (t === 0 ? proratY1Main : 1);
    } else {
      const N = clamp(Math.round(input.kombiYears ?? 5), 1, 100);
      const r = Math.max(0, input.kombiRatePct ?? 0.05);
      const pa = afaLinear(gebAnteil, N);
      for (let t = 0; t < Math.min(H, N); t++) mainPerYear[t] = pa * (t === 0 ? proratY1Main : 1);
      const rest = Math.max(0, gebAnteil - pa * N);
      for (let t = N; t < H; t++) mainPerYear[t] = afaDegressiv(rest, r, t - N + 1);
    }

    const modMap: Record<string, number[]> = {};
    for (const m of input.modernisierungen) {
      const arr = Array(H).fill(0);
      const amount = m.capitalize ? m.amount : 0;
      if (amount > 0) {
        const f1 = m.proratOn ? monthsFactor(m.startMonat ?? 1) : 1;
        if (m.method === "linear") {
          const yrs = clamp(Math.round(m.years ?? 10), 1, 100);
          const pa = afaLinear(amount, yrs);
          for (let t = 0; t < Math.min(H, yrs); t++) arr[t] = pa * (t === 0 ? f1 : 1);
        } else if (m.method === "degressiv") {
          const r = Math.max(0, m.ratePct ?? 0.05);
          for (let t = 0; t < H; t++) arr[t] = afaDegressiv(amount, r, t + 1) * (t === 0 ? f1 : 1);
        } else {
          const N = clamp(Math.round(m.years ?? 5), 1, 100);
          const r = Math.max(0, m.ratePct ?? 0.05);
          const pa = afaLinear(amount, N);
          for (let t = 0; t < Math.min(H, N); t++) arr[t] = pa * (t === 0 ? f1 : 1);
          const rest = Math.max(0, amount - pa * N);
          for (let t = N; t < H; t++) arr[t] = afaDegressiv(rest, r, t - N + 1);
        }
      }
      modMap[m.id] = arr;
    }

    const sonderMap: Record<string, number[]> = {};
    for (const s of input.sonder) {
      const yrs = clamp(Math.round(s.years), 1, 100);
      const dist = distributeLinear(s.amount, yrs);
      const f1 = s.proratOn ? monthsFactor(s.startMonat ?? 1) : 1;
      const arr = Array(H).fill(0);
      for (let t = 0; t < Math.min(H, yrs); t++) arr[t] = (dist[t] ?? 0) * (t === 0 ? f1 : 1);
      sonderMap[s.id] = arr;
    }

    return Array.from({ length: H }, (_, i) => {
      const haupt = mainPerYear[i] ?? 0;
      const modernisierungen = Object.entries(modMap).map(([id, a]) => ({ id, value: a[i] ?? 0 }));
      const sonder = Object.entries(sonderMap).map(([id, a]) => ({ id, value: a[i] ?? 0 }));
      const sum = haupt + modernisierungen.reduce((s, v) => s + v.value, 0) + sonder.reduce((s, v) => s + v.value, 0);
      return {
        yearIndex: i + 1, kalenderjahr: baseYear + i, afaSum: sum,
        parts: { haupt, modernisierungen, sonder },
        taxSaving: input.taxOn ? sum * (input.marginalTaxPct ?? 0) : 0,
      };
    });
  }, [input, gebAnteil, proratY1Main]);

  const totalAfa = useMemo(() => out.reduce((s, r) => s + r.afaSum, 0), [out]);
  const totalTaxSave = useMemo(() => out.reduce((s, r) => s + r.taxSaving, 0), [out]);
  const y1 = out[0];

  const pieData = useMemo(() => {
    if (!y1) return [];
    const mods = y1.parts.modernisierungen.reduce((s, a) => s + a.value, 0);
    const sond = y1.parts.sonder.reduce((s, a) => s + a.value, 0);
    return [
      { name: "Haupt", value: Math.round(Math.max(0, y1.parts.haupt)), color: C_HAUPT },
      { name: "Modernisierungen", value: Math.round(Math.max(0, mods)), color: C_MODS },
      { name: "Sonder-AfA", value: Math.round(Math.max(0, sond)), color: C_SONDER },
    ];
  }, [y1]);

  const barData = useMemo(() => out.map(r => ({
    name: `Y${r.yearIndex}`,
    haupt: Math.round(r.parts.haupt),
    mods: Math.round(r.parts.modernisierungen.reduce((s, a) => s + a.value, 0)),
    sond: Math.round(r.parts.sonder.reduce((s, a) => s + a.value, 0)),
  })), [out]);

  /* Export */
  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "afa-config.json" });
    a.click(); URL.revokeObjectURL(a.href);
  }
  function exportCsv() {
    const header = ["Jahr", "Kalenderjahr", "AfA gesamt", "davon Haupt", "Modernisierungen", "Sonder", "Steuerersparnis"];
    const rows = out.map(r => [r.yearIndex, r.kalenderjahr, Math.round(r.afaSum), Math.round(r.parts.haupt),
      Math.round(r.parts.modernisierungen.reduce((s, a) => s + a.value, 0)),
      Math.round(r.parts.sonder.reduce((s, a) => s + a.value, 0)),
      Math.round(r.taxSaving)]);
    const csv = [header, ...rows].map(c => c.join(";")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: "afa-tabelle.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function exportPdf() {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#0d1117" });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const W = 555, imgH = (canvas.height * W) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 20, 20, W, imgH);
    pdf.save("afa-rechner.pdf");
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => { try { setInput(JSON.parse(String(r.result)) as AfaInput); } catch { alert("Ungültige Datei"); } };
    r.readAsText(file);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      <div ref={printRef} style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 80px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${BLUE}, ${ORANGE})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Calculator size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>AfA-Rechner</h1>
              <p style={{ fontSize: 13, color: TEXT_MUTED, margin: "3px 0 0" }}>Gebäudeanteil, Modernisierungen, Sonder-AfA – mit Pro-rata &amp; einfacher Steuerwirkung.</p>
              <p style={{ fontSize: 12, color: TEXT_DIM, margin: "4px 0 0", maxWidth: 600 }}>Trage Kaufpreis, Bodenwert und Maßnahmen ein – Tabellen, Diagramme und Steuerersparnis aktualisieren sich live.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <ModeToggle mode={mode} setMode={setMode} />
            <ExportDropdown onRun={opts => { if (opts.json) exportJson(); if (opts.csv) exportCsv(); if (opts.pdf) exportPdf(); }} />
            <label style={{ cursor: "pointer" }}>
              <input type="file" style={{ display: "none" }} accept="application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
              <Btn label="Import" leftIcon={<Download size={14} />} variant="secondary" />
            </label>
          </div>
        </div>

        {/* Onboarding */}
        <Card style={{ background: "rgba(252,220,69,0.05)", borderColor: "rgba(252,220,69,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: BLUE, display: "grid", placeItems: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>i</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Kurz erklärt</span>
            </div>
            <button type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); window.location.reload(); }}
              style={{ fontSize: 12, color: TEXT_MUTED, background: "transparent", border: `1px solid ${BORDER}`, padding: "4px 10px", borderRadius: 8, cursor: "pointer" }}>
              Zurücksetzen
            </button>
          </div>
          <ol style={{ paddingLeft: 20, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {["Trage Kaufpreis und Bodenwert ein (nur der Gebäudeanteil ist abschreibbar).", "Wähle die AfA-Methode (linear ist Standard).", "Optional: Füge Modernisierungen und Sonder-AfA hinzu."].map((t, i) => (
              <li key={i} style={{ fontSize: 13, color: TEXT_MUTED }}>{t}</li>
            ))}
          </ol>
          <PresetPicker presets={PRESETS} apply={p => setInput(s => ({ ...s, ...p }))} />
        </Card>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          <KpiCard label="Gebäudeanteil" value={eur0(gebAnteil)} />
          <KpiCard label="AfA Jahr 1" value={eur0(Math.round(y1?.afaSum ?? 0))} />
          <KpiCard label={`Summe AfA Y1–Y${input.horizonYears}`} value={eur0(Math.round(totalAfa))} />
          <KpiCard label="Steuerersparnis gesamt" value={eur0(Math.round(totalTaxSave))} accent />
        </div>

        {/* Objektbasis + Methode */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: TEXT }}>Objektbasis</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            <NumberField label="Kaufpreis (€)" value={input.kaufpreis} onChange={v => setInput(s => ({ ...s, kaufpreis: v }))} help="Gesamtkaufpreis inkl. Grundstück" />
            <NumberField label="Bodenwert (€, nicht abschreibbar)" value={input.bodenwert} onChange={v => setInput(s => ({ ...s, bodenwert: v }))} help={bodenFehler ? "Bitte prüfen: Bodenwert > Kaufpreis" : "Boden ist nicht abschreibbar."} />
            <NumberField label="Horizont (Jahre)" value={input.horizonYears} onChange={v => setInput(s => ({ ...s, horizonYears: clamp(Math.round(v), 1, 40) }))} />
          </div>

          <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 18, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: TEXT }}>AfA-Methode</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              <SelectField label="Methode" value={input.method}
                options={[{ value: "linear" as AfAMethod, label: "Linear" }, { value: "degressiv" as AfAMethod, label: "Degressiv" }, { value: "kombiniert" as AfAMethod, label: "Kombiniert" }]}
                onChange={v => setInput(s => ({ ...s, method: v as AfAMethod }))} help="Grundprinzip der Abschreibung" />
              {input.method === "linear" && <NumberField label="Nutzungsdauer (Jahre)" value={input.years ?? 50} onChange={v => setInput(s => ({ ...s, years: clamp(Math.round(v), 1, 100) }))} />}
              {input.method === "degressiv" && <PercentField label="Degressiver Satz (%)" value={(input.ratePct ?? 0.05) * 100} onChange={p => setInput(s => ({ ...s, ratePct: p / 100 }))} step={0.1} />}
              {input.method === "kombiniert" && <>
                <NumberField label="Lineare Vorphase (Jahre)" value={input.kombiYears ?? 5} onChange={v => setInput(s => ({ ...s, kombiYears: clamp(Math.round(v), 1, 100) }))} />
                <PercentField label="Degressiver Satz danach (%)" value={(input.kombiRatePct ?? 0.05) * 100} onChange={p => setInput(s => ({ ...s, kombiRatePct: p / 100 }))} step={0.1} />
              </>}

              <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: TEXT_MUTED, cursor: "pointer", marginBottom: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={input.proratOn} onChange={e => setInput(s => ({ ...s, proratOn: e.target.checked }))} />
                    Pro-rata im Anschaffungsjahr
                  </span>
                  <span style={{ fontSize: 11, color: TEXT_DIM }}>{input.proratOn ? `${Math.round(proratY1Main * 12)} Monate` : "aus"}</span>
                </label>
                {input.proratOn && (
                  <>
                    <NumberField label="Anschaffungsmonat (1–12)" value={input.anschaffungsMonat}
                      onChange={v => setInput(s => ({ ...s, anschaffungsMonat: clamp(Math.round(v), 1, 12) }))} />
                    <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>AfA Y1 = Jahres-AfA × {Math.round(proratY1Main * 12)}/12</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Modernisierungen */}
        {mode === "pro" ? (
          <Card><ModernisierungenBlock input={input} setInput={setInput} /></Card>
        ) : (
          <details style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: TEXT }}>▶ Modernisierungen / HK (optional)</summary>
            <div style={{ marginTop: 16 }}><ModernisierungenBlock input={input} setInput={setInput} /></div>
          </details>
        )}

        {/* Sonder-AfA */}
        {mode === "pro" ? (
          <Card><SonderBlock input={input} setInput={setInput} /></Card>
        ) : (
          <details style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: TEXT }}>▶ Sonder-AfA (optional)</summary>
            <div style={{ marginTop: 16 }}><SonderBlock input={input} setInput={setInput} /></div>
          </details>
        )}

        {/* Steuerwirkung */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Steuerwirkung (vereinfacht)</span>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>
              <input type="checkbox" checked={input.taxOn} onChange={e => setInput(s => ({ ...s, taxOn: e.target.checked }))} />
              berücksichtigen
            </label>
          </div>
          {input.taxOn && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              <PercentField label="Grenzsteuersatz (%)" value={input.marginalTaxPct * 100}
                onChange={p => setInput(s => ({ ...s, marginalTaxPct: clamp(p, 0, 100) / 100 }))} step={0.5}
                help="Persönlicher Steuersatz am Rand (vereinfachte Annahme)." />
              <KpiCard label="Y1 Steuerersparnis" value={eur0(Math.round(y1?.taxSaving ?? 0))} />
              <KpiCard label={`Summe Y1–Y${input.horizonYears}`} value={eur0(Math.round(totalTaxSave))} accent />
            </div>
          )}
        </Card>

        {/* Charts */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: TEXT }}>AfA-Zeitverlauf (gestapelt nach Quellen)</div>
          <BarChartCanvas data={barData} />
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Tabelle */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: TEXT }}>AfA (Y1–Y{input.horizonYears}) – Tabelle</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                <thead>
                  <tr>
                    {["Jahr", "Kalender", "AfA ges.", "Haupt", "Mod.", "Sonder", "Steuer"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px 8px", fontSize: 11, color: TEXT_MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {out.map(r => {
                    const mods = r.parts.modernisierungen.reduce((s, a) => s + a.value, 0);
                    const sond = r.parts.sonder.reduce((s, a) => s + a.value, 0);
                    return (
                      <tr key={r.yearIndex} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <td style={{ padding: "6px 8px", color: TEXT_MUTED }}>{r.yearIndex}</td>
                        <td style={{ padding: "6px 8px", color: TEXT_MUTED }}>{r.kalenderjahr}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: TEXT }}>{eur0(Math.round(r.afaSum))}</td>
                        <td style={{ padding: "6px 8px", color: TEXT_MUTED }}>{eur0(Math.round(r.parts.haupt))}</td>
                        <td style={{ padding: "6px 8px", color: TEXT_MUTED }}>{eur0(Math.round(mods))}</td>
                        <td style={{ padding: "6px 8px", color: TEXT_MUTED }}>{eur0(Math.round(sond))}</td>
                        <td style={{ padding: "6px 8px", color: YELLOW }}>{eur0(Math.round(r.taxSaving))}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td colSpan={2} style={{ padding: "8px 8px", fontWeight: 700, color: TEXT }}>Summe</td>
                    <td style={{ padding: "8px 8px", fontWeight: 700, color: TEXT }}>{eur0(Math.round(totalAfa))}</td>
                    <td colSpan={3}></td>
                    <td style={{ padding: "8px 8px", fontWeight: 700, color: YELLOW }}>{eur0(Math.round(totalTaxSave))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Donut */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: TEXT }}>Split Jahr 1</div>
            <DonutCanvas data={pieData} />
          </Card>
        </div>

        <p style={{ fontSize: 11, color: TEXT_DIM }}>
          Hinweis: Vereinfachtes Modell. Keine Steuer-/Rechtsberatung. Detailregeln (AfA-Sätze, Umqualifizierung Erhaltungs-/HK etc.) sind bewusst vereinfacht.
        </p>
      </div>
    </div>
  );
}
