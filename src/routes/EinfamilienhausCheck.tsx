// src/routes/EinfamilienhausCheck.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Home,
  Gauge,
  Banknote,
  Sigma,
  TrendingUp,
  Info,
  RefreshCw,
  Download,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Wand2,
  Settings2,
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

/* ---------------- Kleine Utils ---------------- */
const eur = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const signedPct = (x: number) => `${x > 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b);

/* ---------------- Kleine UI-Atoms ---------------- */
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
          <linearGradient id="gradScoreEfh" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#gradScoreEfh)"
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

/* ---------------- Helpers für Export ---------------- */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

/* ---------------- Export-Dropdown ---------------- */
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

/* ---------------- Kern-Berechnung (EFH Kapitalanlage) ---------------- */
type EfhInput = {
  kaufpreis: number;
  wohnflaecheM2: number;
  mieteProM2Monat: number;
  leerstandPct: number; // 0..1
  opexPctBrutto: number; // %-Satz auf Bruttokaltmiete p.a.
  nkGrEStPct: number;
  nkNotarPct: number;
  nkGrundbuchPct: number;
  nkMaklerPct: number;
  nkSonstPct: number;
  financingOn: boolean;
  ltvPct: number; // 0..1
  zinsPct: number; // p.a.
  tilgungPct: number; // p.a.
  capRateAssumed: number; // Bewertung
};
type EfhOutput = {
  grossRentYear: number;
  effRentYear: number;
  opexYear: number;
  noiYear: number;

  nkPct: number;
  nkSum: number;
  allIn: number;

  loan: number;
  annuityYear: number;
  dscr: number | null;

  wertAusCap: number;
  noiYield: number;

  cashflowMonat: number;

  score: number; // 0..1
  scoreLabel: "BUY" | "CHECK" | "NO";
};

function calcEfh(i: EfhInput): EfhOutput {
  const nkPct = i.nkGrEStPct + i.nkNotarPct + i.nkGrundbuchPct + i.nkMaklerPct + i.nkSonstPct;
  const nkSum = Math.round(i.kaufpreis * nkPct);
  const allIn = i.kaufpreis + nkSum;

  const grossRentYear = i.wohnflaecheM2 * i.mieteProM2Monat * 12;
  const effRentYear = grossRentYear * (1 - clamp(i.leerstandPct, 0, 0.95));
  const opexYear = grossRentYear * clamp(i.opexPctBrutto, 0, 0.95);
  const noiYear = Math.max(0, effRentYear - opexYear);

  const loan = i.financingOn ? i.kaufpreis * clamp(i.ltvPct, 0, 1) : 0;
  const annuityYear = i.financingOn ? loan * (clamp(i.zinsPct, 0, 1) + clamp(i.tilgungPct, 0, 1)) : 0;

  const dscr = i.financingOn ? (annuityYear > 0 ? noiYear / annuityYear : null) : null;

  const wertAusCap = i.capRateAssumed > 0 ? Math.round(noiYear / i.capRateAssumed) : 0;
  const noiYield = i.kaufpreis > 0 ? noiYear / i.kaufpreis : 0;

  const cashflowMonat = (effRentYear - opexYear - annuityYear) / 12;

  const compDscr = dscr == null ? 0.6 : Math.max(0, Math.min(1.2, dscr)) / 1.2; // ≥1.2 ~ gut
  const compYield = Math.max(0, Math.min(0.12, noiYield)) / 0.12; // 12% NOI-Yield „sehr gut“
  const compCF = cashflowMonat >= 0 ? 1 : Math.max(0, 1 + cashflowMonat / 1000); // bis -1000 €/Monat → 0

  const score = Math.max(0, Math.min(1, 0.45 * compDscr + 0.45 * compYield + 0.10 * compCF));
  const scoreLabel: EfhOutput["scoreLabel"] = score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";

  return {
    grossRentYear,
    effRentYear,
    opexYear,
    noiYear,
    nkPct,
    nkSum,
    allIn,
    loan,
    annuityYear,
    dscr,
    wertAusCap,
    noiYield,
    cashflowMonat,
    score,
    scoreLabel,
  };
}

/* ---------------- Break-even Solver ---------------- */
function breakEvenPriceForCashflowZero(base: EfhInput): number | null {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return null;
  const cfAt = (price: number) => {
    const gross = base.wohnflaecheM2 * base.mieteProM2Monat * 12;
    const eff = gross * (1 - base.leerstandPct);
    const opex = gross * base.opexPctBrutto;
    const loan = price * base.ltvPct;
    const annu = loan * (base.zinsPct + base.tilgungPct);
    return (eff - opex - annu) / 12;
  };
  let low = 0,
    high = Math.max(1, base.kaufpreis),
    cfH = cfAt(high),
    safe = 0;
  while (cfH > 0 && high < base.kaufpreis * 100 && safe < 40) {
    high *= 1.5;
    cfH = cfAt(high);
    safe++;
  }
  if (cfH > 0) return Math.round(high);
  for (let k = 0; k < 40; k++) {
    const mid = (low + high) / 2,
      cf = cfAt(mid);
    if (cf >= 0) low = mid;
    else high = mid;
  }
  return Math.round((low + high) / 2);
}
function breakEvenRentPerM2ForCashflowZero(base: EfhInput): number {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return 0;
  const cfAt = (rent: number) => {
    const gross = base.wohnflaecheM2 * rent * 12;
    const eff = gross * (1 - base.leerstandPct);
    const opex = base.wohnflaecheM2 * base.mieteProM2Monat * 12 * base.opexPctBrutto; // konservativ: OPEX auf Basis Ist-Miete
    const loan = base.kaufpreis * base.ltvPct;
    const annu = loan * (base.zinsPct + base.tilgungPct);
    return (eff - opex - annu) / 12;
  };
  let low = 0,
    high = Math.max(0.1, base.mieteProM2Monat),
    cfH = cfAt(high),
    safe = 0;
  while (cfH < 0 && high < 200 && safe < 60) {
    high *= 1.2;
    cfH = cfAt(high);
    safe++;
  }
  for (let k = 0; k < 40; k++) {
    const mid = (low + high) / 2,
      cf = cfAt(mid);
    if (cf >= 0) high = mid;
    else low = mid;
  }
  return Math.round(((low + high) / 2) * 100) / 100;
}

/* ---------------- Hauptkomponente (PRO) ---------------- */
export default function EinfamilienhausCheck() {
  return (
    <PlanGuard required="pro">
      <PageInner />
    </PlanGuard>
  );
}

/* ---------------- Wizard & Modus ---------------- */
type ViewMode = "einfach" | "erweitert";

function usePersistedState<T>(key: string, init: T) {
  const [val, setVal] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

function PageInner() {
  const DRAFT_KEY = "einfamilienhaus.pro.v3";
  const [mode, setMode] = usePersistedState<ViewMode>(`${DRAFT_KEY}.mode`, "einfach");
  const [wizardOn, setWizardOn] = usePersistedState<boolean>(`${DRAFT_KEY}.wizardOn`, false);
  const [step, setStep] = usePersistedState<number>(`${DRAFT_KEY}.step`, 1);

  // Eingaben (EFH, Kapitalanlage) – Defaults wie zuvor
  const [kaufpreis, setKaufpreis] = usePersistedState<number>(`${DRAFT_KEY}.kaufpreis`, 450_000);
  const [wohnflaecheM2, setWohnflaecheM2] = usePersistedState<number>(`${DRAFT_KEY}.wohnflaecheM2`, 140);
  const [mieteProM2Monat, setMieteProM2Monat] = usePersistedState<number>(`${DRAFT_KEY}.miete`, 13.5);
  const [leerstandPct, setLeerstandPct] = usePersistedState<number>(`${DRAFT_KEY}.leerstand`, 0.04);
  const [opexPctBrutto, setOpexPctBrutto] = usePersistedState<number>(`${DRAFT_KEY}.opex`, 0.22);

  // NK-Split
  const [nkGrEStPct, setNkGrEStPct] = usePersistedState<number>(`${DRAFT_KEY}.nkGrESt`, 0.05);
  const [nkNotarPct, setNkNotarPct] = usePersistedState<number>(`${DRAFT_KEY}.nkNotar`, 0.01);
  const [nkGrundbuchPct, setNkGrundbuchPct] = usePersistedState<number>(`${DRAFT_KEY}.nkGrundbuch`, 0.006);
  const [nkMaklerPct, setNkMaklerPct] = usePersistedState<number>(`${DRAFT_KEY}.nkMakler`, 0.03);
  const [nkSonstPct, setNkSonstPct] = usePersistedState<number>(`${DRAFT_KEY}.nkSonst`, 0.004);
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // Finanzierung
  const [financingOn, setFinancingOn] = usePersistedState<boolean>(`${DRAFT_KEY}.finOn`, true);
  const [ltvPct, setLtvPct] = usePersistedState<number>(`${DRAFT_KEY}.ltv`, 0.8);
  const [zinsPct, setZinsPct] = usePersistedState<number>(`${DRAFT_KEY}.zins`, 0.0375);
  const [tilgungPct, setTilgungPct] = usePersistedState<number>(`${DRAFT_KEY}.tilgung`, 0.02);

  // Bewertung
  const [capRatePct, setCapRatePct] = usePersistedState<number>(`${DRAFT_KEY}.cap`, 0.055);

  // Playground (Anpassungen)
  const [priceAdjPct, setPriceAdjPct] = usePersistedState<number>(`${DRAFT_KEY}.adjPrice`, 0);
  const [rentAdjPct, setRentAdjPct] = usePersistedState<number>(`${DRAFT_KEY}.adjRent`, 0);
  const [applyAdjustments, setApplyAdjustments] = usePersistedState<boolean>(`${DRAFT_KEY}.apply`, true);

  // Base & Adjusted Inputs
  const baseIn: EfhInput = {
    kaufpreis,
    wohnflaecheM2,
    mieteProM2Monat,
    leerstandPct,
    opexPctBrutto,
    nkGrEStPct,
    nkNotarPct,
    nkGrundbuchPct,
    nkMaklerPct,
    nkSonstPct,
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
    capRateAssumed: capRatePct,
  };
  const baseOut: EfhOutput = React.useMemo(() => calcEfh(baseIn), [JSON.stringify(baseIn)]);

  const adjIn: EfhInput = {
    ...baseIn,
    kaufpreis: Math.round(kaufpreis * (1 + priceAdjPct)),
    mieteProM2Monat: mieteProM2Monat * (1 + rentAdjPct),
  };
  const adjOut: EfhOutput = React.useMemo(() => calcEfh(adjIn), [JSON.stringify(adjIn)]);

  const viewIn = applyAdjustments ? adjIn : baseIn;
  const view = applyAdjustments ? adjOut : baseOut;
  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";

  // Ableitungen Monat
  const monthlyEffRent = view.effRentYear / 12;
  const monthlyOpex = view.opexYear / 12;
  const monthlyInterest = viewIn.financingOn ? (viewIn.kaufpreis * viewIn.ltvPct * viewIn.zinsPct) / 12 : 0;
  const monthlyPrincipal = viewIn.financingOn ? (viewIn.kaufpreis * viewIn.ltvPct * viewIn.tilgungPct) / 12 : 0;
  const monthlyAnnuity = monthlyInterest + monthlyPrincipal;

  // Score-UI
  const scorePct = Math.round(view.score * 100);
  const scoreColor = view.score >= 0.7 ? "#16a34a" : view.score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Wert vs Preis
  const priceForChart = viewIn.kaufpreis;
  const wertForChart = view.wertAusCap;
  const valueGap = Math.round(wertForChart - priceForChart);
  const valueGapPct = priceForChart > 0 ? (wertForChart - priceForChart) / priceForChart : 0;
  const gapPositive = valueGap >= 0;

  // Projektion (10 Jahre, simple Wachstumsschätzungen)
  const projection = React.useMemo(() => {
    const years = 10;
    const data: { year: number; Cashflow: number; Tilgung: number; Vermoegen: number }[] = [];
    let outstanding = viewIn.financingOn ? viewIn.kaufpreis * viewIn.ltvPct : 0;
    const baseGross0 = viewIn.wohnflaecheM2 * viewIn.mieteProM2Monat * 12;
    const baseOpex0 = baseGross0 * viewIn.opexPctBrutto;
    const rentGrowthPct = 0.02;
    const costGrowthPct = 0.02;
    const valueGrowthPct = 0.02;
    for (let t = 1; t <= years; t++) {
      const gross = baseGross0 * Math.pow(1 + rentGrowthPct, t - 1);
      const eff = gross * (1 - viewIn.leerstandPct);
      const opex = baseOpex0 * Math.pow(1 + costGrowthPct, t - 1);
      const interest = viewIn.financingOn ? outstanding * viewIn.zinsPct : 0;
      const annu = viewIn.financingOn ? viewIn.kaufpreis * viewIn.ltvPct * (viewIn.zinsPct + viewIn.tilgungPct) : 0;
      const tilgung = Math.max(0, annu - interest);
      outstanding = Math.max(0, outstanding - tilgung);
      const cf = eff - opex - annu;
      const verm = tilgung + viewIn.kaufpreis * valueGrowthPct;
      data.push({
        year: t,
        Cashflow: Math.round(cf),
        Tilgung: Math.round(tilgung),
        Vermoegen: Math.round(verm),
      });
    }
    return data;
  }, [JSON.stringify(viewIn)]);

  // NK-Splits Beträge (für Anzeige)
  const nkSplits = {
    grESt: Math.round(viewIn.kaufpreis * nkGrEStPct),
    notar: Math.round(viewIn.kaufpreis * nkNotarPct),
    gb: Math.round(viewIn.kaufpreis * nkGrundbuchPct),
    makler: Math.round(viewIn.kaufpreis * nkMaklerPct),
    sonst: Math.round(viewIn.kaufpreis * nkSonstPct),
  };

  /* ------------- Export/Import (JSON, CSV, PDF) ------------- */
  function exportJSON() {
    const payload = {
      generatedAt: new Date().toISOString(),
      mode,
      viewIn,
      result: view,
    };
    downloadBlob(`efh_export_${ts()}.json`, "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
  }
  function exportCSV() {
    const rows: (string | number)[][] = [];
    rows.push(["Feld", "Wert"]);
    rows.push(["Kaufpreis", viewIn.kaufpreis]);
    rows.push(["Wohnfläche (m²)", viewIn.wohnflaecheM2]);
    rows.push(["Miete €/m²", viewIn.mieteProM2Monat.toFixed(2)]);
    rows.push(["Leerstand %", (viewIn.leerstandPct * 100).toFixed(1)]);
    rows.push(["OPEX % brutto", (viewIn.opexPctBrutto * 100).toFixed(1)]);
    rows.push(["NK %", (view.nkPct * 100).toFixed(2)]);
    rows.push(["NK Summe", view.nkSum]);
    rows.push(["All-in", view.allIn]);
    rows.push(["NOI p.a.", view.noiYear]);
    rows.push(["NOI-Yield %", (view.noiYield * 100).toFixed(2)]);
    rows.push(["Wert (NOI/Cap)", view.wertAusCap]);
    rows.push(["Finanzierung", viewIn.financingOn ? "ja" : "nein"]);
    if (viewIn.financingOn) {
      rows.push(["LTV %", (viewIn.ltvPct * 100).toFixed(1)]);
      rows.push(["Zins %", (viewIn.zinsPct * 100).toFixed(2)]);
      rows.push(["Tilgung %", (viewIn.tilgungPct * 100).toFixed(2)]);
      rows.push(["Annuität p.a.", view.annuityYear]);
      rows.push(["DSCR", view.dscr == null ? "" : view.dscr.toFixed(2)]);
      rows.push(["Cashflow mtl.", Math.round(view.cashflowMonat)]);
    }
    const csv = rows.map((r) => r.map((s) => `"${String(s).replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadBlob(`efh_export_${ts()}.csv`, "text/csv;charset=utf-8", csv);
  }
  function exportPDF() {
    const html = `
<!doctype html>
<html lang="de"><head><meta charset="utf-8" />
<title>EFH Export – ${ts()}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans'; margin:24px; color:#111; }
h1 { font-size:20px; margin:0 0 4px; } h2 { font-size:16px; margin:16px 0 8px; }
table { width:100%; border-collapse:collapse; } th, td { padding:6px 8px; } tr + tr td { border-top:1px solid #eee; }
.meta { color:#555; font-size:12px; margin-bottom:12px; }
@media print { a[href]:after { content:""; } }
.badge { display:inline-block; padding:2px 8px; border-radius:9999px; font-size:12px; border:1px solid #ddd; margin-right:6px;}
</style></head>
<body>
  <h1>Einfamilienhaus – Export</h1>
  <div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")} · Modus: ${escapeHtml(mode)}</div>

  <h2>Zusammenfassung</h2>
  <table>
    <tr><th style="text-align:left;">Kaufpreis</th><td>${eur(viewIn.kaufpreis)}</td></tr>
    <tr><th style="text-align:left;">Wohnfläche (m²)</th><td>${viewIn.wohnflaecheM2.toLocaleString("de-DE")}</td></tr>
    <tr><th style="text-align:left;">Ø Kaltmiete (€/m²)</th><td>${viewIn.mieteProM2Monat.toFixed(2)}</td></tr>
    <tr><th style="text-align:left;">Leerstand</th><td>${pct(viewIn.leerstandPct)}</td></tr>
    <tr><th style="text-align:left;">Bewirtschaftungskosten</th><td>${pct(viewIn.opexPctBrutto)} (auf Brutto)</td></tr>
    <tr><th style="text-align:left;">NOI p.a.</th><td>${eur(view.noiYear)}</td></tr>
    <tr><th style="text-align:left;">Wert (NOI/Cap)</th><td>${eur(view.wertAusCap)}</td></tr>
    <tr><th style="text-align:left;">All-in (inkl. NK)</th><td>${eur(view.allIn)}</td></tr>
  </table>

  <h2>Finanzierung</h2>
  <table>
    <tr><th style="text-align:left;">Aktiv</th><td>${viewIn.financingOn ? "Ja" : "Nein"}</td></tr>
    ${
      viewIn.financingOn
        ? `
      <tr><th style="text-align:left;">LTV</th><td>${pct(viewIn.ltvPct)}</td></tr>
      <tr><th style="text-align:left;">Zins / Tilgung</th><td>${pct(viewIn.zinsPct)} / ${pct(viewIn.tilgungPct)}</td></tr>
      <tr><th style="text-align:left;">Annuität p.a.</th><td>${eur(view.annuityYear)}</td></tr>
      <tr><th style="text-align:left;">DSCR</th><td>${view.dscr == null ? "–" : view.dscr.toFixed(2)}</td></tr>`
        : ""
    }
  </table>

  <h2>Kaufnebenkosten</h2>
  <table>
    <tr><th style="text-align:left;">GrESt</th><td>${pct(nkGrEStPct)} = ${eur(nkSplits.grESt)}</td></tr>
    <tr><th style="text-align:left;">Notar</th><td>${pct(nkNotarPct)} = ${eur(nkSplits.notar)}</td></tr>
    <tr><th style="text-align:left;">Grundbuch</th><td>${pct(nkGrundbuchPct)} = ${eur(nkSplits.gb)}</td></tr>
    <tr><th style="text-align:left;">Makler</th><td>${pct(nkMaklerPct)} = ${eur(nkSplits.makler)}</td></tr>
    ${nkSonstPct > 0 ? `<tr><th style="text-align:left;">Sonstiges</th><td>${pct(nkSonstPct)} = ${eur(nkSplits.sonst)}</td></tr>` : ""}
    <tr><th style="text-align:left;">Summe NK</th><td><b>${pct(view.nkPct)} = ${eur(view.nkSum)}</b></td></tr>
  </table>

  <h2>Entscheidung</h2>
  <div>
    <span class="badge">Score: ${(view.score * 100).toFixed(0)}%</span>
    <span class="badge">Label: ${escapeHtml(view.scoreLabel)}</span>
    <span class="badge">NOI-Yield: ${(view.noiYield * 100).toFixed(2)}%</span>
    <span class="badge">CF/Monat: ${eur(Math.round(view.cashflowMonat))}</span>
  </div>

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

  // Beispiel-Reset
  function setExample() {
    setKaufpreis(450_000);
    setWohnflaecheM2(140);
    setMieteProM2Monat(13.5);
    setLeerstandPct(0.04);
    setOpexPctBrutto(0.22);
    setNkGrEStPct(0.05);
    setNkNotarPct(0.01);
    setNkGrundbuchPct(0.006);
    setNkMaklerPct(0.03);
    setNkSonstPct(0.004);
    setFinancingOn(true);
    setLtvPct(0.8);
    setZinsPct(0.0375);
    setTilgungPct(0.02);
    setCapRatePct(0.055);
    setPriceAdjPct(0);
    setRentAdjPct(0);
    setApplyAdjustments(true);
  }

  // Import
  function importJsonFile(f: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        const num = (x: any, fb: number) => (Number.isFinite(Number(x)) ? Number(x) : fb);
        const bool = (x: any, fb: boolean) => (typeof x === "boolean" ? x : fb);

        setMode(d.mode === "erweitert" ? "erweitert" : "einfach");
        setKaufpreis(num(d.viewIn?.kaufpreis ?? d.kaufpreis, 450000));
        setWohnflaecheM2(num(d.viewIn?.wohnflaecheM2 ?? d.wohnflaecheM2, 140));
        setMieteProM2Monat(num(d.viewIn?.mieteProM2Monat ?? d.mieteProM2Monat, 13.5));
        setLeerstandPct(num(d.viewIn?.leerstandPct ?? d.leerstandPct, 0.04));
        setOpexPctBrutto(num(d.viewIn?.opexPctBrutto ?? d.opexPctBrutto, 0.22));
        setNkGrEStPct(num(d.viewIn?.nkGrEStPct ?? d.nkGrEStPct, 0.05));
        setNkNotarPct(num(d.viewIn?.nkNotarPct ?? d.nkNotarPct, 0.01));
        setNkGrundbuchPct(num(d.viewIn?.nkGrundbuchPct ?? d.nkGrundbuchPct, 0.006));
        setNkMaklerPct(num(d.viewIn?.nkMaklerPct ?? d.nkMaklerPct, 0.03));
        setNkSonstPct(num(d.viewIn?.nkSonstPct ?? d.nkSonstPct, 0.004));
        setFinancingOn(bool(d.viewIn?.financingOn ?? d.financingOn, true));
        setLtvPct(num(d.viewIn?.ltvPct ?? d.ltvPct, 0.8));
        setZinsPct(num(d.viewIn?.zinsPct ?? d.zinsPct, 0.0375));
        setTilgungPct(num(d.viewIn?.tilgungPct ?? d.tilgungPct, 0.02));
        setCapRatePct(num(d.viewIn?.capRateAssumed ?? d.capRateAssumed ?? d.capRatePct, 0.055));
        setPriceAdjPct(num(d.priceAdjPct ?? 0, 0));
        setRentAdjPct(num(d.rentAdjPct ?? 0, 0));
        setApplyAdjustments(bool(d.applyAdjustments ?? true, true));
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(f);
  }

  /* ---------------- Wizard UI ---------------- */
  const steps = [
    { id: 1, title: "Objekt", desc: "Kaufpreis & Fläche" },
    { id: 2, title: "Miete", desc: "Kaltmiete & Leerstand" },
    { id: 3, title: "Finanzierung", desc: "LTV, Zins, Tilgung" },
    { id: 4, title: "Ergebnis", desc: "Score & Wert" },
  ];

  function Stepper() {
    const pctDone = ((step - 1) / (steps.length - 1)) * 100;
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          {steps.map((s) => (
            <div key={s.id} className="flex-1 flex items-center">
              <div
                className={
                  "inline-flex items-center gap-1 px-2 py-1 rounded-lg border " +
                  (step >= s.id ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white")
                }
              >
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border" />}
                <span className="font-medium">{s.title}</span>
              </div>
              {s.id !== steps.length && <div className="flex-1 h-[2px] bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
        <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-[#0F2C8A]" style={{ width: `${pctDone}%` }} />
        </div>
      </div>
    );
  }

  function WizardBody() {
    return (
      <Card>
        <Stepper />
        {step === 1 && (
          <div className="grid gap-3">
            <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
            <NumberField label="Wohnfläche (m²)" value={wohnflaecheM2} onChange={setWohnflaecheM2} />
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3">
            <NumberField
              label="Ø Kaltmiete (€/m²/Monat)"
              value={mieteProM2Monat}
              onChange={setMieteProM2Monat}
              step={0.1}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Leerstand (Quote)</span>
              <InfoBubble text="Mietausfall durch Fluktuation/Neuvermietung, technisch & wirtschaftlich." />
            </div>
            <PercentField label="Leerstand (%)" value={leerstandPct} onChange={setLeerstandPct} min={0} max={0.95} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bewirtschaftungskosten (% auf Bruttokaltmiete)</span>
              <InfoBubble text="Instandhaltung, Verwaltung, nicht umlagefähige Kosten (vereinfacht)." />
            </div>
            <PercentField label="Betriebskosten (Brutto)" value={opexPctBrutto} onChange={setOpexPctBrutto} />
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-3">
            <label className="text-sm inline-flex items-center gap-2">
              <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} />
              Finanzierung berücksichtigen
            </label>
            {financingOn && (
              <>
                <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct} />
                <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct} step={0.001} />
                <PercentField label="Tilgung p.a. (%)" value={tilgungPct} onChange={setTilgungPct} step={0.001} />
                <div className="text-xs text-muted-foreground">
                  Darlehen: <b>{eur(Math.round(viewIn.kaufpreis * viewIn.ltvPct))}</b> · Annuität p.a.:{" "}
                  <b>{eur(Math.round(view.annuityYear))}</b>
                </div>
              </>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-3">
            <div className="rounded-xl border p-3 bg-gray-50">
              <div className="text-sm font-medium mb-2">Ergebnis</div>
              <div className="flex items-center gap-4">
                <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={view.scoreLabel} size={38} />
                <div className="grid text-sm gap-1">
                  <div>Entscheidung: <b>{view.scoreLabel === "BUY" ? "Kaufen (unter Vorbehalt)" : view.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein"}</b></div>
                  <div>NOI-Yield: <b>{pct(view.noiYield)}</b></div>
                  <div>Cashflow mtl.: <b>{eur(Math.round(view.cashflowMonat))}</b></div>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Tipp: Mit dem <b>Erweitert-Modus</b> kannst du Cap-Rate, NK-Split und den Profit-Spielplatz nutzen.
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button
            className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 border bg-white hover:bg-gray-50"
            onClick={() => setWizardOn(false)}
            title="Wizard verlassen"
          >
            Beenden
          </button>
          <div className="flex items-center gap-2">
            <button
              disabled={step === 1}
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 border bg-white enabled:hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setStep(Math.max(1, step - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            {step < steps.length ? (
              <button
                className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-[#0F2C8A] text-white hover:brightness-110"
                onClick={() => setStep(Math.min(steps.length, step + 1))}
              >
                Weiter <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-emerald-600 text-white hover:brightness-110"
                onClick={() => setWizardOn(false)}
              >
                Ergebnis anzeigen <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-40">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-white grid place-items-center shadow">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Einfamilienhaus – Analyzer (Kapitalanlage)</h2>
              <p className="text-muted-foreground text-sm">
                Pro-Modul: Score, Break-even, Projektion, Export – jetzt mit <b>Wizzard</b> & <b>Einfach/Erweitert</b>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Modus-Schalter */}
            <div className="inline-flex rounded-xl border p-1 bg-white text-sm" title="Modus wählen">
              <button
                className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${mode === "einfach" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setMode("einfach")}
              >
                <Wand2 className="h-4 w-4" /> Einfach
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${mode === "erweitert" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setMode("erweitert")}
              >
                <Settings2 className="h-4 w-4" /> Erweitert
              </button>
            </div>

            {/* Wizard */}
            <button
              className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${wizardOn ? "bg-[#0F2C8A] text-white" : "bg-card/80"} border shadow-sm hover:shadow transition`}
              onClick={() => {
                setWizardOn(!wizardOn);
                if (!wizardOn) setStep(1);
              }}
              title="Schritt-für-Schritt starten"
            >
              <Wand2 className="h-4 w-4" /> Wizzard {wizardOn ? " (aktiv)" : ""}
            </button>

            {/* Beispiel */}
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition"
              onClick={setExample}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>

            {/* Export */}
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
                  if (f) importJsonFile(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* WIZZARD */}
        {wizardOn && <WizardBody />}

        {/* Formular-Ansicht (wenn Wizard aus) */}
        {!wizardOn && (
          <>
            {/* Eingaben */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Eingaben</h2>

              {/* Kernfelder – immer sichtbar */}
              <Card>
                <div className="grid grid-cols-1 gap-3">
                  <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
                  <NumberField label="Wohnfläche (m²)" value={wohnflaecheM2} onChange={setWohnflaecheM2} />
                  <NumberField
                    label="Ø Kaltmiete (€/m²/Monat)"
                    value={mieteProM2Monat}
                    onChange={setMieteProM2Monat}
                    step={0.1}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Leerstand (Quote)</span>
                    <InfoBubble text="Mietausfall durch Fluktuation/Neuvermietung, technisch & wirtschaftlich." />
                  </div>
                  <PercentField label="Leerstand (%)" value={leerstandPct} onChange={setLeerstandPct} min={0} max={0.95} />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bewirtschaftungskosten (% auf Bruttokaltmiete)</span>
                    <InfoBubble text="Instandhaltung, Verwaltung, nicht umlagefähige Kosten (vereinfacht)." />
                  </div>
                  <PercentField label="Betriebskosten (Brutto)" value={opexPctBrutto} onChange={setOpexPctBrutto} />
                </div>
              </Card>

              {/* Erweiterte Sektionen */}
              {mode === "erweitert" && (
                <>
                  {/* NK-Split */}
                  <Card>
                    <div className="text-sm font-medium mb-2">Kaufnebenkosten (Split)</div>
                    <div className="grid grid-cols-1 gap-3">
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
                          Darlehen: <b>{eur(Math.round(viewIn.kaufpreis * viewIn.ltvPct))}</b> · Annuität p.a.:{" "}
                          <b>{eur(Math.round(view.annuityYear))}</b>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Bewertung & Playground */}
                  <Card>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Cap Rate
                          <InfoBubble text="Wert ≈ NOI / Cap. Höhere Cap ⇒ niedrigerer Wert (c.p.)." />
                        </span>
                        <span className="text-xs text-muted-foreground">steigt ⇒ Wert sinkt</span>
                      </div>
                      <PercentField label="Cap Rate (%)" value={capRatePct} onChange={setCapRatePct} step={0.0005} min={0.02} max={0.12} />

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Profit-Spielplatz</div>
                        <label className="text-xs inline-flex items-center gap-2">
                          <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} /> in
                          Bewertung verwenden
                        </label>
                      </div>

                      <PercentField
                        label={`Kaufpreis ±% · aktuell: ${eur(Math.round(applyAdjustments ? adjIn.kaufpreis : kaufpreis))}`}
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
                        label={`Miete/m² ±% · jetzt: ${mieteProM2Monat.toFixed(2)} €/m²`}
                        value={rentAdjPct}
                        onChange={setRentAdjPct}
                        step={0.005}
                        min={-0.2}
                        max={0.4}
                      />
                      <div className="text-xs text-muted-foreground -mt-2">
                        {signedPct(rentAdjPct)} = {(mieteProM2Monat * (1 + rentAdjPct)).toFixed(2)} €/m²
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </section>

            {/* Wert vs. Kaufpreis */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Wert (NOI/Cap) vs. Kaufpreis
              </h2>
              <div className="relative">
                <Card className="overflow-hidden">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[{ name: "Deal", Preis: Math.round(priceForChart), Wert: Math.round(wertForChart) }]}
                        margin={{ top: 20, right: 20, left: 0, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="gradPreisEFH" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#111827" />
                            <stop offset="100%" stopColor="#374151" />
                          </linearGradient>
                          <linearGradient id="gradWertEFH" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v: any) => v.toLocaleString("de-DE")} />
                        <RTooltip formatter={(v: any) => eur(v)} />
                        <Legend />
                        <Bar dataKey="Preis" fill="url(#gradPreisEFH)" radius={[10, 10, 0, 0]}>
                          <LabelList dataKey="Preis" position="top" formatter={(v: any) => eur(v)} />
                        </Bar>
                        <Bar dataKey="Wert" fill="url(#gradWertEFH)" radius={[10, 10, 0, 0]}>
                          <LabelList dataKey="Wert" position="top" formatter={(v: any) => eur(v)} />
                        </Bar>
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
                  {gapPositive ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(Math.round(valueGap)))} ({signedPct(valueGapPct)})
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
                  <li>= Cashflow operativ (mtl.): <b>{eur(Math.round(monthlyEffRent - monthlyOpex - monthlyAnnuity))}</b></li>
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
                  <p><b>Was bedeutet Break-even?</b> Ab dieser Grenze ist der monatliche Cashflow (vor Steuern) nicht negativ.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Max. Kaufpreis für CF = 0</span>
                    <b>{breakEvenPriceForCashflowZero(viewIn) != null ? eur(breakEvenPriceForCashflowZero(viewIn)!) : "– (nur mit Finanzierung berechenbar)"}</b>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Benötigte Miete je m²</span>
                    <b>{breakEvenRentPerM2ForCashflowZero(viewIn).toFixed(2)} €/m²</b>
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
                  <li className="mt-2"><b>Summe NK</b>: {pct(view.nkPct)} = <b>{eur(view.nkSum)}</b></li>
                  <li>All-in = Kaufpreis + NK = <b>{eur(view.allIn)}</b></li>
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
                  <div><span className="font-medium">Cap Rate:</span> Marktrendite-Annahme; Wert ≈ NOI / Cap.</div>
                  <div><span className="font-medium">LTV:</span> Loan-to-Value, Darlehen / Kaufpreis.</div>
                </dl>
              </Card>
            </section>
          </>
        )}
      </div>

      {/* ---------- Sticky Ergebnis-Footer ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  Ergebnis <span className="text-[11px] text-gray-400">({viewTag})</span>
                </div>
                <div className="text-sm font-semibold truncate">
                  Entscheidung: {view.scoreLabel === "BUY" ? "Kaufen (unter Vorbehalt)" : view.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={`${eur(Math.round(view.cashflowMonat))} mtl.`} hint="Cashflow (Y1)" />
                  <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={`NOI-Yield ${pct(view.noiYield)}`} hint="NOI / Kaufpreis" />
                  <Badge icon={<Sigma className="h-3.5 w-3.5" />} text={`DSCR ${view.dscr ? view.dscr.toFixed(2) : "–"}`} hint="NOI / Schuldienst" />
                </div>
              </div>
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={view.scoreLabel} size={42} />
            </div>
            <div className="h-1.5 w-full rounded-b-2xl overflow-hidden bg-surface">
              <div
                className="h-full transition-all"
                style={{ width: `${Math.max(4, Math.min(100, scorePct))}%`, background: `linear-gradient(90deg, ${scoreColor}, #60a5fa)` }}
                aria-label={`Score ${scorePct}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
