// Abschnitt 1/3 - Imports, UI-Atoms, Helfer & Kern-Berechnung

// src/routes/MixedUseCheck.tsx
import React from "react";
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
  Building2,
  Factory,
  ChevronDown,
} from "lucide-react";
// recharts removed
import PlanGuard from "@/components/PlanGuard";
import { Link } from "react-router-dom";
import { eur, pct } from "../core/calcs";

/* ----------------------------------------------------------------
 * BRAND / STYLE (an MFH-Check angepasst)
 * ---------------------------------------------------------------- */

const BRAND = "#1b2c47";
const CTA = "#ffde59";
const SURFACE = "#F7F7FA";
const SURFACE_ALT = "#EAEAEE";

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
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const displayValue = focused
    ? String(rawValue)
    : rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</div>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type={focused ? "number" : "text"}
          step={step} value={displayValue} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")))}
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
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <span className="w-24 text-right tabular-nums">{pct(value)}</span>
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
    <PlanGuard required="pro">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
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
  const [ltvPct, setLtvPct] = React.useState(0.75);
  const [zinsPct, setZinsPct] = React.useState(0.041);
  const [tilgungPct, setTilgungPct] = React.useState(0.02);

  // Segment Wohnen
  const [wFl, setWFl] = React.useState(750);
  const [wRentM2, setWRentM2] = React.useState(11.8);
  const [wLeer, setWLeer] = React.useState(0.06);
  const [wOpexBrutto, setWOpexBrutto] = React.useState(0.25);
  const [wCap, setWCap] = React.useState(0.055);

  // Segment Gewerbe
  const [gFl, setGFl] = React.useState(450);
  const [gRentM2, setGRentM2] = React.useState(16.5);
  const [gLeer, setGLeer] = React.useState(0.1);
  const [gOpexBrutto, setGOpexBrutto] = React.useState(0.3);
  const [gCap, setGCap] = React.useState(0.065);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = React.useState(0);
  const [wRentAdjPct, setWRentAdjPct] = React.useState(0);
  const [gRentAdjPct, setGRentAdjPct] = React.useState(0);
  const [applyAdjustments, setApplyAdjustments] = React.useState(true);
  const [pdfLoading, setPdfLoading] = React.useState(false);

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

  // Projektion
  const projection = React.useMemo(() => {
    const years = 10;
    const data: {
      year: number;
      Cashflow: number;
      Tilgung: number;
      Vermoegen: number;
    }[] = [];
    let outstanding = out.loan;
    const baseGrossW0 = out.grossW;
    const baseGrossG0 = out.grossG;
    const baseOpexW0 = out.opexW;
    const baseOpexG0 = out.opexG;

    const wRentGrowth = 0.02;
    const gRentGrowth = 0.015; // Gewerbe konservativer
    const costGrowth = 0.02;
    const valueGrowthAssume = 0.02;

    for (let t = 1; t <= years; t++) {
      const grossW = baseGrossW0 * Math.pow(1 + wRentGrowth, t - 1);
      const effW = grossW * (1 - wLeer);
      const opexW = baseOpexW0 * Math.pow(1 + costGrowth, t - 1);

      const grossG = baseGrossG0 * Math.pow(1 + gRentGrowth, t - 1);
      const effG = grossG * (1 - gLeer);
      const opexG = baseOpexG0 * Math.pow(1 + costGrowth, t - 1);

      const noiT = effW - opexW + (effG - opexG);
      const interest = inUse.financingOn ? outstanding * zinsPct : 0;
      const annu = inUse.financingOn
        ? out.loan * (zinsPct + tilgungPct)
        : 0;
      const tilg = Math.max(0, annu - interest);
      outstanding = Math.max(0, outstanding - tilg);
      const cf = noiT - annu;
      const verm = tilg + inUse.kaufpreis * valueGrowthAssume;

      data.push({
        year: t,
        Cashflow: Math.round(cf),
        Tilgung: Math.round(tilg),
        Vermoegen: Math.round(verm),
      });
    }
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ out, inUse, zinsPct, tilgungPct, wLeer, gLeer })]);

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
              setFinancingOn(true); setLtvPct(0.75); setZinsPct(0.041); setTilgungPct(0.02);
              setWFl(750); setWRentM2(11.8); setWLeer(0.06); setWOpexBrutto(0.25); setWCap(0.055);
              setGFl(450); setGRentM2(16.5); setGLeer(0.1); setGOpexBrutto(0.3); setGCap(0.065);
              setPriceAdjPct(0); setWRentAdjPct(0); setGRentAdjPct(0); setApplyAdjustments(true);
            }} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} /> Beispiel
            </button>
            <ExportDropdown onRun={runSelectedExports} />
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

            {/* Kaufpreis */}
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

            {/* Wohnen */}
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

            {/* Gewerbe */}
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

            {/* Finanzierung */}
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

            {/* Spielwiese */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Was-wäre-wenn Spielwiese</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <style>{`.mix-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.mix-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.mix-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Preis & Mieten anpassen</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Wirkt live auf Score</span>
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
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.neg ? (s.value < 0 ? "#4ade80" : s.value > 0 ? "#f87171" : "rgba(255,255,255,0.5)") : (s.value > 0 ? "#4ade80" : s.value < 0 ? "#f87171" : "rgba(255,255,255,0.5)") }}>{signedPct(s.value)}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={0.005} value={s.value} onChange={(e) => s.set(Number(e.target.value))} className="mix-range" />
                  </div>
                ))}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                  Anpassungen in Bewertung berücksichtigen
                </label>
              </div>
            </div>

            {/* Detailberechnungen */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Detailberechnungen</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatlicher Cashflow</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Effektive Miete Wohnen", value: Math.round(out.noiW / 12 + out.noiW * 0.1 / 12), positive: true },
                  { label: "Effektive Miete Gewerbe", value: Math.round(out.noiG / 12 + out.noiG * 0.1 / 12), positive: true },
                  { label: "Betriebskosten gesamt", value: -Math.round((out.cashflowMonat - out.noiW/12 - out.noiG/12) * -1), positive: false },
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
            <div style={{ borderRadius: 16, padding: 20, background: "linear-gradient(135deg, rgba(15,44,138,0.85) 0%, rgba(124,58,237,0.65) 100%)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Dein Ergebnis (live)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round"/>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Empfehlung</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: out.scoreLabel === "BUY" ? "#4ade80" : out.scoreLabel === "CHECK" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>{decisionLabelText}</div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(out.cashflowMonat)), good: out.cashflowMonat >= 300, okay: out.cashflowMonat >= 0 },
                  { label: "NOI-Yield", value: pct(out.noiYield), good: out.noiYield >= 0.05, okay: out.noiYield >= 0.035 },
                  { label: "DSCR", value: out.dscr ? out.dscr.toFixed(2) : "-", good: !!out.dscr && out.dscr >= 1.2, okay: !!out.dscr && out.dscr >= 1.0 },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{kpi.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{kpi.value}</div>
                    <div style={{ marginTop: 6, display: "inline-block", padding: "2px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: kpi.good ? "rgba(74,222,128,0.15)" : kpi.okay ? "rgba(252,220,69,0.15)" : "rgba(248,113,113,0.15)", color: kpi.good ? "#4ade80" : kpi.okay ? "#FCDC45" : "#f87171" }}>
                      {kpi.good ? "Gut" : kpi.okay ? "Okay" : "Niedrig"}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: scoreColor, borderRadius: 2 }} />
              </div>
            </div>

            {/* Tipps */}
            {tips.length > 0 && (
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

