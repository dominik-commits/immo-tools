// Abschnitt 1/3 - Imports, UI-Atoms, Helfer & Kern-Berechnung

// src/routes/MixedUseCheck.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Landmark,
  Gauge,
  Banknote,
  Sigma,
  TrendingUp,
  Info,
  RefreshCw,
  Download,
  Upload,
  Chrome,
  Building2,
  Factory,
  ChevronDown,
} from "lucide-react";
// recharts removed
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import PlanGuard from "@/components/PlanGuard";
import { OnboardingWizard } from "../components/OnboardingWizard";
import { SaveToPortfolioButton } from "../components/SaveToPortfolioButton";
import { downloadPdfExport } from "../utils/downloadPdfExport";
import { useUserPlan, isPro } from "../hooks/useUserPlan";
import { useMixedProAnalysis } from "../hooks/useMixedProAnalysis";
import { buildProjection10y, buildNarrativeTeaser, buildProjectionTeaserContinuation, type MixedProInput } from "../core/mixedCalc";
import { ProGate } from "../components/ProGate";
import { NarrativeTeaser } from "../components/NarrativeTeaser";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { eur, pct } from "../core/calcs";
import html2canvas from "html2canvas";
import { Share2, MapPin } from "lucide-react";

/* ----------------------------------------------------------------
 * BRAND / STYLE (an MFH-Check angepasst)
 * ---------------------------------------------------------------- */

const BRAND = "#1b2c47";
const CTA = "#ffde59";
const SURFACE = "#F7F7FA";
const SURFACE_ALT = "#EAEAEE";

// Generische Beispieltexte/-daten für den geblurrten ProGate-Platzhalter (Free-User).
// Bewusst ohne Bezug zu den echten Eingaben des Nutzers -- nur Illustration/Deko,
// niemals eine echte PRO-Antwort (CSS-Blur ist keine Sicherheitsgrenze).
const PLACEHOLDER_NARRATIVE_FILLER =
  "spiel mit der Spielwiese verschiedene Szenarien durch, um Rendite, Cashflow und Wertentwicklung im Detail zu optimieren.";
const PLACEHOLDER_MARKET_COMPARISON =
  "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für gemischt genutzte Objekte (ca. 4–6 %).";
const PLACEHOLDER_ETF = { immoWert10y: 240_000 };
const PLACEHOLDER_SCORE_BREAKDOWN = {
  noiYieldScore: 0.6, dscrScore: 0.65, valueGapScore: 0.5, cashflowScore: 0.55,
  weights: { noiYield: 0.34, dscr: 0.28, valueGap: 0.24, cashflow: 0.14 },
};

/* ---------------- Kleine UI-Atoms ---------------- */

function InfoBubble({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center ml-2 align-middle"
      title={text}
      aria-label={text}
    >
      <Info className="h-4 w-4 text-gray-400" />
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 bg-card ${className}`}>
      {children}
    </div>
  );
}

function Badge({
  icon,
  text,
  hint,
}: {
  icon: React.ReactNode;
  text: string;
  hint?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card shadow-sm"
      title={hint}
    >
      {icon} {text}
    </span>
  );
}

function InputBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-yellow-50 border-yellow-200 text-yellow-700">
      EINGABE
    </span>
  );
}

function NumberField({
  label, value, onChange, step = 1, help, suffix, placeholder,
}: {
  label: string; value: number; onChange: (n: number) => void;
  step?: number; help?: string; suffix?: string; placeholder?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</div>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${focused ? "rgba(252,220,69,0.4)" : "rgba(255,255,255,0.08)"}`, color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type="text" inputMode="decimal"
          value={displayVal} placeholder={focused ? formattedValue : (placeholder ?? "")}
          onFocus={() => { setFocused(true); setDraft(""); }}
          onBlur={() => { setFocused(false); if (draft !== null && draft.trim() !== "") { const p = parseFloat(draft.replace(/\./g, "").replace(",", ".")); if (Number.isFinite(p)) onChange(p); } setDraft(null); }}
          onChange={(e) => { const r = e.target.value; setDraft(r); if (r.trim() !== "") { const p = parseFloat(r.replace(/\./g, "").replace(",", ".")); if (Number.isFinite(p)) onChange(p); } }}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        {suffix && <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  step = 0.001,
  min = 0,
  max = 0.95,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={(min ?? 0) * 100}
          max={(max ?? 0.95) * 100}
          step={step ? step * 100 : 0.1}
          value={(value * 100).toFixed(2).replace(/\.?0+$/, "")}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
          className="w-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, flexShrink: 0 }}>%</span>
      </div>
    </label>
  );
}

function ScoreDonut({ scorePct, scoreColor, label, size = 42 }: { scorePct: number; scoreColor: string; label: string; size?: number; }) {
  const r = size * 0.9; const circ = 2 * Math.PI * r; const dash = Math.max(0, Math.min(scorePct, 100)) * circ / 100;
  return (
    <div style={{ position: "relative", width: size * 2, height: size * 2 }}>
      <svg width={size * 2} height={size * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size} cy={size} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={Math.round(size * 0.18)} />
        <circle cx={size} cy={size} r={r} fill="none" stroke={scoreColor} strokeWidth={Math.round(size * 0.18)} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: size * 0.45, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{scorePct}%</div>
        <div style={{ fontSize: size * 0.2, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function signedPct(x: number) {
  const v = Math.round(x * 100);
  return (x > 0 ? "+" : "") + v + "%";
}
function ts() {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function useClickOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = React.useRef<T | null>(null);
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);
  return ref;
}

function ExportDropdown({
  onRun,
}: {
  onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void;
}) {
  const [json, setJson] = React.useState(true);
  const [csv, setCsv] = React.useState(false);
  const [pdf, setPdf] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  function run() {
    if (!json && !csv && !pdf) onRun({ json: true, csv: false, pdf: false });
    else onRun({ json, csv, pdf });
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Download className="h-4 w-4" /> Export <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 220, background: "#161b22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Formate wählen</div>
          {[["JSON", json, setJson], ["CSV", csv, setCsv], ["PDF", pdf, setPdf]].map(([label, val, set]) => (
            <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
              <input type="checkbox" checked={val as boolean} onChange={e => (set as any)(e.target.checked)} />{label as string}
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "6px", borderRadius: 8, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Abbrechen</button>
            <button onClick={run} style={{ flex: 1, padding: "6px", borderRadius: 8, fontSize: 12, background: "#FCDC45", color: "#111", fontWeight: 600, border: "none", cursor: "pointer" }}>Export</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Kern-Berechnung (Mixed) ---------------- */
/** Liefert Kern-Metriken f-r gemischt genutzte Objekte. */
function calcMixed(input: {
  kaufpreis: number;
  // NK
  nkPct: number;
  // Finanzierung
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  tilgungPct: number;
  // Segment Wohnen
  wFl: number;
  wRentM2: number;
  wLeer: number;
  wOpexBrutto: number;
  wCap: number;
  // Segment Gewerbe
  gFl: number;
  gRentM2: number;
  gLeer: number;
  gOpexBrutto: number;
  gCap: number;
}) {
  const grossW = input.wFl * input.wRentM2 * 12;
  const effW = grossW * (1 - input.wLeer);
  const opexW = grossW * input.wOpexBrutto;
  const noiW = effW - opexW;

  const grossG = input.gFl * input.gRentM2 * 12;
  const effG = grossG * (1 - input.gLeer);
  const opexG = grossG * input.gOpexBrutto;
  const noiG = effG - opexG;

  const noi = noiW + noiG;

  const wertW = input.wCap > 0 ? noiW / input.wCap : 0;
  const wertG = input.gCap > 0 ? noiG / input.gCap : 0;
  const wertAusCap = wertW + wertG;

  const loan = input.financingOn ? input.kaufpreis * input.ltvPct : 0;
  const annu = input.financingOn ? loan * (input.zinsPct + input.tilgungPct) : 0;

  const cfYear = noi - annu;
  const cashflowMonat = cfYear / 12;

  const dscr = input.financingOn ? (annu > 0 ? noi / annu : null) : null;
  const noiYield = input.kaufpreis > 0 ? noi / input.kaufpreis : 0;
  const valueGapPct =
    input.kaufpreis > 0
      ? (wertAusCap - input.kaufpreis) / input.kaufpreis
      : 0;

  // Score: 0..1 basierend auf 4 S-ulen (NOI-Yield, DSCR, ValueGap, CF>=0)
  const sNoi = Math.max(0, Math.min(1, (noiYield - 0.035) / (0.065 - 0.035))); // 3.5%..6.5%
  const sDscr =
    dscr == null
      ? 0.6
      : Math.max(0, Math.min(1, (dscr - 1.0) / (1.6 - 1.0))); // 1.0..1.6
  const sGap = Math.max(
    0,
    Math.min(1, (valueGapPct - -0.05) / (0.1 - -0.05))
  ); // -5%..+10%
  const sCf = Math.max(
    0,
    Math.min(1, (cashflowMonat - -200) / (300 - -200))
  ); // -200..+300 mtl.
  const score = Math.max(
    0,
    Math.min(
      1,
      0.34 * sNoi + 0.28 * sDscr + 0.24 * sGap + 0.14 * sCf
    )
  );

  const scoreLabel: "BUY" | "CHECK" | "NO" =
    score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";

  return {
    grossW,
    effW,
    opexW,
    noiW,
    grossG,
    effG,
    opexG,
    noiG,
    noi,
    wertW,
    wertG,
    wertAusCap,
    loan,
    annu,
    dscr,
    noiYield,
    valueGapPct,
    cashflowMonat,
    score,
    scoreLabel,
  };
}

/** Break-even Kaufpreis (CF=0) via Bisection */
function breakEvenPriceForCashflowZeroMixed(base: {
  kaufpreis: number;
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  tilgungPct: number;
  grossW: number;
  effW: number;
  opexW: number;
  grossG: number;
  effG: number;
  opexG: number;
}) {
  if (
    !base.financingOn ||
    base.ltvPct <= 0 ||
    base.zinsPct + base.tilgungPct <= 0
  )
    return null;
  const eff = base.effW + base.effG;
  const opex = base.opexW + base.opexG;
  const cfAt = (price: number) => {
    const loan = price * base.ltvPct;
    const annu = loan * (base.zinsPct + base.tilgungPct);
    return (eff - opex - annu) / 12;
  };
  let low = 0,
    high = Math.max(1, base.kaufpreis),
    cfH = cfAt(high),
    guard = 0;
  while (cfH > 0 && high < base.kaufpreis * 100 && guard < 50) {
    high *= 1.5;
    cfH = cfAt(high);
    guard++;
  }
  if (cfH > 0) return Math.round(high);
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const cf = cfAt(mid);
    if (cf >= 0) low = mid;
    else high = mid;
  }
  return Math.round((low + high) / 2);
}

/** Ben-tigter Mietfaktor k auf beide Mieten (W+G gleicher Multiplikator) f-r CF=0 */
function breakEvenRentMultiplierForCashflowZeroMixed(base: {
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  tilgungPct: number;
  wFl: number;
  wRentM2: number;
  wLeer: number;
  wOpexBrutto: number;
  gFl: number;
  gRentM2: number;
  gLeer: number;
  gOpexBrutto: number;
  kaufpreis: number;
}) {
  if (
    !base.financingOn ||
    base.ltvPct <= 0 ||
    base.zinsPct + base.tilgungPct <= 0
  )
    return 1;
  const loan = base.kaufpreis * base.ltvPct;
  const annu = loan * (base.zinsPct + base.tilgungPct);
  const cfAt = (k: number) => {
    const grossW = base.wFl * (base.wRentM2 * k) * 12;
    const effW = grossW * (1 - base.wLeer);
    const opexW = grossW * base.wOpexBrutto;
    const grossG = base.gFl * (base.gRentM2 * k) * 12;
    const effG = grossG * (1 - base.gLeer);
    const opexG = grossG * base.gOpexBrutto;
    const noi = effW - opexW + (effG - opexG);
    return noi - annu;
  };
  // Bisection on k in [0.5 .. 2.5]
  let low = 0.5,
    high = 2.5;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const cf = cfAt(mid);
    if (cf >= 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}
// Abschnitt 2/3 - Hauptkomponente, State, Layout, Auswertung

/* ---------------- Hauptkomponente (PRO) ---------------- */

function AnimatedValue({ value, style }: { value: string; style?: React.CSSProperties }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6, filter: "blur(2px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ display: "inline-block", ...style }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

function useCountUp(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const from = fromRef.current;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return display;
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  const dots = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 55 + Math.random() * 35;
        const colors = ["#4ade80", "#FCDC45", "#60a5fa", "#f472b6"];
        return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: colors[i % colors.length], size: 4 + Math.random() * 4 };
      }),
    []
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {dots.map((d) => (
        <motion.span
          key={d.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: d.x, y: d.y, opacity: 0, scale: 1 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          style={{ position: "absolute", left: "50%", top: "50%", width: d.size, height: d.size, borderRadius: "50%", background: d.color, marginLeft: -d.size / 2, marginTop: -d.size / 2 }}
        />
      ))}
    </div>
  );
}

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.09, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

function TourOverlay({
  targetRef, step, total, title, text, onNext, onSkip,
}: {
  targetRef: React.RefObject<HTMLElement>;
  step: number;
  total: number;
  title: string;
  text: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    function measure() {
      if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [targetRef, step]);
  if (!rect) return null;
  const pad = 8;
  const tooltipTop = rect.bottom + 14;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div style={{ position: "fixed", top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 14, border: "2px solid #FCDC45", boxShadow: "0 0 0 9999px rgba(5,8,14,0.8)", pointerEvents: "none", transition: "all 0.25s ease-out" }} />
      <div style={{ position: "fixed", top: Math.min(tooltipTop, window.innerHeight - 160), left: Math.max(16, Math.min(rect.left, window.innerWidth - 316)), width: 300, background: "#161b22", border: "1px solid rgba(252,220,69,0.3)", borderRadius: 14, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#FCDC45", letterSpacing: "0.06em", marginBottom: 6 }}>SCHRITT {step + 1}/{total}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 14 }}>{text}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", padding: 0 }}>Tour beenden</button>
          <button onClick={onNext} style={{ background: "#FCDC45", border: "none", borderRadius: 8, padding: "7px 14px", color: "#0d1117", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {step + 1 < total ? "Weiter" : "Fertig"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const short = text.length > 90;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
        {expanded || !short ? text : text.slice(0, 90) + "-"}
      </div>
      {short && (
        <button onClick={() => setExpanded(v => !v)}
          style={{ marginTop: 4, fontSize: 10, color: "rgba(252,220,69,0.7)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {expanded ? "- Weniger" : "- Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

type ViewMode = "einfach" | "erweitert";

export default function MixedUseCheck() {
  return (
    <PlanGuard required="any">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  const { user: clerkUser } = useUser();
  const { plan } = useUserPlan();
  const investorName = clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || "Propora-Nutzer";
  const [adresse, setAdresse] = React.useState("");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const DRAFT_KEY = "mixeduse.v1";

  // Kaufpreis & NK
  const MODE_KEY = "mixed.mode.v1";
  const [mode, setMode] = React.useState<ViewMode>(() => {
    try { const raw = localStorage.getItem(MODE_KEY); return raw === "erweitert" ? "erweitert" : "einfach"; }
    catch { return "einfach"; }
  });
  React.useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);

  const [kaufpreis, setKaufpreis] = React.useState(2_400_000);
  const [nkGrEStPct, setNkGrEStPct] = React.useState(0.065);
  const [nkNotarPct, setNkNotarPct] = React.useState(0.01);
  const [nkGrundbuchPct, setNkGrundbuchPct] = React.useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = React.useState(0);
  const [nkSonstPct, setNkSonstPct] = React.useState(0.005);
  const nkPct =
    nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // Finanzierung
  const [financingOn, setFinancingOn] = React.useState(true);
  const [ltvPct, setLtvPct] = React.useState(0.5);
  const [zinsPct, setZinsPct] = React.useState(0.041);
  const [tilgungPct, setTilgungPct] = React.useState(0.02);

  // Segment Wohnen
  const [wFl, setWFl] = React.useState(750);
  const [wRentM2, setWRentM2] = React.useState(13);
  const [wLeer, setWLeer] = React.useState(0.06);
  const [wOpexBrutto, setWOpexBrutto] = React.useState(0.25);
  const [wCap, setWCap] = React.useState(0.055);

  // Segment Gewerbe
  const [gFl, setGFl] = React.useState(450);
  const [gRentM2, setGRentM2] = React.useState(20);
  const [gLeer, setGLeer] = React.useState(0.1);
  const [gOpexBrutto, setGOpexBrutto] = React.useState(0.3);
  const [gCap, setGCap] = React.useState(0.065);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = React.useState(0);
  const [wRentAdjPct, setWRentAdjPct] = React.useState(0);
  const [gRentAdjPct, setGRentAdjPct] = React.useState(0);
  const [applyAdjustments, setApplyAdjustments] = React.useState(true);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfExporting, setPdfExporting] = React.useState(false);
  const { getToken } = useAuth();

  const isBeispiel = !adresse && kaufpreis === 2_400_000;
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // 3D-Tilt auf der Ergebnis-Karte
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  };
  const handleCardMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Teilbare Ergebnis-Karte (Bild-Export)
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  async function shareResult() {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, { scale: 2, backgroundColor: "#0a1628" });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const file = new File([blob], "propora-ergebnis.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "PROPORA Analyse" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "propora-ergebnis.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // Export ist Nice-to-have, kein kritischer Pfad
    } finally {
      setSharing(false);
    }
  }

  // Geführte Kurz-Tour
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourTabsRef = useRef<HTMLDivElement>(null);
  const tourScoreRef = useRef<HTMLDivElement>(null);
  const tourSpielwieseRef = useRef<HTMLDivElement>(null);
  const tourShareRef = useRef<HTMLButtonElement>(null);
  const tourSteps = [
    { ref: tourTabsRef, title: "Deine Eingaben", text: "Kaufpreis, Wohnanteil, Gewerbeanteil und Finanzierung sind Tabs — du kannst frei zwischen ihnen wechseln, ohne zu scrollen." },
    { ref: tourScoreRef, title: "Dein Ergebnis, live", text: "Score und Empfehlung aktualisieren sich sofort bei jeder Eingabe, egal in welchem Tab du gerade bist." },
    { ref: tourSpielwieseRef, title: "Spielwiese", text: "Passe Kaufpreis und Mieten beider Segmente an, um Was-wäre-wenn-Szenarien durchzuspielen — ohne deine echten Werte zu verändern." },
    { ref: tourShareRef, title: "Ergebnis teilen", text: "Ein Klick erstellt eine Bild-Karte deines Ergebnisses zum Teilen oder Speichern." },
  ] as const;

  // Adress-Autovervollständigung (OpenStreetMap Nominatim, kein API-Key nötig)
  type AddressSuggestion = { label: string; lat: string; lon: string };
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: string; lon: string } | null>(null);
  const addressBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (adresse.trim().length < 5) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    setSuggestLoading(true);
    const t = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=de&limit=5&q=${encodeURIComponent(adresse)}`,
        { signal: controller.signal }
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) => {
          const suggestions: AddressSuggestion[] = (data || [])
            .filter((d) => d?.address?.postcode)
            .map((d) => {
              const a = d.address;
              const street = [a.road, a.house_number].filter(Boolean).join(" ");
              const city = a.city || a.town || a.village || a.municipality || "";
              return { label: [street, `${a.postcode} ${city}`].filter(Boolean).join(", "), lat: d.lat, lon: d.lon };
            });
          const seen = new Set<string>();
          setAddressSuggestions(suggestions.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true))));
        })
        .catch(() => {})
        .finally(() => setSuggestLoading(false));
    }, 500);
    return () => { clearTimeout(t); controller.abort(); };
  }, [adresse]);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);


  // Persistenz laden
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      setKaufpreis(d.kaufpreis ?? 2_400_000);
      setNkGrEStPct(d.nkGrEStPct ?? 0.065);
      setNkNotarPct(d.nkNotarPct ?? 0.01);
      setNkGrundbuchPct(d.nkGrundbuchPct ?? 0.005);
      setNkMaklerPct(d.nkMaklerPct ?? 0);
      setNkSonstPct(d.nkSonstPct ?? 0.005);

      setFinancingOn(d.financingOn ?? true);
      setLtvPct(d.ltvPct ?? 0.75);
      setZinsPct(d.zinsPct ?? 0.041);
      setTilgungPct(d.tilgungPct ?? 0.02);

      setWFl(d.wFl ?? 750);
      setWRentM2(d.wRentM2 ?? 11.8);
      setWLeer(d.wLeer ?? 0.06);
      setWOpexBrutto(d.wOpexBrutto ?? 0.25);
      setWCap(d.wCap ?? 0.055);

      setGFl(d.gFl ?? 450);
      setGRentM2(d.gRentM2 ?? 16.5);
      setGLeer(d.gLeer ?? 0.1);
      setGOpexBrutto(d.gOpexBrutto ?? 0.3);
      setGCap(d.gCap ?? 0.065);

      setPriceAdjPct(d.priceAdjPct ?? 0);
      setWRentAdjPct(d.wRentAdjPct ?? 0);
      setGRentAdjPct(d.gRentAdjPct ?? 0);
      setApplyAdjustments(d.applyAdjustments ?? true);
    } catch {
      // ignore
    }
  }, []);

  // Persistenz speichern
  React.useEffect(() => {
    const data = {
      kaufpreis,
      nkGrEStPct,
      nkNotarPct,
      nkGrundbuchPct,
      nkMaklerPct,
      nkSonstPct,
      financingOn,
      ltvPct,
      zinsPct,
      tilgungPct,
      wFl,
      wRentM2,
      wLeer,
      wOpexBrutto,
      wCap,
      gFl,
      gRentM2,
      gLeer,
      gOpexBrutto,
      gCap,
      priceAdjPct,
      wRentAdjPct,
      gRentAdjPct,
      applyAdjustments,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [
    kaufpreis,
    nkGrEStPct,
    nkNotarPct,
    nkGrundbuchPct,
    nkMaklerPct,
    nkSonstPct,
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
    wFl,
    wRentM2,
    wLeer,
    wOpexBrutto,
    wCap,
    gFl,
    gRentM2,
    gLeer,
    gOpexBrutto,
    gCap,
    priceAdjPct,
    wRentAdjPct,
    gRentAdjPct,
    applyAdjustments,
  ]);

  // Eingaben (evtl. angepasst)
  const adjPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const adjWRent = wRentM2 * (1 + wRentAdjPct);
  const adjGRent = gRentM2 * (1 + gRentAdjPct);

  const inUse = {
    kaufpreis: applyAdjustments ? adjPrice : kaufpreis,
    nkPct,
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
    wFl,
    wRentM2: applyAdjustments ? adjWRent : wRentM2,
    wLeer,
    wOpexBrutto,
    wCap,
    gFl,
    gRentM2: applyAdjustments ? adjGRent : gRentM2,
    gLeer,
    gOpexBrutto,
    gCap,
  };

  const out = React.useMemo(() => calcMixed(inUse), [JSON.stringify(inUse)]);
  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";
  const scorePct = Math.round(out.score * 100);
  const scoreColor =
    out.score >= 0.7 ? "#16a34a" : out.score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Monatsdetails
  const monthlyEffRent = (out.effW + out.effG) / 12;
  const monthlyOpex = (out.opexW + out.opexG) / 12;
  const monthlyInterest = inUse.financingOn ? (out.loan * zinsPct) / 12 : 0;
  const monthlyPrincipal = inUse.financingOn ? (out.loan * tilgungPct) / 12 : 0;

  // Wert-Gap
  const valueGap = Math.round(out.wertAusCap - inUse.kaufpreis);
  const gapPositive = valueGap >= 0;

  // Free: nur Jahr 1-2 lokal sichtbar. PRO: Score-Breakdown, Handlungsempfehlung
  // (narrative), volle 10J-Projektion und ETF-Vergleich kommen ausschließlich
  // vom Server (siehe /api/analyze/pro, type: "mixed"). Für Free-User wird der Call gar
  // nicht erst ausgelöst.
  const projectionPreview = React.useMemo(
    () =>
      buildProjection10y({
        years: 2,
        grossW0: out.grossW, grossG0: out.grossG, opexW0: out.opexW, opexG0: out.opexG,
        wLeer, gLeer, kaufpreis: inUse.kaufpreis, financingOn: inUse.financingOn,
        zinsPct, tilgungPct, loan: out.loan,
      }),
    [JSON.stringify({ out, inUse, zinsPct, tilgungPct, wLeer, gLeer })]
  );

  // NK-Beträge
  const nkSum = Math.round(inUse.kaufpreis * nkPct);
  const nkSplits = {
    grESt: Math.round(inUse.kaufpreis * nkGrEStPct),
    notar: Math.round(inUse.kaufpreis * nkNotarPct),
    gb: Math.round(inUse.kaufpreis * nkGrundbuchPct),
    makler: Math.round(inUse.kaufpreis * nkMaklerPct),
    sonst: Math.round(inUse.kaufpreis * nkSonstPct),
  };

  // Break-even
  const bePrice = breakEvenPriceForCashflowZeroMixed({
    kaufpreis: inUse.kaufpreis,
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
    grossW: out.grossW,
    effW: out.effW,
    opexW: out.opexW,
    grossG: out.grossG,
    effG: out.effG,
    opexG: out.opexG,
  });
  const beRentK = breakEvenRentMultiplierForCashflowZeroMixed({
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
    wFl,
    wRentM2: inUse.wRentM2,
    wLeer,
    wOpexBrutto,
    gFl,
    gRentM2: inUse.gRentM2,
    gLeer,
    gOpexBrutto,
    kaufpreis: inUse.kaufpreis,
  });

  /* -------- Entscheidungstext + Hebel -------- */

  const decisionLabelText =
    out.scoreLabel === "BUY"
      ? "Kaufen (unter Vorbehalt)"
      : out.scoreLabel === "CHECK"
      ? "Weiter prüfen"
      : "Eher Nein";

  let decisionText: string;
  if (out.scoreLabel === "BUY") {
    decisionText =
      "Wohnen und Gewerbe ergänzen sich gut: NOI, Cashflow und Wertansatz ergeben ein stimmiges Chance-Risiko-Profil. Prüfe im Detail Mietverträge, Mieterbonität und Standort, bevor du final zusagst.";
  } else if (out.scoreLabel === "CHECK") {
    decisionText =
      "Der Mixed-Use-Deal liegt im Mittelfeld. Die Profitabilität hängt stark von Leerständen, Cap Rates und Finanzierung ab. Spiele mehrere Szenarien durch und verhandle Kaufpreis oder Konditionen nach.";
  } else {
    decisionText =
      "Unter den aktuellen Annahmen wirkt das Objekt eher angespannt - sei es durch schwachen Cashflow, hohe Cap Rates oder einen zu hohen Kaufpreis. Nur mit besseren Konditionen oder optimierter Miete wird das spannend.";
  }

  // Score-Ring zaehlt sanft zum Zielwert hoch
  const displayScorePct = useCountUp(scorePct);

  // Konfetti, wenn das Ergebnis frisch auf "BUY" kippt
  const [showConfetti, setShowConfetti] = useState(false);
  const prevLabelRef = useRef<"BUY" | "CHECK" | "NO" | null>(null);
  useEffect(() => {
    if (prevLabelRef.current !== null && prevLabelRef.current !== "BUY" && out.scoreLabel === "BUY") {
      setShowConfetti(true);
    }
    prevLabelRef.current = out.scoreLabel;
  }, [out.scoreLabel]);

  const eigenkapitalMixed = Math.max(0, kaufpreis * (1 + nkPct) - out.loan);

  const mixedProInput: MixedProInput = useMemo(
    () => ({
      noiYield: out.noiYield,
      dscr: out.dscr,
      valueGapPct: out.valueGapPct,
      cashflowMonat: out.cashflowMonat,
      scoreLabel: out.scoreLabel,
      ltvPct,
      wertAusCap: out.wertAusCap,
      eigenkapitalMixed,
      grossW0: out.grossW, grossG0: out.grossG, opexW0: out.opexW, opexG0: out.opexG,
      wLeer, gLeer, kaufpreis: inUse.kaufpreis, financingOn: inUse.financingOn,
      zinsPct, tilgungPct, loan: out.loan,
    }),
    [out.noiYield, out.dscr, out.valueGapPct, out.cashflowMonat, out.scoreLabel, ltvPct, out.wertAusCap, eigenkapitalMixed, out.grossW, out.grossG, out.opexW, out.opexG, wLeer, gLeer, inUse.kaufpreis, inUse.financingOn, zinsPct, tilgungPct, out.loan]
  );
  const { data: mixedPro, loading: mixedProLoading } = useMixedProAnalysis(mixedProInput, plan);
  const narrative = mixedPro?.narrative ?? "";
  const marketComparison = mixedPro?.marketComparison ?? "";
  const showMixedProLoading = isPro(plan) && mixedProLoading && !mixedPro;
  const chartData = mixedPro?.projectionFull ?? buildProjectionTeaserContinuation(projectionPreview);
  const lastProj = chartData[chartData.length - 1];
  const scoreBreakdownData = mixedPro?.scoreBreakdown ?? PLACEHOLDER_SCORE_BREAKDOWN;
  const realEtfWert10y = Math.max(0, eigenkapitalMixed) * Math.pow(1.07, 10);
  const etfData = mixedPro?.etf ?? {
    eigenkapital: eigenkapitalMixed,
    etfWert10y: realEtfWert10y,
    immoWert10y: PLACEHOLDER_ETF.immoWert10y,
    etfDelta: PLACEHOLDER_ETF.immoWert10y - realEtfWert10y,
  };
  const narrativeTeaser = buildNarrativeTeaser({
    scoreLabel: out.scoreLabel,
    ltvPct,
    cashflowMonat: out.cashflowMonat,
    valueGapPct: out.valueGapPct,
    wertAusCap: out.wertAusCap,
  });

  const tips: { label: string; detail: string }[] = [];
  if (out.noiYield < 0.04) {
    tips.push({
      label: "Kaufpreis nachverhandeln",
      detail:
        "Die Nettomietrendite ist eher niedrig. Schon 5-10 % weniger Kaufpreis können NOI-Yield und Score deutlich verbessern.",
    });
  }
  if (out.dscr != null && out.dscr < 1.2) {
    tips.push({
      label: "Finanzierung strukturieren",
      detail:
        "DSCR liegt eher knapp. Prüfe alternative Tilgungssätze oder längere Zinsbindung, um den Schuldendienst tragfähiger zu machen.",
    });
  }
  if (out.valueGapPct < 0) {
    tips.push({
      label: "Cap-Rate & Marktwerte vergleichen",
      detail:
        "Die Cap-basierten Teilwerte liegen unter dem Kaufpreis. Prüfe, ob deine Cap-Annahmen realistisch sind oder ob der Preis über Marktniveau liegt.",
    });
  }
  if (!tips.length) {
    tips.push({
      label: "Feintuning",
      detail:
        "Die Kennzahlen wirken insgesamt rund. Nutze die Spielwiese, um verschiedene Miet- und Preisvarianten zu testen.",
    });
  }

  /* ------------- Export/Import ------------- */

  function exportJSON() {
    const payload = {
      generatedAt: new Date().toISOString(),
      // Preis & NK
      kaufpreis,
      nkGrEStPct,
      nkNotarPct,
      nkGrundbuchPct,
      nkMaklerPct,
      nkSonstPct,
      // Finanzierung
      financingOn,
      ltvPct,
      zinsPct,
      tilgungPct,
      // Wohnen
      wFl,
      wRentM2,
      wLeer,
      wOpexBrutto,
      wCap,
      // Gewerbe
      gFl,
      gRentM2,
      gLeer,
      gOpexBrutto,
      gCap,
      // Playground
      priceAdjPct,
      wRentAdjPct,
      gRentAdjPct,
      applyAdjustments,
    };
    downloadBlob(
      `mixed_export_${ts()}.json`,
      "application/json;charset=utf-8",
      JSON.stringify(payload, null, 2)
    );
  }

  function exportCSV() {
    const rows: (string | number)[][] = [];
    rows.push([
      "Segment",
      "Fläche (m²)",
      "€ Kaltmiete (€/m²)",
      "Leerstand (%)",
      "Opex (% Brutto)",
      "Cap Rate",
    ]);
    rows.push([
      "Wohnen",
      wFl,
      wRentM2,
      Math.round(wLeer * 1000) / 10 + "%",
      Math.round(wOpexBrutto * 1000) / 10 + "%",
      Math.round(wCap * 1000) / 10 + "%",
    ]);
    rows.push([
      "Gewerbe",
      gFl,
      gRentM2,
      Math.round(gLeer * 1000) / 10 + "%",
      Math.round(gOpexBrutto * 1000) / 10 + "%",
      Math.round(gCap * 1000) / 10 + "%",
    ]);
    const csv =
      rows
        .map((r) =>
          r
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(";")
        )
        .join("\n") + "\n";
    const csvWithBom = "\uFEFF" + csv;
    downloadBlob(
      `mixed_export_${ts()}.csv`,
      "text/csv;charset=utf-8",
      csvWithBom
    );
  }

  function exportPDF() {
    const html = `
<!doctype html>
<html lang="de">
<head><meta charset="utf-8" /><title>Mixed-Use Export - ${ts()}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Arial; margin:24px; color:#111; }
  h1 { font-size:20px; margin:0 0 4px; }
  h2 { font-size:16px; margin:16px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:6px 8px; } th { text-align:left; }
  tr + tr td { border-top:1px solid #eee; }
  .meta { color:#555; font-size:12px; margin-bottom:12px; }
</style></head>
<body>
  <h1>Gemischt genutztes Objekt - Export</h1>
  <div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>

  <h2>Preis & NK</h2>
  <table>
    <tr><th>Kaufpreis</th><td>${eur(inUse.kaufpreis)}</td></tr>
    <tr><th>Summe NK</th><td>${pct(nkPct)} = ${eur(nkSum)}</td></tr>
  </table>

  <h2>Segmente</h2>
  <table>
    <tr><th>Segment</th><th>Fläche (m²)</th><th>€ Kaltmiete (€/m²)</th><th>Leerstand</th><th>Opex (Brutto)</th><th>Cap</th></tr>
    <tr><td>Wohnen</td><td style="text-align:right;">${wFl.toLocaleString("de-DE")}</td><td style="text-align:right;">${wRentM2.toFixed(2)}</td><td>${pct(
      wLeer
    )}</td><td>${pct(wOpexBrutto)}</td><td>${pct(wCap)}</td></tr>
    <tr><td>Gewerbe</td><td style="text-align:right;">${gFl.toLocaleString(
      "de-DE"
    )}</td><td style="text-align:right;">${gRentM2.toFixed(
      2
    )}</td><td>${pct(gLeer)}</td><td>${pct(gOpexBrutto)}</td><td>${pct(
      gCap
    )}</td></tr>
  </table>

  <h2>NOI & Wert</h2>
  <table>
    <tr><th>NOI Wohnen p.a.</th><td>${eur(Math.round(out.noiW))}</td></tr>
    <tr><th>NOI Gewerbe p.a.</th><td>${eur(Math.round(out.noiG))}</td></tr>
    <tr><th>NOI gesamt p.a.</th><td>${eur(Math.round(out.noi))}</td></tr>
    <tr><th>Wert (Cap) gesamt</th><td>${eur(Math.round(
      out.wertAusCap
    ))}</td></tr>
  </table>

  <h2>Bewertung</h2>
  <table>
    <tr><th>NOI-Yield</th><td>${pct(out.noiYield)}</td></tr>
    <tr><th>DSCR</th><td>${out.dscr ? out.dscr.toFixed(2) : "-"}</td></tr>
    <tr><th>Cashflow mtl.</th><td>${eur(Math.round(
      out.cashflowMonat
    ))}</td></tr>
  </table>

  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`.trim();

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }

  function runSelectedExports(opts: {
    json: boolean;
    csv: boolean;
    pdf: boolean;
  }) {
    if (opts.json) exportJSON();
    if (opts.csv) exportCSV();
    if (opts.pdf) exportPDF();
  }

  /* ---------------- Render (neues Layout wie MFH) ---------------- */
  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 120px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="9" width="7" height="9" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/>
                <path d="M9 10L14 5L19 10V18H9V10Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                <rect x="4" y="13" width="1.5" height="2" fill="#FCDC45" rx="0.3"/>
                <rect x="6.5" y="13" width="1.5" height="2" fill="#FCDC45" rx="0.3"/>
                <rect x="12" y="13" width="1.5" height="2" fill="#FCDC45" rx="0.3"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Gemischte Immobilie</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>Wohnen & Gewerbe kombiniert - NOI, Cashflow und Cap-Rate je Segment</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setMode("einfach")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "einfach" ? "#FCDC45" : "transparent", color: mode === "einfach" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Einfach</button>
              <button onClick={() => setMode("erweitert")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "erweitert" ? "#FCDC45" : "transparent", color: mode === "erweitert" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Erweitert</button>
            </div>
            <button onClick={() => {
              setKaufpreis(1850000);
              setNkGrEStPct(0.065); setNkNotarPct(0.01); setNkGrundbuchPct(0.005); setNkMaklerPct(0); setNkSonstPct(0.005);
              setFinancingOn(true); setLtvPct(0.5); setZinsPct(0.041); setTilgungPct(0.02);
              setWFl(750); setWRentM2(13); setWLeer(0.06); setWOpexBrutto(0.25); setWCap(0.055);
              setGFl(450); setGRentM2(20); setGLeer(0.1); setGOpexBrutto(0.3); setGCap(0.065);
              setPriceAdjPct(0); setWRentAdjPct(0); setGRentAdjPct(0); setApplyAdjustments(true);
            }} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} /> Beispiel
            </button>
            <button onClick={() => setTourStep(0)} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", color: "#FCDC45", display: "inline-flex", alignItems: "center", gap: 6 }}>
              🗺️ Tour
            </button>
            <ExportDropdown onRun={runSelectedExports} />
            <SaveToPortfolioButton analyzerType="mixeduse" name={"Mixed-Use Objekt"} kaufpreis={inUse.kaufpreis} data={{ cashflowMonat: out.cashflowMonat ?? 0, noiYield: out.noiYield ?? 0, noi: out.noi ?? 0, dscr: out.dscr ?? 0 }} />
            {isPro(plan) ? (
            <button
              disabled={pdfExporting}
              onClick={async () => {
                setPdfExporting(true);
                try {
                  await downloadPdfExport("mixed", {
                    investorName, adresse,
                    kaufpreis, nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
                    nkPct, financingOn, ltvPct, zinsPct, tilgungPct,
                    wFl, wRentM2: inUse.wRentM2, wLeer, wOpexBrutto, wCap,
                    gFl, gRentM2: inUse.gRentM2, gLeer, gOpexBrutto, gCap,
                    grossW: out.grossW, effW: out.effW, opexW: out.opexW, noiW: out.noiW, wertW: out.wertW,
                    grossG: out.grossG, effG: out.effG, opexG: out.opexG, noiG: out.noiG, wertG: out.wertG,
                    noi: out.noi, wertAusCap: out.wertAusCap, loan: out.loan, annu: out.annu,
                    dscr: out.dscr, noiYield: out.noiYield, valueGapPct: out.valueGapPct,
                    cashflowMonat: out.cashflowMonat, scoreLabel: out.scoreLabel, scorePct,
                    valueGap, nkSum, monthlyEffRent, monthlyOpex, monthlyInterest, monthlyPrincipal,
                    bePrice, beRentK, projection: mixedPro?.projectionFull ?? [], decisionText,
                  }, getToken);
                } catch {
                  alert("PDF-Export fehlgeschlagen. Bitte später erneut versuchen.");
                } finally {
                  setPdfExporting(false);
                }
              }}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: pdfExporting ? "wait" : "pointer", background: "#F5C842", border: "none", color: "#111", display: "inline-flex", alignItems: "center", gap: 6, opacity: pdfExporting ? 0.6 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              {pdfExporting ? "Wird erstellt…" : "Bankbericht"}
            </button>
            ) : (
            <button onClick={() => setShowUpgradeModal(true)}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "not-allowed", background: "rgba(245,200,66,0.15)", border: "1px solid rgba(245,200,66,0.25)", color: "rgba(245,200,66,0.35)", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Bankbericht <span style={{fontSize:10}}>PRO</span>
            </button>
            )}
            <label style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }} className={pdfLoading ? "opacity-60 pointer-events-none" : ""}>
              {pdfLoading ? "Wird gelesen…" : <><Upload size={14} /> Import</>}
              <input type="file" className="hidden" accept=".json,application/json,.pdf,application/pdf" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; e.target.value = "";
                  const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
                  if (isPdf) {
                    try { setPdfLoading(true); const fd = new FormData(); fd.append("file", f);
                      const res = await fetch("/api/import-expose-mfh", { method: "POST", body: fd });
                      if (!res.ok) throw new Error(); const j = await res.json();
                      if (!j.success) throw new Error(); const inp = j.data?.input ?? j.data ?? {};
                      if (inp.kaufpreis) setKaufpreis(Number(inp.kaufpreis));
                    } catch { alert("PDF-Import fehlgeschlagen."); } finally { setPdfLoading(false); } return;
                  }
                  const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); if (d.kaufpreis) setKaufpreis(d.kaufpreis); } catch {} }; r.readAsText(f);
                }} disabled={pdfLoading} />
            </label>
          </div>
        </div>

        {/* Zwei-Spalten */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* LINKS: Eingaben */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Schritt-Tabs: frei wechselbar, Ergebnis rechts bleibt immer live */}
            <div ref={tourTabsRef} style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 5 }}>
              {[
                { n: 1 as const, label: "Kaufpreis" },
                { n: 2 as const, label: "Wohnanteil" },
                { n: 3 as const, label: "Gewerbeanteil" },
                { n: 4 as const, label: "Finanzierung" },
              ].map((s) => (
                <button
                  key={s.n}
                  onClick={() => setActiveStep(s.n)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 6px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 11.5, fontWeight: 600, transition: "all 0.15s",
                    background: activeStep === s.n ? "#FCDC45" : "transparent",
                    color: activeStep === s.n ? "#0d1117" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", fontSize: 10, fontWeight: 700, flexShrink: 0, background: activeStep === s.n ? "rgba(13,17,23,0.15)" : "rgba(255,255,255,0.08)" }}>{s.n}</span>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Kaufpreis */}
            {activeStep === 1 && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 1 - Kaufpreis</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Kaufpreis & Nebenkosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Gesamtinvestition ins gemischte Objekt</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
                <div ref={addressBoxRef} style={{ gridColumn: "1 / -1", position: "relative" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Objektbezeichnung / Adresse</div>
                  <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                    type="text" placeholder="z.B. Musterstraße 12, 10115 Berlin"
                    value={adresse}
                    onChange={(e) => { setAdresse(e.target.value); setShowSuggestions(true); setSelectedCoords(null); }}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                  />
                  {showSuggestions && (suggestLoading || addressSuggestions.length > 0) && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                      {suggestLoading && <div style={{ padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Suche…</div>}
                      {!suggestLoading && addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setAdresse(s.label); setSelectedCoords({ lat: s.lat, lon: s.lon }); setShowSuggestions(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}
                        >
                          📍 {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCoords && (
                  <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <iframe
                      title="Standort-Karte"
                      width="100%"
                      height="160"
                      style={{ border: 0, display: "block", filter: "grayscale(0.15) contrast(1.05)" }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(parseFloat(selectedCoords.lon) - 0.006).toFixed(5)}%2C${(parseFloat(selectedCoords.lat) - 0.004).toFixed(5)}%2C${(parseFloat(selectedCoords.lon) + 0.006).toFixed(5)}%2C${(parseFloat(selectedCoords.lat) + 0.004).toFixed(5)}&layer=mapnik&marker=${selectedCoords.lat}%2C${selectedCoords.lon}`}
                    />
                  </div>
                )}
              <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
              {mode === "erweitert" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                  <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                  <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                  <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                  <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
                  <PercentField label="Sonstiges" value={nkSonstPct} onChange={setNkSonstPct} />
                </div>
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Kaufpreis: <strong style={{ color: "#FCDC45" }}>{eur(kaufpreis)}</strong>
              </div>
            </div>
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
              Weiter zu Wohnanteil →
            </button>
            </>)}

            {/* Wohnen */}
            {activeStep === 2 && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 2 - Wohnanteil</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Wohnflächen & Miete</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Fläche, Miete und Leerstand Wohnen</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Wohnfläche (m²)" value={wFl} onChange={setWFl} step={10} />
                <NumberField label="Miete Wohnen (€/m²/Mo.)" value={wRentM2} onChange={setWRentM2} step={0.5} />
                <PercentField label="Leerstand Wohnen" value={wLeer} onChange={setWLeer} />
                <PercentField label="Opex Wohnen (% Miete)" value={wOpexBrutto} onChange={setWOpexBrutto} />
                {mode === "erweitert" && <PercentField label="Cap-Rate Wohnen" value={wCap} onChange={setWCap} step={0.005} />}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Bruttomiete Wohnen p.a.: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(wFl * wRentM2 * 12))}</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(1)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                ← Zurück
              </button>
              <button onClick={() => setActiveStep(3)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Gewerbeanteil →
              </button>
            </div>
            </>)}

            {/* Gewerbe */}
            {activeStep === 3 && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 3 - Gewerbeanteil</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Gewerbeflächen & Miete</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Fläche, Miete und Leerstand Gewerbe</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Gewerbefläche (m²)" value={gFl} onChange={setGFl} step={10} />
                <NumberField label="Miete Gewerbe (€/m²/Mo.)" value={gRentM2} onChange={setGRentM2} step={0.5} />
                <PercentField label="Leerstand Gewerbe" value={gLeer} onChange={setGLeer} />
                <PercentField label="Opex Gewerbe (% Miete)" value={gOpexBrutto} onChange={setGOpexBrutto} />
                {mode === "erweitert" && <PercentField label="Cap-Rate Gewerbe" value={gCap} onChange={setGCap} step={0.005} />}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Bruttomiete Gewerbe p.a.: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(gFl * gRentM2 * 12))}</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(2)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                ← Zurück
              </button>
              <button onClick={() => setActiveStep(4)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Finanzierung →
              </button>
            </div>
            </>)}

            {/* Finanzierung */}
            {activeStep === 4 && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 4 - Finanzierung</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Finanzierung</div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", marginBottom: 14 }}>
                <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                Finanzierung einbeziehen
              </label>
              {financingOn && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <PercentField label="LTV" value={ltvPct} onChange={setLtvPct} />
                  <PercentField label="Zinssatz p.a." value={zinsPct} onChange={setZinsPct} step={0.05} />
                  <PercentField label="Tilgung p.a." value={tilgungPct} onChange={setTilgungPct} step={0.05} />
                </div>
              )}
              {financingOn && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(kaufpreis * ltvPct))}</strong> - Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(kaufpreis * ltvPct * (zinsPct + tilgungPct)))}/Jahr</strong>
                </div>
              )}
            </div>
            <button onClick={() => setActiveStep(3)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              ← Zurück zu Gewerbeanteil
            </button>
            </>)}

            {/* Detailberechnungen */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Detailberechnungen</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatlicher Cashflow</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Effektive Miete Wohnen", value: Math.round(out.effW / 12), positive: true },
                  { label: "Effektive Miete Gewerbe", value: Math.round(out.effG / 12), positive: true },
                  { label: "Betriebskosten gesamt", value: -Math.round((out.opexW + out.opexG) / 12), positive: false },
                  ...(financingOn ? [{ label: "Zins + Tilgung", value: -Math.round(kaufpreis * ltvPct * (zinsPct + tilgungPct) / 12), positive: false }] : []),
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.positive ? "#4ade80" : "#f87171" }}>{row.positive ? "+" : ""}{eur(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: out.cashflowMonat >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, border: `1px solid ${out.cashflowMonat >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>= Cashflow pro Monat</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: out.cashflowMonat >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(out.cashflowMonat))}</span>
                </div>
              </div>
            </div>

            {/* Score-Breakdown (PRO) */}
            <ProGate plan={plan} feature="Der Score-Breakdown" message={`Sieh genau, warum dein Score bei ${scorePct}% liegt — und was ihn verbessert`}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Score-Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: `Rendite-Score (Gewicht ${Math.round(scoreBreakdownData.weights.noiYield * 100)}%)`, value: scoreBreakdownData.noiYieldScore, color: "#FCDC45" },
                    { label: `Schuldendeckung-Score (Gewicht ${Math.round(scoreBreakdownData.weights.dscr * 100)}%)`, value: scoreBreakdownData.dscrScore, color: "#60a5fa" },
                    { label: `Wert-Gap-Score (Gewicht ${Math.round(scoreBreakdownData.weights.valueGap * 100)}%)`, value: scoreBreakdownData.valueGapScore, color: "#a78bfa" },
                    { label: `Cashflow-Score (Gewicht ${Math.round(scoreBreakdownData.weights.cashflow * 100)}%)`, value: scoreBreakdownData.cashflowScore, color: "#4ade80" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{Math.round(row.value * 100)}%</span>
                      </div>
                      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(row.value * 100)}%`, background: row.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ProGate>

            {/* 10-Jahres-Projektion: Jahr 1-2 frei sichtbar, volle Reihe + Chart ist PRO */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {projectionPreview.map((y) => (
                <div key={y.year} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cashflow Jahr {y.year}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: y.Cashflow >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(y.Cashflow))}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Vermögensaufbau: {eur(Math.round(y.Vermoegen))}</div>
                </div>
              ))}
            </div>
            <ProGate plan={plan} feature="Die volle 10-Jahres-Projektion" message="Sieh die komplette 10-Jahres-Entwicklung deines Cashflows">
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>10-Jahres-Projektion</div>
                {showMixedProLoading ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "40px 0", textAlign: "center" }}>Projektion wird berechnet …</div>
                ) : (
                  <>
                  <div style={{ height: 220, marginBottom: 18 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradVermMixed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FCDC45" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#FCDC45" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradCfMixed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={out.cashflowMonat >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={out.cashflowMonat >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" tickFormatter={(y) => `J${y}`} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => eur(Math.round(v))} />
                        <RTooltip
                          formatter={(v: any, name: string) => [eur(Math.round(Number(v))), name]}
                          labelFormatter={(y) => `Jahr ${y}`}
                          contentStyle={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                        />
                        <Area type="monotone" dataKey="Vermoegen" name="Vermögensaufbau p.a." stroke="#FCDC45" strokeWidth={2} fill="url(#gradVermMixed)" />
                        <Area type="monotone" dataKey="Cashflow" name="Cashflow p.a." stroke={out.cashflowMonat >= 0 ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#gradCfMixed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {[
                      { label: "Vermögensaufbau Jahr 10", value: lastProj ? eur(Math.round(lastProj.Vermoegen)) : "–", color: "#FCDC45", sub: "p.a." },
                      { label: "Cashflow Jahr 10", value: lastProj ? eur(Math.round(lastProj.Cashflow)) : "–", color: lastProj && lastProj.Cashflow >= 0 ? "#4ade80" : "#f87171", sub: "p.a." },
                      { label: "CF-Entwicklung", value: lastProj ? `${lastProj.Cashflow - (chartData[0]?.Cashflow ?? 0) >= 0 ? "+" : ""}${eur(Math.round(lastProj.Cashflow - (chartData[0]?.Cashflow ?? 0)))}` : "–", color: lastProj && lastProj.Cashflow >= (chartData[0]?.Cashflow ?? 0) ? "#4ade80" : "#f87171", sub: "über 10 Jahre" },
                      { label: "Cashflow-Summe (10J)", value: eur(Math.round(chartData.reduce((s, y) => s + y.Cashflow, 0))), color: chartData.reduce((s, y) => s + y.Cashflow, 0) >= 0 ? "#4ade80" : "#f87171", sub: "kumuliert, Jahr 1-10" },
                    ].map((k) => (
                      <div key={k.label} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            </ProGate>

            {/* ETF-Vergleich: ETF-Seite ist ein echter Wert aus dem freien Eigenkapital,
                nur die Objekt-Seite (abhängig vom PRO-Cashflow) bleibt erfunden+geblurrt. */}
            {eigenkapitalMixed > 0 && (
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Schlägt dieses Objekt eine ETF-Anlage?</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
                  Vereinfachter Vergleich über 10 Jahre — dein Eigenkapital ({eur(Math.round(etfData.eigenkapital))}) angelegt zu 7 % p.a. vs. das Objekt (kumulierter Cashflow, ohne Wertsteigerung eingerechnet).
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>ETF (7 % p.a.)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{eur(Math.round(etfData.etfWert10y))}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>nach 10 Jahren</div>
                  </div>
                  <ProGate plan={plan} feature="Der ETF-Vergleich" compact>
                    <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dieses Objekt</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#FCDC45" }}>{eur(Math.round(etfData.immoWert10y))}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>EK + Cashflow, 10J</div>
                    </div>
                  </ProGate>
                </div>
                <ProGate plan={plan} feature="Der ETF-Vergleich" message="Ist dieses Objekt besser als ein ETF-Investment? Jetzt vergleichen.">
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: etfData.etfDelta >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${etfData.etfDelta >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, fontSize: 12.5, color: etfData.etfDelta >= 0 ? "#4ade80" : "#f87171", fontWeight: 600, textAlign: "center" }}>
                    {etfData.etfDelta >= 0
                      ? `Das Objekt schlägt die ETF-Anlage um ${eur(Math.round(etfData.etfDelta))}`
                      : `Die ETF-Anlage liegt um ${eur(Math.round(-etfData.etfDelta))} vorn`}
                  </div>
                </ProGate>
              </div>
            )}

            {/* Kennzahlen Kacheln */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Gesamtkennzahlen</div>
                {[
                  { label: "NOI-Yield gesamt", value: pct(out.noiYield), color: out.noiYield >= 0.05 ? "#4ade80" : out.noiYield >= 0.035 ? "#FCDC45" : "#f87171" },
                  { label: "DSCR", value: out.dscr ? out.dscr.toFixed(2) : "-", color: out.dscr && out.dscr >= 1.2 ? "#4ade80" : out.dscr && out.dscr >= 1.0 ? "#FCDC45" : "#f87171" },
                  { label: "NOI gesamt p.a.", value: eur(Math.round(out.noi)), color: "rgba(255,255,255,0.75)" },
                  { label: "Kaufpreis", value: eur(kaufpreis), color: "rgba(255,255,255,0.75)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Segment-Aufteilung</div>
                {[
                  { label: "NOI Wohnen p.a.", value: eur(Math.round(out.noiW)), color: "#7c3aed" },
                  { label: "NOI Gewerbe p.a.", value: eur(Math.round(out.noiG)), color: "#FCDC45" },
                  { label: "Wert Wohnen (Cap)", value: eur(Math.round(out.wertW)), color: "rgba(255,255,255,0.65)" },
                  { label: "Wert Gewerbe (Cap)", value: eur(Math.round(out.wertG)), color: "rgba(255,255,255,0.65)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECHTS: Ergebnis sticky */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Beispielobjekt-Hinweis */}
            {isBeispiel && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.22)", fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}
              >
                <span>✨ Das ist ein <strong style={{ color: "#FCDC45" }}>Beispielobjekt</strong> — trag oben deine eigenen Daten ein für dein echtes Ergebnis.</span>
              </motion.div>
            )}

            {/* Score & Entscheidung */}
            <StaggerItem index={0}>
            <motion.div
              ref={tourScoreRef}
              animate={{ scale: [1, 1.015, 1], rotateX: tilt.x, rotateY: tilt.y }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ position: "relative", borderRadius: 16, padding: 20, background: "linear-gradient(135deg, rgba(15,44,138,0.85) 0%, rgba(124,58,237,0.65) 100%)", border: "1px solid rgba(124,58,237,0.25)", transformPerspective: 700, transformStyle: "preserve-3d" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.25)" }} />
                  Dein Ergebnis (live)
                </div>
                <button
                  ref={tourShareRef}
                  onClick={shareResult}
                  disabled={sharing}
                  title="Ergebnis als Bild teilen"
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 7, padding: "5px 9px", cursor: sharing ? "default" : "pointer", fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: 600, opacity: sharing ? 0.6 : 1 }}
                >
                  <Share2 size={12} /> {sharing ? "..." : "Teilen"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * displayScorePct / 100)} 201`} strokeLinecap="round" style={{ transition: "stroke 0.4s ease-out" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{Math.round(displayScorePct)}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Empfehlung</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: out.scoreLabel === "BUY" ? "#4ade80" : out.scoreLabel === "CHECK" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>
                    <AnimatedValue value={decisionLabelText} />
                  </div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(out.cashflowMonat)), good: out.cashflowMonat >= 300, okay: out.cashflowMonat >= 0 },
                  { label: "NOI-Yield", value: pct(out.noiYield), good: out.noiYield >= 0.05, okay: out.noiYield >= 0.035 },
                  { label: "DSCR", value: out.dscr ? out.dscr.toFixed(2) : "-", good: !!out.dscr && out.dscr >= 1.2, okay: !!out.dscr && out.dscr >= 1.0 },
                ].map((kpi) => {
                  const statusColor = kpi.good ? "#4ade80" : kpi.okay ? "#FCDC45" : "#f87171";
                  return (
                    <div key={kpi.label} style={{ background: `linear-gradient(180deg, ${statusColor}14 0%, rgba(0,0,0,0.25) 55%)`, border: `1px solid ${statusColor}33`, borderTop: `2px solid ${statusColor}`, borderRadius: 10, padding: "9px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{kpi.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}><AnimatedValue value={kpi.value} /></div>
                      <div style={{ marginTop: 6, display: "inline-block", padding: "2px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${statusColor}26`, color: statusColor }}>
                        {kpi.good ? "Gut" : kpi.okay ? "Okay" : "Niedrig"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: scoreColor, borderRadius: 2, transition: "width 0.6s ease, background 0.4s ease-out" }} />
              </div>
            </motion.div>
            </StaggerItem>

            {/* Textliche Einordnung -- PRO: narrative/marketComparison existieren
                clientseitig für Free-User gar nicht (siehe useMixedProAnalysis).
                NarrativeTeaser zeigt Free-Usern einen echten Halbsatz aus bereits
                freien Werten, gefolgt von geblurrtem Fülltext. */}
            <StaggerItem index={1}>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>💬</span>
                <div style={{ flex: 1 }}>
                  <NarrativeTeaser
                    plan={plan}
                    feature="Die ausführliche Handlungsempfehlung"
                    teaser={narrativeTeaser}
                    filler={PLACEHOLDER_NARRATIVE_FILLER}
                    fullContent={
                      showMixedProLoading ? (
                        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>Analyse wird berechnet …</span>
                      ) : (
                        <AnimatedValue value={narrative} style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.8)", fontStyle: "italic" }} />
                      )
                    }
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>📊</span>
                <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.5)", filter: isPro(plan) ? "none" : "blur(4px)", userSelect: isPro(plan) ? "auto" : "none" }}>
                  {marketComparison || PLACEHOLDER_MARKET_COMPARISON}
                </div>
              </div>
            </div>
            </StaggerItem>

            {/* Versteckte Karte fuer den Bild-Export */}
            <div style={{ position: "fixed", left: -9999, top: 0, width: 640, pointerEvents: "none" }} aria-hidden="true">
              <div ref={shareCardRef} style={{ width: 640, padding: 40, background: "linear-gradient(160deg, #0a1628 0%, #161b22 100%)", fontFamily: "inherit" }}>
                {/* Branding nur für Free -- PRO-Nutzer teilen ohne PROPORA-Wasserzeichen */}
                {!isPro(plan) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#FCDC45", letterSpacing: "-0.02em" }}>PROPORA</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Immo-Analyzer</span>
                  </div>
                )}
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{isBeispiel ? "Beispielobjekt" : (adresse || "Gemischte-Immobilie-Analyse")}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginBottom: 28 }}>{eur(kaufpreis)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
                  <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                    <svg width="110" height="110" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7" strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Empfehlung</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: out.scoreLabel === "BUY" ? "#4ade80" : out.scoreLabel === "CHECK" ? "#FCDC45" : "#f87171" }}>{decisionLabelText}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                  {[
                    { label: "Cashflow/Monat", value: eur(Math.round(out.cashflowMonat)) },
                    { label: "NOI-Yield", value: pct(out.noiYield) },
                    { label: "DSCR", value: out.dscr ? out.dscr.toFixed(2) : "-" },
                  ].map((kpi) => (
                    <div key={kpi.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>{kpi.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                  Erstellt mit propora.de — Immobilien-Rendite in 60 Sekunden
                </div>
              </div>
            </div>

            {/* Spielwiese — direkt unter dem Ergebnis */}
            <StaggerItem index={2}>
            <div ref={tourSpielwieseRef} style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <style>{`.mix-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.mix-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.mix-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>🎛️ Spielwiese</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>wirkt sofort oben</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {[
                  { label: "🤝 Verhandeln −10%", price: -0.1, wRent: 0, gRent: 0 },
                  { label: "📈 Mieten +10%", price: 0, wRent: 0.1, gRent: 0.1 },
                  { label: "↩️ Zurücksetzen", price: 0, wRent: 0, gRent: 0 },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => { setPriceAdjPct(s.price); setWRentAdjPct(s.wRent); setGRentAdjPct(s.gRent); }}
                    style={{ fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", cursor: "pointer" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { label: "Kaufpreis anpassen", value: priceAdjPct, set: setPriceAdjPct, min: -0.3, max: 0.3, neg: true },
                  { label: "Miete Wohnen anpassen", value: wRentAdjPct, set: setWRentAdjPct, min: -0.3, max: 0.5, neg: false },
                  { label: "Miete Gewerbe anpassen", value: gRentAdjPct, set: setGRentAdjPct, min: -0.3, max: 0.5, neg: false },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.neg ? (s.value < 0 ? "#4ade80" : s.value > 0 ? "#f87171" : "rgba(255,255,255,0.5)") : (s.value > 0 ? "#4ade80" : s.value < 0 ? "#f87171" : "rgba(255,255,255,0.5)") }}><AnimatedValue value={signedPct(s.value)} /></span>
                    </div>
                    <input type="number" min={s.min * 100} max={s.max * 100} step={0.5} value={(s.value * 100).toFixed(1)} onChange={(e) => s.set(Number(e.target.value) / 100)} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }} />
                  </div>
                ))}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                  Anpassungen in Bewertung berücksichtigen
                </label>
              </div>
            </div>
            </StaggerItem>

            {/* Tipps */}
            {tips.length > 0 && (
              <StaggerItem index={3}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Schnelle Hebel</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tips.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "rgba(252,220,69,0.04)", borderRadius: 10, border: "1px solid rgba(252,220,69,0.1)" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FCDC45", flexShrink: 0, marginTop: 4 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{tip.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.5 }}>{tip.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </StaggerItem>
            )}

            {/* Glossar */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Was bedeutet das?</div>
              {[
                { term: "NOI-Yield", def: "Betriebsergebnis geteilt durch Kaufpreis. Ziel: über 5%." },
                { term: "DSCR", def: "Wie gut die Miete die Kreditrate deckt. über 1,2 ist solide." },
                { term: "Cap-Rate", def: "Marktrendite-Erwartung je Segment. NOI / Cap = Wert." },
                { term: "Value-Gap", def: "Differenz zwischen Cap-basiertem Wert und Kaufpreis." },
              ].map((g) => (
                <div key={g.term} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{g.term}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.5 }}>{g.def}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <OnboardingWizard analyzer="mixeduse" />
      {tourStep !== null && (
        <TourOverlay
          targetRef={tourSteps[tourStep].ref}
          step={tourStep}
          total={tourSteps.length}
          title={tourSteps[tourStep].title}
          text={tourSteps[tourStep].text}
          onNext={() => setTourStep((s) => (s !== null && s + 1 < tourSteps.length ? s + 1 : null))}
          onSkip={() => setTourStep(null)}
        />
      )}
      {/* Sticky Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 12px" }}>
          <div style={{ background: "rgba(13,17,23,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, backdropFilter: "blur(20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Ergebnis (live)</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>{decisionLabelText}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  {[
                    { label: `${eur(Math.round(out.cashflowMonat))} mtl.` },
                    { label: `NOI-Yield ${pct(out.noiYield)}` },
                    { label: `DSCR ${out.dscr ? out.dscr.toFixed(2) : "-"}` },
                  ].map((b) => (
                    <span key={b.label} style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 20, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{b.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", width: 50, height: 50, flexShrink: 0 }}>
                <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
                  <circle cx="25" cy="25" r="20" fill="none" stroke={scoreColor} strokeWidth="5"
                    strokeDasharray={`${Math.round(125.6 * scorePct / 100)} 125.6`} strokeLinecap="round"/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{scorePct}%</span>
                </div>
              </div>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(4, scorePct)}%`, background: scoreColor }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
 // Entscheidungs-Komponente (Zwischenstand)
}

type MixedLabel = "BUY" | "CHECK" | "NO";

/* ----------------------------------------------------------------
 *  Entscheidungs-Komponente
 * ---------------------------------------------------------------- */

function MixedUseDecisionSummary({
  scorePct,
  scoreLabel,
  scoreColor,
  decisionLabelText,
  decisionText,
  noi,
  cashflowMonat,
  noiYield,
  dscr,
  valueGap,
  valueGapPct,
  allIn,
  tips,
}: {
  scorePct: number;
  scoreLabel: MixedLabel;
  scoreColor: string;
  decisionLabelText: string;
  decisionText: string;
  noi: number;
  cashflowMonat: number;
  noiYield: number;
  dscr: number | null;
  valueGap: number;
  valueGapPct: number;
  allIn: number;
  tips: { label: string; detail: string }[];
}) {
  return (
    <div
      className="rounded-2xl p-4 text-white shadow-md border overflow-hidden"
      style={{ background: BRAND }}
    >
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div className="space-y-1 md:flex-1">
          <div className="text-xs opacity-80">
            Zwischenstand (auf Basis deiner Eingaben)
          </div>
          <div className="text-lg font-semibold">
            {decisionLabelText}
          </div>

          <div className="text-sm opacity-90 max-w-xl">
            {decisionText}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div>
              Cashflow mtl. nach Finanzierung:{" "}
              {eur(Math.round(cashflowMonat))}{" "}
              {cashflowMonat >= 0 ? "(positiv)" : "(negativ)"}
            </div>
            <div>
              NOI gesamt p.a.: {eur(Math.round(noi))} - NOI-Yield:{" "}
              {pct(noiYield)}
            </div>
            <div>
              DSCR: {dscr ? dscr.toFixed(2) : "-"} - Werteinfluss (Cap):{" "}
              {eur(Math.round(valueGap))} (
              {signedPct(valueGapPct)})
            </div>
            <div>
              All-in-Kaufpreis (inkl. NK):{" "}
              {eur(Math.round(allIn))}
            </div>
            <div className="text-xs opacity-80 pt-1">
              NOI = Netto-Mietertrag Wohnen + Gewerbe nach laufenden Kosten
              und Instandhaltung, vor Finanzierung.
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ScoreDonut
            scorePct={scorePct}
            scoreColor={scoreColor}
            label={scoreLabel}
            size={62}
          />
          <div className="flex flex-wrap gap-2 justify-center text-[11px]">
            <Badge
              icon={<Banknote className="h-3.5 w-3.5" />}
              text={`${eur(Math.round(cashflowMonat))} mtl.`}
              hint="Cashflow (Y1)"
            />
            <Badge
              icon={<Gauge className="h-3.5 w-3.5" />}
              text={`NOI-Yield ${pct(noiYield)}`}
              hint="NOI / Kaufpreis"
            />
            <Badge
              icon={<Sigma className="h-3.5 w-3.5" />}
              text={`DSCR ${dscr ? dscr.toFixed(2) : "-"}`}
              hint="NOI / Schuldienst"
            />
          </div>
        </div>
      </div>

      {/* Hebel */}
      <div className="mt-4">
        <div className="text-xs opacity-80 mb-1">
          Schnelle Hebel für diesen Mixed-Use-Deal
        </div>
        <ul className="text-sm space-y-2">
          {tips.map((t, i) => (
            <li key={i}>
              <b>{t.label}:</b> {t.detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
