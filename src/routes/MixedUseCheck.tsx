// src/routes/MixedUseCheck.tsx
import React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import PlanGuard from "@/components/PlanGuard";
import { Link } from "react-router-dom";
import { eur, pct } from "../core/calcs";

/* ---------------- Kleine UI-Atoms (wie MFH) ---------------- */

function InfoBubble({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center ml-2 align-middle" title={text} aria-label={text}>
      <Info className="h-4 w-4 text-gray-400" />
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>;
}

function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card shadow-sm"
      title={hint}
    >
      {icon} {text}
    </span>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
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
      <input
        className="w-full rounded-xl border px-3 py-2"
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
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

function ScoreDonut({
  scorePct,
  scoreColor,
  label,
  size = 56,
}: {
  scorePct: number;
  scoreColor: string;
  label: "BUY" | "CHECK" | "NO";
  size?: number;
}) {
  const CIRC = 2 * Math.PI * 40;
  const dash = Math.max(0, Math.min(100, scorePct)) * (CIRC / 100);
  const gap = CIRC - dash;
  const box = 100;

  return (
    <div className="relative" style={{ width: size * 2, height: size * 2 }}>
      <svg viewBox={`0 0 ${box} ${box}`} className="absolute inset-0" aria-label={`Score ${scorePct}%`}>
        <defs>
          <linearGradient id="gradScoreMixed" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={scoreColor} />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="url(#gradScoreMixed)"
          strokeWidth="12"
          strokeDasharray={`${dash}, ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xl font-bold leading-5" style={{ color: scoreColor }}>
            {scorePct}%
          </div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function signedPct(x: number) {
  const v = Math.round(x * 100);
  return (x > 0 ? "+" : "") + v + "%";
}
function ts() {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}`;
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
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function ExportDropdown({ onRun }: { onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void }) {
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
    <div className="relative" ref={menuRef}>
      <button
        className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download className="h-4 w-4" /> Export
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-3 z-10">
          <div className="text-xs font-medium text-gray-500 mb-2">Formate wählen</div>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={json} onChange={(e) => setJson(e.target.checked)} />
            <span>JSON</span>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={csv} onChange={(e) => setCsv(e.target.checked)} />
            <span>CSV</span>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={pdf} onChange={(e) => setPdf(e.target.checked)} />
            <span>PDF</span>
          </label>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-[#0F2C8A] text-white hover:brightness-110" onClick={run}>
              Export starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Kern-Berechnung (Mixed) ---------------- */
/** Liefert Kern-Metriken für gemischt genutzte Objekte. */
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
  const valueGapPct = input.kaufpreis > 0 ? (wertAusCap - input.kaufpreis) / input.kaufpreis : 0;

  // Score: 0..1 basierend auf 4 Säulen (NOI-Yield, DSCR, ValueGap, CF>=0)
  const sNoi = Math.max(0, Math.min(1, (noiYield - 0.035) / (0.065 - 0.035))); // 3.5%..6.5%
  const sDscr = dscr == null ? 0.6 : Math.max(0, Math.min(1, (dscr - 1.0) / (1.6 - 1.0))); // 1.0..1.6
  const sGap = Math.max(0, Math.min(1, (valueGapPct - -0.05) / (0.10 - -0.05))); // -5%..+10%
  const sCf = Math.max(0, Math.min(1, (cashflowMonat - -200) / (300 - -200))); // -200..+300 mtl.
  const score = Math.max(0, Math.min(1, 0.34 * sNoi + 0.28 * sDscr + 0.24 * sGap + 0.14 * sCf));

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
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return null;
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

/** Benötigter Mietfaktor k auf beide Mieten (W+G gleicher Multiplikator) für CF=0 */
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
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return 1;
  const loan = base.kaufpreis * base.ltvPct;
  const annu = loan * (base.zinsPct + base.tilgungPct);
  const cfAt = (k: number) => {
    const grossW = base.wFl * (base.wRentM2 * k) * 12;
    const effW = grossW * (1 - base.wLeer);
    const opexW = grossW * base.wOpexBrutto;
    const grossG = base.gFl * (base.gRentM2 * k) * 12;
    const effG = grossG * (1 - base.gLeer);
    const opexG = grossG * base.gOpexBrutto;
    const noi = (effW - opexW) + (effG - opexG);
    return noi - annu;
  };
  // Bisection on k in [0.5 .. 2.5]
  let low = 0.5, high = 2.5;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const cf = cfAt(mid);
    if (cf >= 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

/* ---------------- Hauptkomponente (PRO) ---------------- */

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
  const [kaufpreis, setKaufpreis] = React.useState(2_400_000);
  const [nkGrEStPct, setNkGrEStPct] = React.useState(0.065);
  const [nkNotarPct, setNkNotarPct] = React.useState(0.01);
  const [nkGrundbuchPct, setNkGrundbuchPct] = React.useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = React.useState(0);
  const [nkSonstPct, setNkSonstPct] = React.useState(0.005);
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

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
  const scoreColor = out.score >= 0.7 ? "#16a34a" : out.score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Monatsdetails
  const monthlyEffRent = (out.effW + out.effG) / 12;
  const monthlyOpex = (out.opexW + out.opexG) / 12;
  const monthlyInterest = inUse.financingOn ? (out.loan * zinsPct) / 12 : 0;
  const monthlyPrincipal = inUse.financingOn ? (out.loan * tilgungPct) / 12 : 0;
  const monthlyAnnuity = inUse.financingOn ? out.annu / 12 : 0;

  // Wert-Gap
  const valueGap = Math.round(out.wertAusCap - inUse.kaufpreis);
  const gapPositive = valueGap >= 0;

  // Projektion
  const projection = React.useMemo(() => {
    const years = 10;
    const data: { year: number; Cashflow: number; Tilgung: number; Vermoegen: number }[] = [];
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

      const noiT = (effW - opexW) + (effG - opexG);
      const interest = inUse.financingOn ? outstanding * zinsPct : 0;
      const annu = inUse.financingOn ? out.loan * (zinsPct + tilgungPct) : 0;
      const tilg = Math.max(0, annu - interest);
      outstanding = Math.max(0, outstanding - tilg);
      const cf = noiT - annu;
      const verm = tilg + inUse.kaufpreis * valueGrowthAssume;

      data.push({ year: t, Cashflow: Math.round(cf), Tilgung: Math.round(tilg), Vermoegen: Math.round(verm) });
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
    downloadBlob(`mixed_export_${ts()}.json`, "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
  }

  function exportCSV() {
    const rows: (string | number)[][] = [];
    rows.push(["Segment", "Fläche (m²)", "Ø Kaltmiete (€/m²)", "Leerstand (%)", "Opex (% Brutto)", "Cap Rate"]);
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
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadBlob(`mixed_export_${ts()}.csv`, "text/csv;charset=utf-8", csv);
  }

  function exportPDF() {
    const html = `
<!doctype html>
<html lang="de">
<head><meta charset="utf-8" /><title>Mixed-Use Export – ${ts()}</title>
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
  <h1>Gemischt genutztes Objekt – Export</h1>
  <div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>

  <h2>Preis & NK</h2>
  <table>
    <tr><th>Kaufpreis</th><td>${eur(inUse.kaufpreis)}</td></tr>
    <tr><th>Summe NK</th><td>${pct(nkPct)} = ${eur(nkSum)}</td></tr>
  </table>

  <h2>Segmente</h2>
  <table>
    <tr><th>Segment</th><th>Fläche (m²)</th><th>Ø Kaltmiete (€/m²)</th><th>Leerstand</th><th>Opex (Brutto)</th><th>Cap</th></tr>
    <tr><td>Wohnen</td><td style="text-align:right;">${wFl.toLocaleString("de-DE")}</td><td style="text-align:right;">${wRentM2.toFixed(2)}</td><td>${pct(wLeer)}</td><td>${pct(wOpexBrutto)}</td><td>${pct(wCap)}</td></tr>
    <tr><td>Gewerbe</td><td style="text-align:right;">${gFl.toLocaleString("de-DE")}</td><td style="text-align:right;">${gRentM2.toFixed(2)}</td><td>${pct(gLeer)}</td><td>${pct(gOpexBrutto)}</td><td>${pct(gCap)}</td></tr>
  </table>

  <h2>NOI & Wert</h2>
  <table>
    <tr><th>NOI Wohnen p.a.</th><td>${eur(Math.round(out.noiW))}</td></tr>
    <tr><th>NOI Gewerbe p.a.</th><td>${eur(Math.round(out.noiG))}</td></tr>
    <tr><th>NOI gesamt p.a.</th><td>${eur(Math.round(out.noi))}</td></tr>
    <tr><th>Wert (Cap) gesamt</th><td>${eur(Math.round(out.wertAusCap))}</td></tr>
  </table>

  <h2>Bewertung</h2>
  <table>
    <tr><th>NOI-Yield</th><td>${pct(out.noiYield)}</td></tr>
    <tr><th>DSCR</th><td>${out.dscr ? out.dscr.toFixed(2) : "–"}</td></tr>
    <tr><th>Cashflow mtl.</th><td>${eur(Math.round(out.cashflowMonat))}</td></tr>
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

  function runSelectedExports(opts: { json: boolean; csv: boolean; pdf: boolean }) {
    if (opts.json) exportJSON();
    if (opts.csv) exportCSV();
    if (opts.pdf) exportPDF();
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-40">
        {/* Optionales Upgrade-Banner (dezent) */}
        <div className="rounded-xl border p-3 bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
          <span>
            Mixed-Use ist Teil von <b>IMMO Analyzer Pro</b>.
          </span>
          <Link to="/preise" className="px-3 py-1 rounded-lg border bg-white hover:bg-amber-100 transition">
            Jetzt upgraden
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-white grid place-items-center shadow">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Mixed-Use – Check (Wohnen + Gewerbe)</h2>
              <p className="text-muted-foreground text-sm">
                Segmentiert rechnen, sauber bewerten – mit Live-Score, Break-even & Projektion.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition"
              onClick={() => {
                setKaufpreis(2_400_000);
                setNkGrEStPct(0.065); setNkNotarPct(0.01); setNkGrundbuchPct(0.005); setNkMaklerPct(0); setNkSonstPct(0.005);
                setFinancingOn(true); setLtvPct(0.75); setZinsPct(0.041); setTilgungPct(0.02);
                setWFl(750); setWRentM2(11.8); setWLeer(0.06); setWOpexBrutto(0.25); setWCap(0.055);
                setGFl(450); setGRentM2(16.5); setGLeer(0.1); setGOpexBrutto(0.3); setGCap(0.065);
                setPriceAdjPct(0); setWRentAdjPct(0); setGRentAdjPct(0); setApplyAdjustments(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>

            <ExportDropdown onRun={runSelectedExports} />

            {/* Import */}
            <label
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition cursor-pointer"
              title="JSON importieren"
            >
              <Upload className="h-4 w-4" /> Import
              <input
                type="file"
                className="hidden"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    try {
                      const d = JSON.parse(String(r.result));
                      setKaufpreis(Number(d.kaufpreis) || 2_400_000);
                      setNkGrEStPct(Number(d.nkGrEStPct) || 0.065);
                      setNkNotarPct(Number(d.nkNotarPct) || 0.01);
                      setNkGrundbuchPct(Number(d.nkGrundbuchPct) || 0.005);
                      setNkMaklerPct(Number(d.nkMaklerPct) || 0);
                      setNkSonstPct(Number(d.nkSonstPct) || 0.005);

                      setFinancingOn(Boolean(d.financingOn));
                      setLtvPct(Number(d.ltvPct) || 0.75);
                      setZinsPct(Number(d.zinsPct) || 0.041);
                      setTilgungPct(Number(d.tilgungPct) || 0.02);

                      setWFl(Number(d.wFl) || 750);
                      setWRentM2(Number(d.wRentM2) || 11.8);
                      setWLeer(Number(d.wLeer) || 0.06);
                      setWOpexBrutto(Number(d.wOpexBrutto) || 0.25);
                      setWCap(Number(d.wCap) || 0.055);

                      setGFl(Number(d.gFl) || 450);
                      setGRentM2(Number(d.gRentM2) || 16.5);
                      setGLeer(Number(d.gLeer) || 0.1);
                      setGOpexBrutto(Number(d.gOpexBrutto) || 0.3);
                      setGCap(Number(d.gCap) || 0.065);

                      setPriceAdjPct(Number(d.priceAdjPct) || 0);
                      setWRentAdjPct(Number(d.wRentAdjPct) || 0);
                      setGRentAdjPct(Number(d.gRentAdjPct) || 0);
                      setApplyAdjustments(Boolean(d.applyAdjustments));
                    } catch {
                      alert("Ungültige Datei");
                    }
                  };
                  r.readAsText(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* Eingaben */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Eingaben</h2>

          {/* Grunddaten */}
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
              <div className="text-sm font-medium mt-2">Kaufnebenkosten (Split)</div>
              <PercentField label="Grunderwerbsteuer (%)" value={nkGrEStPct} onChange={setNkGrEStPct} step={0.0005} />
              <PercentField label="Notar (%)" value={nkNotarPct} onChange={setNkNotarPct} step={0.0005} />
              <PercentField label="Grundbuch (%)" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} step={0.0005} />
              <PercentField label="Makler (%)" value={nkMaklerPct} onChange={setNkMaklerPct} step={0.0005} />
              <PercentField label="Sonstiges/Puffer (%)" value={nkSonstPct} onChange={setNkSonstPct} step={0.0005} />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Summe NK: <b>{pct(nkPct)}</b> = {eur(Math.round(kaufpreis * nkPct))}.
            </div>
          </Card>

          {/* Wohnen */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <div className="text-base font-semibold">Segment: Wohnen</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <NumberField label="Fläche Wohnen (m²)" value={wFl} onChange={setWFl} />
              <NumberField label="Ø Kaltmiete Wohnen (€/m²/Monat)" value={wRentM2} onChange={setWRentM2} step={0.1} />
              <PercentField label="Leerstand Wohnen (%)" value={wLeer} onChange={setWLeer} />
              <PercentField
                label="Bewirtschaftungskosten Wohnen (Brutto %)"
                value={wOpexBrutto}
                onChange={setWOpexBrutto}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Cap Rate Wohnen
                  <InfoBubble text="Marktrendite-Annahme für Wohnen. Wert Wohnen ≈ NOI Wohnen / Cap Wohnen." />
                </span>
                <span className="text-xs text-muted-foreground">steigt ⇒ Wert sinkt</span>
              </div>
              <PercentField label="Cap Rate Wohnen (%)" value={wCap} onChange={setWCap} step={0.0005} min={0.02} max={0.12} />
            </div>
          </Card>

          {/* Gewerbe */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Factory className="h-4 w-4 text-emerald-600" />
              <div className="text-base font-semibold">Segment: Gewerbe</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <NumberField label="Fläche Gewerbe (m²)" value={gFl} onChange={setGFl} />
              <NumberField label="Ø Kaltmiete Gewerbe (€/m²/Monat)" value={gRentM2} onChange={setGRentM2} step={0.1} />
              <PercentField label="Leerstand Gewerbe (%)" value={gLeer} onChange={setGLeer} />
              <PercentField
                label="Bewirtschaftungskosten Gewerbe (Brutto %)"
                value={gOpexBrutto}
                onChange={setGOpexBrutto}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Cap Rate Gewerbe
                  <InfoBubble text="Marktrendite-Annahme für Gewerbe. Wert Gewerbe ≈ NOI Gewerbe / Cap Gewerbe." />
                </span>
                <span className="text-xs text-muted-foreground">steigt ⇒ Wert sinkt</span>
              </div>
              <PercentField label="Cap Rate Gewerbe (%)" value={gCap} onChange={setGCap} step={0.0005} min={0.02} max={0.15} />
            </div>
          </Card>

          {/* Finanzierung */}
          <Card>
            <div className="flex items-center justify-between">
              <label className="text-sm inline-flex items-center gap-2">
                <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} />
                Finanzierung berücksichtigen
              </label>
            </div>
            {financingOn && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct} />
                <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct} step={0.001} />
                <PercentField label="Tilgung p.a. (%)" value={tilgungPct} onChange={setTilgungPct} step={0.001} />
                <div className="text-xs text-muted-foreground">
                  Darlehen: <b>{eur(Math.round(out.loan))}</b> · Annuität p.a.: <b>{eur(Math.round(out.annu))}</b>
                </div>
              </div>
            )}
          </Card>

          {/* Bewertung & Profit-Spielplatz */}
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <div className="text-sm font-medium">Profit-Spielplatz</div>
              <label className="text-xs inline-flex items-center gap-2">
                <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} />{" "}
                in Bewertung verwenden
              </label>

              <PercentField
                label={`Kaufpreis ±% · aktuell: ${eur(Math.round(applyAdjustments ? adjPrice : kaufpreis))}`}
                value={priceAdjPct}
                onChange={setPriceAdjPct}
                step={0.005}
                min={-0.3}
                max={0.3}
              />
              <div className="text-xs text-muted-foreground -mt-2">
                {signedPct(priceAdjPct)} = {eur(Math.round(kaufpreis * (1 + priceAdjPct)))}
              </div>

              <PercentField
                label={`Miete Wohnen ±% · jetzt: ${wRentM2.toFixed(2)} €/m²`}
                value={wRentAdjPct}
                onChange={setWRentAdjPct}
                step={0.005}
                min={-0.2}
                max={0.4}
              />
              <div className="text-xs text-muted-foreground -mt-2">
                {signedPct(wRentAdjPct)} = {(wRentM2 * (1 + wRentAdjPct)).toFixed(2)} €/m²
              </div>

              <PercentField
                label={`Miete Gewerbe ±% · jetzt: ${gRentM2.toFixed(2)} €/m²`}
                value={gRentAdjPct}
                onChange={setGRentAdjPct}
                step={0.005}
                min={-0.2}
                max={0.4}
              />
              <div className="text-xs text-muted-foreground -mt-2">
                {signedPct(gRentAdjPct)} = {(gRentM2 * (1 + gRentAdjPct)).toFixed(2)} €/m²
              </div>
            </div>
          </Card>
        </section>

        {/* Wert vs. Kaufpreis */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Wert (NOI/Cap je Segment) vs. Kaufpreis
          </h2>
          <div className="relative">
            <Card className="overflow-hidden">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Deal",
                        Preis: Math.round(inUse.kaufpreis),
                        Wert: Math.round(out.wertAusCap),
                        WertW: Math.round(out.wertW),
                        WertG: Math.round(out.wertG),
                      },
                    ]}
                    margin={{ top: 20, right: 20, left: 0, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="gradPreisMixed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111827" />
                        <stop offset="100%" stopColor="#374151" />
                      </linearGradient>
                      <linearGradient id="gradWertMixed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <linearGradient id="gradWertW" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a5b4fc" />
                      </linearGradient>
                      <linearGradient id="gradWertG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#7dd3fc" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v: any) => v.toLocaleString("de-DE")} />
                    <RTooltip formatter={(v: any) => eur(v)} />
                    <Legend />
                    <Bar dataKey="Preis" fill="url(#gradPreisMixed)" radius={[10, 10, 0, 0]}>
                      <LabelList dataKey="Preis" position="top" formatter={(v: any) => eur(v)} />
                    </Bar>
                    <Bar dataKey="Wert" fill="url(#gradWertMixed)" radius={[10, 10, 0, 0]}>
                      <LabelList dataKey="Wert" position="top" formatter={(v: any) => eur(v)} />
                    </Bar>
                    <Bar dataKey="WertW" name="Wert Wohnen" fill="url(#gradWertW)" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="WertG" name="Wert Gewerbe" fill="url(#gradWertG)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={
                "absolute -top-3 right-3 px-2 py-1 rounded-full text-xs border " +
                (gapPositive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")
              }
            >
              {gapPositive ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(Math.round(valueGap)))} ({signedPct(out.valueGapPct)})
            </motion.span>
          </div>
        </section>

        {/* Projektion */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Projektion (10 Jahre)</h2>
          <Card className="overflow-hidden">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v: any) => v.toLocaleString("de-DE")} />
                  <RTooltip formatter={(v: any) => eur(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Cashflow" name="Cashflow p.a." stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Tilgung" name="Tilgung p.a." stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Vermoegen" name="Vermoegenszuwachs p.a." stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Monatsrechnung */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Monatsrechnung (Jahr 1)</h2>
          <Card>
            <ul className="text-sm text-foreground space-y-1">
              <li>Eff. Nettokaltmiete (mtl.): <b>{eur(Math.round(monthlyEffRent))}</b></li>
              <li>Bewirtschaftungskosten (mtl.): <b>{eur(Math.round(monthlyOpex))}</b></li>
              {financingOn && (
                <>
                  <li>Zinsen (mtl.): <b>{eur(Math.round(monthlyInterest))}</b></li>
                  <li>Tilgung (mtl.): <b>{eur(Math.round(monthlyPrincipal))}</b></li>
                </>
              )}
              <li>= Cashflow operativ (mtl.): <b>{eur(Math.round(out.cashflowMonat))}</b></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Hinweis: NOI = Eff. Kaltmiete – nicht umlagefähige BK (vereinfacht). Ohne Steuern.
            </p>
          </Card>
        </section>

        {/* Break-even & NK */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Break-even</h2>
          <Card>
            <div className="text-sm text-foreground mb-2">
              <p>
                <b>Was bedeutet Break-even?</b> Ab dieser Grenze ist der monatliche Cashflow (vor Steuern) nicht negativ.
                Oberhalb des Preises bzw. unterhalb der Mieten wird CF &lt; 0.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Max. Kaufpreis für CF = 0</span>
                <b>{bePrice != null ? eur(bePrice) : "– (nur mit Finanzierung berechenbar)"}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>Benötigter Mietfaktor (W+G gleich skaliert)</span>
                <b>{beRentK.toFixed(3)}×</b>
              </div>
              <div className="text-xs text-muted-foreground">
                Beispiel: Wohnen neu ≈ {(inUse.wRentM2 * beRentK).toFixed(2)} €/m² · Gewerbe neu ≈ {(inUse.gRentM2 * beRentK).toFixed(2)} €/m²
              </div>
            </div>
          </Card>

          <h2 className="text-lg font-semibold">Kaufnebenkosten im Detail</h2>
          <Card>
            <ul className="text-sm text-foreground space-y-1">
              <li>Grunderwerbsteuer: {pct(nkGrEStPct)} = {eur(nkSplits.grESt)}</li>
              <li>Notar: {pct(nkNotarPct)} = {eur(nkSplits.notar)}</li>
              <li>Grundbuch: {pct(nkGrundbuchPct)} = {eur(nkSplits.gb)}</li>
              <li>Makler: {pct(nkMaklerPct)} = {eur(nkSplits.makler)}</li>
              {nkSonstPct > 0 && <li>Sonstiges/Puffer: {pct(nkSonstPct)} = {eur(nkSplits.sonst)}</li>}
              <li className="mt-2"><b>Summe NK</b>: {pct(nkPct)} = <b>{eur(nkSum)}</b></li>
              <li>All-in = Kaufpreis + NK = <b>{eur(inUse.kaufpreis + nkSum)}</b></li>
            </ul>
          </Card>
        </section>

        {/* Glossar */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Glossar</h2>
          <Card>
            <dl className="text-sm text-foreground space-y-1.5">
              <div><span className="font-medium">NOI (Net Operating Income):</span> Eff. Kaltmiete – nicht umlagefähige Kosten (vereinfacht, ohne Steuern).</div>
              <div><span className="font-medium">DSCR:</span> NOI / Schuldienst (Zins+Tilgung). ≥ 1,2 ist oft solide.</div>
              <div><span className="font-medium">Cap Rate (segmenteigen):</span> Wert je Segment ≈ NOI / Cap des Segments.</div>
              <div><span className="font-medium">LTV:</span> Loan-to-Value, Darlehen / Kaufpreis.</div>
            </dl>
          </Card>
        </section>
      </div>

      {/* ---------- Sticky Ergebnis-Footer ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="p-3 flex items-center justify-between gap-3">
              {/* Links: Entscheidung + Badges */}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  Ergebnis <span className="text-[11px] text-gray-400">({viewTag})</span>
                </div>
                <div className="text-sm font-semibold truncate">
                  Entscheidung: {out.scoreLabel === "BUY" ? "Kaufen (unter Vorbehalt)" : out.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={`${eur(Math.round(out.cashflowMonat))} mtl.`} hint="Cashflow (Y1)" />
                  <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={`NOI-Yield ${pct(out.noiYield)}`} hint="NOI / Kaufpreis" />
                  <Badge icon={<Sigma className="h-3.5 w-3.5" />} text={`DSCR ${out.dscr ? out.dscr.toFixed(2) : "–"}`} hint="NOI / Schuldienst" />
                </div>
              </div>

              {/* Rechts: Score-Donut */}
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={out.scoreLabel} size={42} />
            </div>

            {/* kleine Progress-Bar */}
            <div className="h-1.5 w-full rounded-b-2xl overflow-hidden bg-surface">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.max(4, Math.min(100, scorePct))}%`,
                  background: `linear-gradient(90deg, ${scoreColor}, #60a5fa)`,
                }}
                aria-label={`Score ${scorePct}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
