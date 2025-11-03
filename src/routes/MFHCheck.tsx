// src/routes/MFHCheck.tsx
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
import { calcMfh, eur, pct, type MfhInput, type MfhOutput } from "../core/calcs";
import PlanGuard from "@/components/PlanGuard";
import { Link } from "react-router-dom";

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
    <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>
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
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
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
      <svg
        viewBox={`0 0 ${box} ${box}`}
        className="absolute inset-0"
        aria-label={`Score ${scorePct}%`}
      >
        <defs>
          <linearGradient id="gradScoreMfh" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#gradScoreMfh)"
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

function UpgradeBanner() {
  return (
    <div className="rounded-xl border p-3 bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
      <span>
        Mehr Module & Funktionen in <b>IMMO Analyzer Pro</b>.
      </span>
      <Link
        to="/preise"
        className="px-3 py-1 rounded-lg border bg-white hover:bg-amber-100 transition"
      >
        Jetzt upgraden
      </Link>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

type UnitsMode = "gesamt" | "einheiten";
type UnitRow = { id: string; label: string; sqm: number | ""; rent: number | "" };

function num(x: any, fb: number) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}
function signedPct(x: number) {
  const v = Math.round(x * 100);
  return (x > 0 ? "+" : "") + v + "%";
}
function scoreLabelText(s: "BUY" | "CHECK" | "NO") {
  if (s === "BUY") return "Kaufen (unter Vorbehalt)";
  if (s === "CHECK") return "Weiter prüfen";
  return "Eher Nein";
}

// Build-safe Varianten (kein replaceAll)
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
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
    if (!json && !csv && !pdf) {
      onRun({ json: true, csv: false, pdf: false });
    } else {
      onRun({ json, csv, pdf });
    }
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
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-3 z-10"
        >
          <div className="text-xs font-medium text-gray-500 mb-2">
            Formate wählen
          </div>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={json}
              onChange={(e) => setJson(e.target.checked)}
            />
            <span>JSON</span>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={csv}
              onChange={(e) => setCsv(e.target.checked)}
            />
            <span>CSV</span>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={pdf}
              onChange={(e) => setPdf(e.target.checked)}
            />
            <span>PDF</span>
          </label>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-lg bg-[#0F2C8A] text-white hover:brightness-110"
              onClick={run}
            >
              Export starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Break-even Solver (MFH) ---------------- */

function breakEvenPriceForCashflowZero(base: MfhInput): number | null {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0)
    return null;
  const cfAt = (price: number) => {
    const gross =
      (base.gesamtFlaecheM2 ?? base.flaecheM2) *
      base.mieteProM2Monat *
      12;
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

function breakEvenRentPerM2ForCashflowZero(base: MfhInput): number {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0)
    return 0;
  const cfAt = (rent: number) => {
    const gross = (base.gesamtFlaecheM2 ?? base.flaecheM2) * rent * 12;
    const eff = gross * (1 - base.leerstandPct);
    const opex =
      ((base.gesamtFlaecheM2 ?? base.flaecheM2) *
        base.mieteProM2Monat *
        12) *
      base.opexPctBrutto; // vereinfachend
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

/* ---------------- Hauptkomponente (Basic erlaubt) ---------------- */

export default function Mehrfamilienhaus() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  // Persistenz
  const DRAFT_KEY = "mehrfamilienhaus.v4"; // v4 wegen erweitertem unitRows-Schema (rent)

  // Eingaben (MFH)
  const [kaufpreis, setKaufpreis] = React.useState(1_600_000);
  const [einheiten, setEinheiten] = React.useState(8);
  const [gesamtFlaecheM2, setGesamtFlaecheM2] = React.useState(640);
  const [mieteProM2Monat, setMieteProM2Monat] = React.useState(11.8);
  const [leerstandPct, setLeerstandPct] = React.useState(0.07);
  const [opexPctBrutto, setOpexPctBrutto] = React.useState(0.26);

  // NK (Split)
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

  // Bewertung
  const [capRatePct, setCapRatePct] = React.useState(0.058);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = React.useState(0);
  const [rentAdjPct, setRentAdjPct] = React.useState(0);
  const [applyAdjustments, setApplyAdjustments] = React.useState(true);

  // NEU: Flächenmodus & Einheitenliste (inkl. Miete/m² je Einheit)
  const [flaechenModus, setFlaechenModus] = React.useState<UnitsMode>("gesamt");
  const [unitRows, setUnitRows] = React.useState<UnitRow[]>([
    { id: crypto.randomUUID(), label: "WE 1", sqm: 60, rent: 11.5 },
    { id: crypto.randomUUID(), label: "WE 2", sqm: 55, rent: 12.0 },
  ]);

  const unitsSumSqm = unitRows.reduce(
    (acc, u) => acc + (typeof u.sqm === "number" ? u.sqm : 0),
    0
  );
  const unitsCount = unitRows.length;
  const unitsWeightedRent =
    unitsSumSqm > 0
      ? unitRows.reduce((acc, u) => {
          const sqm = typeof u.sqm === "number" ? u.sqm : 0;
          const r = typeof u.rent === "number" ? u.rent : 0;
          return acc + sqm * r;
        }, 0) / unitsSumSqm
      : 0;

  function addUnitRow() {
    setUnitRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: `WE ${prev.length + 1}`, sqm: 50, rent: 11 },
    ]);
  }
  function removeUnitRow(id: string) {
    setUnitRows((prev) => prev.filter((u) => u.id !== id));
  }
  function updateUnitRow(id: string, patch: Partial<UnitRow>) {
    setUnitRows((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  // Laden
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      setKaufpreis(d.kaufpreis ?? 1_600_000);
      setEinheiten(d.einheiten ?? 8);
      setGesamtFlaecheM2(d.gesamtFlaecheM2 ?? 640);
      setMieteProM2Monat(d.mieteProM2Monat ?? 11.8);
      setLeerstandPct(d.leerstandPct ?? 0.07);
      setOpexPctBrutto(d.opexPctBrutto ?? 0.26);
      setNkGrEStPct(d.nkGrEStPct ?? 0.065);
      setNkNotarPct(d.nkNotarPct ?? 0.01);
      setNkGrundbuchPct(d.nkGrundbuchPct ?? 0.005);
      setNkMaklerPct(d.nkMaklerPct ?? 0);
      setNkSonstPct(d.nkSonstPct ?? 0.005);
      setFinancingOn(d.financingOn ?? true);
      setLtvPct(d.ltvPct ?? 0.75);
      setZinsPct(d.zinsPct ?? 0.041);
      setTilgungPct(d.tilgungPct ?? 0.02);
      setCapRatePct(d.capRatePct ?? 0.058);
      setPriceAdjPct(d.priceAdjPct ?? 0);
      setRentAdjPct(d.rentAdjPct ?? 0);
      setApplyAdjustments(d.applyAdjustments ?? true);

      setFlaechenModus(d.flaechenModus ?? "gesamt");
      if (Array.isArray(d.unitRows)) {
        setUnitRows(
          d.unitRows.map((u: any, i: number) => ({
            id: crypto.randomUUID(),
            label: u.label ?? `WE ${i + 1}`,
            sqm: Number(u.sqm) || "",
            rent: Number(u.rent) || "",
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // Speichern
  React.useEffect(() => {
    const data = {
      kaufpreis,
      einheiten,
      gesamtFlaecheM2,
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
      capRatePct,
      priceAdjPct,
      rentAdjPct,
      applyAdjustments,
      flaechenModus,
      unitRows,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [
    kaufpreis,
    einheiten,
    gesamtFlaecheM2,
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
    capRatePct,
    priceAdjPct,
    rentAdjPct,
    applyAdjustments,
    flaechenModus,
    unitRows,
  ]);

  // Input/Output (calcMfh) – Modus berücksichtigt (inkl. gewichtete Miete)
  const mieteM2Effektiv =
    flaechenModus === "einheiten"
      ? Number.isFinite(unitsWeightedRent)
        ? unitsWeightedRent
        : 0
      : mieteProM2Monat;

  const baseInput: MfhInput = {
    kaufpreis,
    einheiten: flaechenModus === "einheiten" ? unitsCount : einheiten,
    gesamtFlaecheM2: flaechenModus === "einheiten" ? unitsSumSqm : gesamtFlaecheM2,
    flaecheM2: flaechenModus === "einheiten" ? unitsSumSqm : gesamtFlaecheM2,
    mieteProM2Monat: mieteM2Effektiv,
    leerstandPct,
    opexPctBrutto,
    nkPct,
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
    capRateAssumed: capRatePct,
  };
  const outBase: MfhOutput = React.useMemo(
    () => calcMfh(baseInput),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(baseInput)]
  );

  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const adjustedRent = mieteM2Effektiv * (1 + rentAdjPct);
  const adjInput: MfhInput = {
    ...baseInput,
    kaufpreis: adjustedPrice,
    mieteProM2Monat: adjustedRent,
  };
  const outAdj: MfhOutput = React.useMemo(
    () => calcMfh(adjInput),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(adjInput)]
  );

  const viewIn = applyAdjustments ? adjInput : baseInput;
  const view = applyAdjustments ? outAdj : outBase;
  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";

  // Ableitungen
  const grossRentYear = (viewIn.gesamtFlaecheM2 ?? viewIn.flaecheM2) * viewIn.mieteProM2Monat * 12;
  const effRentYear = grossRentYear * (1 - viewIn.leerstandPct);
  const opexYear = grossRentYear * viewIn.opexPctBrutto;

  const loan = viewIn.financingOn ? viewIn.kaufpreis * viewIn.ltvPct : 0;
  const annuityYear = viewIn.financingOn ? loan * (viewIn.zinsPct + viewIn.tilgungPct) : 0;
  const interestYear = viewIn.financingOn ? loan * viewIn.zinsPct : 0;
  const principalYear = viewIn.financingOn ? loan * viewIn.tilgungPct : 0;

  const monthlyEffRent = effRentYear / 12;
  const monthlyOpex = opexYear / 12;
  const monthlyInterest = interestYear / 12;
  const monthlyPrincipal = principalYear / 12;
  const monthlyAnnuity = annuityYear / 12;

  // Score & Delta
  const scorePct = Math.round(view.score * 100);
  const scoreColor = view.score >= 0.7 ? "#16a34a" : view.score >= 0.5 ? "#f59e0b" : "#ef4444";

  const priceForChart = viewIn.kaufpreis;
  const wertForChart = view.wertAusCap;
  const valueGap = Math.round(wertForChart - priceForChart);
  const valueGapPct = priceForChart > 0 ? (wertForChart - priceForChart) / priceForChart : 0;
  const gapPositive = valueGap >= 0;

  // Projektion (10J)
  const projection = React.useMemo(() => {
    const years = 10;
    const data: { year: number; Cashflow: number; Tilgung: number; Vermoegen: number }[] = [];
    let outstanding = loan;
    const baseGross0 = grossRentYear;
    const baseOpex0 = opexYear;
    const rentGrowthPct = 0.02;
    const costGrowthPct = 0.02;
    const valueGrowthPct = 0.02;
    for (let t = 1; t <= years; t++) {
      const gross = baseGross0 * Math.pow(1 + rentGrowthPct, t - 1);
      const eff = gross * (1 - viewIn.leerstandPct);
      const opex = baseOpex0 * Math.pow(1 + costGrowthPct, t - 1);
      const interest = viewIn.financingOn ? outstanding * viewIn.zinsPct : 0;
      const annuity = viewIn.financingOn ? loan * (viewIn.zinsPct + viewIn.tilgungPct) : 0;
      const tilgung = Math.max(0, annuity - interest);
      outstanding = Math.max(0, outstanding - tilgung);
      const cf = eff - opex - annuity;
      const verm = tilgung + viewIn.kaufpreis * valueGrowthPct;
      data.push({
        year: t,
        Cashflow: Math.round(cf),
        Tilgung: Math.round(tilgung),
        Vermoegen: Math.round(verm),
      });
    }
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ loan, grossRentYear, opexYear, viewIn })]);

  // NK-Beträge
  const nkSum = Math.round(viewIn.kaufpreis * nkPct);
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
      flaechenModus,
      einheiten: flaechenModus === "einheiten" ? unitsCount : einheiten,
      gesamtFlaecheM2: flaechenModus === "einheiten" ? unitsSumSqm : gesamtFlaecheM2,
      unitRows,
      kaufpreis,
      // Achtung: bei „einheiten“ ist mieteM2Effektiv die gewichtete Miete
      mieteProM2Monat: mieteM2Effektiv,
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
      capRatePct,
      priceAdjPct,
      rentAdjPct,
      applyAdjustments,
    };
    downloadBlob(
      `mfh_export_${ts()}.json`,
      "application/json;charset=utf-8",
      JSON.stringify(payload, null, 2)
    );
  }

  function csvEscape(s: string | number) {
    const t = String(s).replace(/"/g, '""');
    // deutschland-kompatibel: wir nutzen Semikolon als Trenner
    return `"${t}"`;
  }

  function exportCSV() {
    const rows: (string | number)[][] = [];
    if (flaechenModus === "einheiten") {
      rows.push(["#", "Bezeichnung", "Wohnfläche (m²)", "Ø Kaltmiete (€/m²)"]);
      unitRows.forEach((u, i) =>
        rows.push([
          i + 1,
          u.label,
          typeof u.sqm === "number" ? u.sqm : "",
          typeof u.rent === "number" ? u.rent : "",
        ])
      );
      rows.push([
        "Summe/Ø",
        "",
        unitsSumSqm,
        Number.isFinite(unitsWeightedRent) ? Math.round(unitsWeightedRent * 100) / 100 : "",
      ]);
    } else {
      rows.push(["Modus", "Gesamtfläche (m²)", "Einheiten", "Ø Kaltmiete (€/m²)"]);
      rows.push(["gesamt", gesamtFlaecheM2, einheiten, mieteProM2Monat]);
    }
    const csv = rows.map((r) => r.map(csvEscape).join(";")).join("\n");
    downloadBlob(`mfh_export_${ts()}.csv`, "text/csv;charset=utf-8", csv);
  }

  function exportPDF() {
    const sumRows = `
      <tr><th style="text-align:left;">Modus</th><td>${
        flaechenModus === "einheiten" ? "Einheiten" : "Gesamt"
      }</td></tr>
      <tr><th style="text-align:left;">Gesamtfläche</th><td>${
        (flaechenModus === "einheiten" ? unitsSumSqm : gesamtFlaecheM2).toLocaleString("de-DE")
      } m²</td></tr>
      <tr><th style="text-align:left;">Einheiten</th><td>${
        flaechenModus === "einheiten" ? unitsCount : einheiten
      }</td></tr>
      <tr><th style="text-align:left;">Ø Kaltmiete (€/m²)</th><td>${
        flaechenModus === "einheiten"
          ? Number.isFinite(unitsWeightedRent)
            ? unitsWeightedRent.toFixed(2)
            : "–"
          : mieteProM2Monat.toFixed(2)
      }</td></tr>
    `.trim();

    const unitsTable =
      flaechenModus === "einheiten"
        ? `
        <h3 style="margin:16px 0 8px 0;">Wohneinheiten</h3>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #ccc;">#</th>
              <th style="text-align:left; border-bottom:1px solid #ccc;">Bezeichnung</th>
              <th style="text-align:right; border-bottom:1px solid #ccc;">Wohnfläche (m²)</th>
              <th style="text-align:right; border-bottom:1px solid #ccc;">Ø Kaltmiete (€/m²)</th>
            </tr>
          </thead>
          <tbody>
            ${
              unitRows
                .map(
                  (u, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${escapeHtml(u.label)}</td>
                  <td style="text-align:right;">${
                    (typeof u.sqm === "number" ? u.sqm : 0).toLocaleString("de-DE")
                  }</td>
                  <td style="text-align:right;">${
                    typeof u.rent === "number" ? u.rent.toFixed(2) : "0.00"
                  }</td>
                </tr>`
                )
                .join("")
            }
            <tr>
              <td colspan="2" style="text-align:right; font-weight:600; border-top:1px solid #eee;">Summe / Ø</td>
              <td style="text-align:right; font-weight:600; border-top:1px solid #eee;">${unitsSumSqm.toLocaleString(
                "de-DE"
              )}</td>
              <td style="text-align:right; font-weight:600; border-top:1px solid #eee;">${
                Number.isFinite(unitsWeightedRent) ? unitsWeightedRent.toFixed(2) : "–"
              }</td>
            </tr>
          </tbody>
        </table>
      `
        : "";

    const html = `
<!doctype html>
<html lang="de">
<head><meta charset="utf-8" /><title>MFH Export – ${ts()}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans'; margin:24px; color:#111; }
  h1 { font-size:20px; margin:0 0 4px; }
  h2 { font-size:16px; margin:16px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:6px 8px; } th { text-align:left; }
  tr + tr td { border-top:1px solid #eee; }
  .meta { color:#555; font-size:12px; margin-bottom:12px; }
  @media print { a[href]:after { content:""; } }
</style></head>
<body>
  <h1>Mehrfamilienhaus – Export</h1>
  <div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>
  <h2>Zusammenfassung</h2>
  <table>${sumRows}</table>
  ${unitsTable}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`.trim();

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }

  // Runner für Dropdown
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
        <UpgradeBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-white grid place-items-center shadow">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Mehrfamilienhaus – Check
              </h2>
              <p className="text-muted-foreground text-sm">
                Portfolio-tauglich, skalierbar – mit Live-Score, Break-even & Projektion.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition"
              onClick={() => {
                setKaufpreis(1_600_000);
                setEinheiten(8);
                setGesamtFlaecheM2(640);
                setMieteProM2Monat(11.8);
                setLeerstandPct(0.07);
                setOpexPctBrutto(0.26);
                setNkGrEStPct(0.065);
                setNkNotarPct(0.01);
                setNkGrundbuchPct(0.005);
                setNkMaklerPct(0);
                setNkSonstPct(0.005);
                setFinancingOn(true);
                setLtvPct(0.75);
                setZinsPct(0.041);
                setTilgungPct(0.02);
                setCapRatePct(0.058);
                setPriceAdjPct(0);
                setRentAdjPct(0);
                setApplyAdjustments(true);
                setFlaechenModus("gesamt");
                setUnitRows([
                  { id: crypto.randomUUID(), label: "WE 1", sqm: 60, rent: 11.5 },
                  { id: crypto.randomUUID(), label: "WE 2", sqm: 55, rent: 12.0 },
                ]);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>

            {/* Neuer Export-Dropdown */}
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
                      setKaufpreis(num(d.kaufpreis, 1_600_000));
                      setEinheiten(num(d.einheiten, 8));
                      setGesamtFlaecheM2(num(d.gesamtFlaecheM2, 640));
                      setMieteProM2Monat(num(d.mieteProM2Monat, 11.8));
                      setLeerstandPct(num(d.leerstandPct, 0.07));
                      setOpexPctBrutto(num(d.opexPctBrutto, 0.26));
                      setNkGrEStPct(num(d.nkGrEStPct, 0.065));
                      setNkNotarPct(num(d.nkNotarPct, 0.01));
                      setNkGrundbuchPct(num(d.nkGrundbuchPct, 0.005));
                      setNkMaklerPct(num(d.nkMaklerPct, 0));
                      setNkSonstPct(num(d.nkSonstPct, 0.005));
                      setFinancingOn(Boolean(d.financingOn));
                      setLtvPct(num(d.ltvPct, 0.75));
                      setZinsPct(num(d.zinsPct, 0.041));
                      setTilgungPct(num(d.tilgungPct, 0.02));
                      setCapRatePct(num(d.capRatePct, 0.058));
                      setPriceAdjPct(num(d.priceAdjPct, 0));
                      setRentAdjPct(num(d.rentAdjPct, 0));
                      setApplyAdjustments(Boolean(d.applyAdjustments));
                      setFlaechenModus(
                        d.flaechenModus === "einheiten" ? "einheiten" : "gesamt"
                      );
                      if (Array.isArray(d.unitRows)) {
                        setUnitRows(
                          d.unitRows.map((u: any, i: number) => ({
                            id: crypto.randomUUID(),
                            label: u.label ?? `WE ${i + 1}`,
                            sqm: Number(u.sqm) || "",
                            rent: Number(u.rent) || "",
                          }))
                        );
                      }
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

          {/* Flächenmodus */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Flächen-Modus</div>
              <div className="inline-flex rounded-xl border p-1 bg-white text-sm">
                <button
                  className={`px-3 py-1.5 rounded-lg ${
                    flaechenModus === "gesamt"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setFlaechenModus("gesamt")}
                >
                  Gesamtfläche
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg ${
                    flaechenModus === "einheiten"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setFlaechenModus("einheiten")}
                >
                  Einheiten erfassen
                </button>
              </div>
            </div>
          </Card>

          {/* Grunddaten */}
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
              <div className="grid grid-cols-1 gap-3">
                <NumberField
                  label="Anzahl Einheiten"
                  value={einheiten}
                  onChange={setEinheiten}
                  min={1}
                  step={1}
                />
                <NumberField
                  label="Gesamtfläche (m²)"
                  value={gesamtFlaecheM2}
                  onChange={setGesamtFlaecheM2}
                />
                <NumberField
                  label="Ø Kaltmiete (€/m²/Monat)"
                  value={mieteProM2Monat}
                  onChange={setMieteProM2Monat}
                  step={0.1}
                />
              </div>

              {/* Leerstand & Opex */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leerstand (Quote)</span>
                <InfoBubble text="Mietausfall durch Fluktuation/Neuvermietung, technisch & wirtschaftlich." />
              </div>
              <PercentField
                label="Leerstand (%)"
                value={leerstandPct}
                onChange={setLeerstandPct}
                min={0}
                max={0.95}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Bewirtschaftungskosten (% auf Bruttokaltmiete)
                </span>
                <InfoBubble text="Instandhaltung, Verwaltung, nicht umlagefähige Kosten (vereinfacht)." />
              </div>
              <PercentField
                label="Betriebskosten (Brutto)"
                value={opexPctBrutto}
                onChange={setOpexPctBrutto}
              />

              {/* NK-Split */}
              <div className="text-sm font-medium mt-2">Kaufnebenkosten (Split)</div>
              <PercentField
                label="Grunderwerbsteuer (%)"
                value={nkGrEStPct}
                onChange={setNkGrEStPct}
                step={0.0005}
              />
              <PercentField
                label="Notar (%)"
                value={nkNotarPct}
                onChange={setNkNotarPct}
                step={0.0005}
              />
              <PercentField
                label="Grundbuch (%)"
                value={nkGrundbuchPct}
                onChange={setNkGrundbuchPct}
                step={0.0005}
              />
              <PercentField
                label="Makler (%)"
                value={nkMaklerPct}
                onChange={setNkMaklerPct}
                step={0.0005}
              />
              <PercentField
                label="Sonstiges/Puffer (%)"
                value={nkSonstPct}
                onChange={setNkSonstPct}
                step={0.0005}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Summe NK: <b>{pct(nkPct)}</b> = {eur(Math.round(kaufpreis * nkPct))}.
            </div>
          </Card>

          {/* Einheiten-Editor */}
          {flaechenModus === "einheiten" && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">Wohneinheiten</div>
                <button
                  onClick={addUnitRow}
                  className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-[#0F2C8A] text-white hover:brightness-110"
                >
                  Einheit hinzufügen
                </button>
              </div>

              <div className="space-y-3">
                {unitRows.map((u, idx) => (
                  <div key={u.id} className="rounded-xl border bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={u.label}
                          onChange={(e) => updateUnitRow(u.id, { label: e.target.value })}
                          className="w-36 rounded-md border px-2 py-1 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeUnitRow(u.id)}
                        className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50"
                      >
                        Entfernen
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-sm grid gap-1">
                        <span className="text-muted-foreground">Wohnfläche (m²)</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={u.sqm}
                          onChange={(e) =>
                            updateUnitRow(u.id, {
                              sqm: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className="w-full rounded-xl border px-3 py-2"
                        />
                      </label>
                      <label className="text-sm grid gap-1">
                        <span className="text-muted-foreground">Ø Kaltmiete (€/m²)</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={u.rent}
                          onChange={(e) =>
                            updateUnitRow(u.id, {
                              rent: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className="w-full rounded-xl border px-3 py-2"
                        />
                      </label>
                      <div className="text-sm grid gap-1">
                        <span className="text-muted-foreground">Miete/Monat (berechnet)</span>
                        <div className="h-[38px] flex items-center px-3 rounded-xl border bg-gray-50">
                          {eur(
                            Math.round(
                              (typeof u.sqm === "number" ? u.sqm : 0) *
                                (typeof u.rent === "number" ? u.rent : 0)
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border bg-gray-50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="font-medium">∑ Fläche:</span>{" "}
                    <span className="tabular-nums">
                      {unitsSumSqm.toLocaleString("de-DE")} m²
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Einheiten:</span>{" "}
                    <span className="tabular-nums">{unitsCount}</span>
                  </div>
                  <div>
                    <span className="font-medium">Ø Miete gewichtet:</span>{" "}
                    <span className="tabular-nums">
                      {Number.isFinite(unitsWeightedRent)
                        ? unitsWeightedRent.toFixed(2)
                        : "–"}{" "}
                      €/m²
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Diese Summen (Fläche & gewichtete Miete) werden automatisch in die
                  Berechnung übernommen.
                </p>
              </div>
            </Card>
          )}

          {/* Finanzierung */}
          <Card>
            <div className="flex items-center justify-between">
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={financingOn}
                  onChange={(e) => setFinancingOn(e.target.checked)}
                />
                Finanzierung berücksichtigen
              </label>
            </div>
            {financingOn && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct} />
                <PercentField
                  label="Zins p.a. (%)"
                  value={zinsPct}
                  onChange={setZinsPct}
                  step={0.001}
                />
                <PercentField
                  label="Tilgung p.a. (%)"
                  value={tilgungPct}
                  onChange={setTilgungPct}
                  step={0.001}
                />
                <div className="text-xs text-muted-foreground">
                  Darlehen: <b>{eur(Math.round(loan))}</b> · Annuität p.a.:{" "}
                  <b>{eur(Math.round(annuityYear))}</b>
                </div>
              </div>
            )}
          </Card>

          {/* Bewertung & Profit-Spielplatz */}
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Cap Rate
                  <InfoBubble text="Wert ≈ NOI / Cap. Höhere Cap ⇒ niedrigerer Wert (c.p.)." />
                </span>
                <span className="text-xs text-muted-foreground">steigt ⇒ Wert sinkt</span>
              </div>
              <PercentField
                label="Cap Rate (%)"
                value={capRatePct}
                onChange={setCapRatePct}
                step={0.0005}
                min={0.02}
                max={0.12}
              />

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Profit-Spielplatz</div>
                <label className="text-xs inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={applyAdjustments}
                    onChange={(e) => setApplyAdjustments(e.target.checked)}
                  />{" "}
                  in Bewertung verwenden
                </label>
              </div>

              <PercentField
                label={`Kaufpreis ±% · aktuell: ${eur(
                  Math.round(applyAdjustments ? adjustedPrice : kaufpreis)
                )}`}
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
                label={`Miete/m² ±% · jetzt: ${mieteM2Effektiv.toFixed(2)} €/m²`}
                value={rentAdjPct}
                onChange={setRentAdjPct}
                step={0.005}
                min={-0.2}
                max={0.4}
              />
              <div className="text-xs text-muted-foreground -mt-2">
                {signedPct(rentAdjPct)} = {(mieteM2Effektiv * (1 + rentAdjPct)).toFixed(2)} €/m²
              </div>
            </div>
          </Card>
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
                    data={[
                      { name: "Deal", Preis: Math.round(priceForChart), Wert: Math.round(wertForChart) },
                    ]}
                    margin={{ top: 20, right: 20, left: 0, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="gradPreisMFH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111827" />
                        <stop offset="100%" stopColor="#374151" />
                      </linearGradient>
                      <linearGradient id="gradWertMFH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v: any) => v.toLocaleString("de-DE")} />
                    <RTooltip formatter={(v: any) => eur(v)} />
                    <Legend />
                    <Bar dataKey="Preis" fill="url(#gradPreisMFH)" radius={[10, 10, 0, 0]}>
                      <LabelList dataKey="Preis" position="top" formatter={(v: any) => eur(v)} />
                    </Bar>
                    <Bar dataKey="Wert" fill="url(#gradWertMFH)" radius={[10, 10, 0, 0]}>
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
                (gapPositive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200")
              }
            >
              {gapPositive ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(Math.round(valueGap)))} (
              {signedPct(valueGapPct)})
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
              <li>
                Eff. Nettokaltmiete (mtl.): <b>{eur(Math.round(monthlyEffRent))}</b>
              </li>
              <li>
                Bewirtschaftungskosten (mtl.): <b>{eur(Math.round(monthlyOpex))}</b>
              </li>
              {financingOn && (
                <>
                  <li>
                    Zinsen (mtl.): <b>{eur(Math.round(monthlyInterest))}</b>
                  </li>
                  <li>
                    Tilgung (mtl.): <b>{eur(Math.round(monthlyPrincipal))}</b>
                  </li>
                </>
              )}
              <li>
                = Cashflow operativ (mtl.):{" "}
                <b>{eur(Math.round(monthlyEffRent - monthlyOpex - monthlyAnnuity))}</b>
              </li>
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
                <b>Was bedeutet Break-even?</b> Ab dieser Grenze ist der monatliche Cashflow
                (vor Steuern) nicht negativ. Oberhalb des Preises bzw. unterhalb der Miete
                wird CF &lt; 0.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Max. Kaufpreis für CF = 0</span>
                <b>
                  {breakEvenPriceForCashflowZero(viewIn) != null
                    ? eur(breakEvenPriceForCashflowZero(viewIn)!)
                    : "– (nur mit Finanzierung berechenbar)"}
                </b>
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
              {nkSonstPct > 0 && (
                <li>Sonstiges/Puffer: {pct(nkSonstPct)} = {eur(nkSplits.sonst)}</li>
              )}
              <li className="mt-2">
                <b>Summe NK</b>: {pct(nkPct)} = <b>{eur(nkSum)}</b>
              </li>
              <li>
                All-in = Kaufpreis + NK = <b>{eur(viewIn.kaufpreis + nkSum)}</b>
              </li>
            </ul>
          </Card>
        </section>

        {/* Glossar – einheitlich unten */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Glossar</h2>
          <Card>
            <dl className="text-sm text-foreground space-y-1.5">
              <div>
                <span className="font-medium">NOI (Net Operating Income):</span> Eff. Kaltmiete –
                nicht umlagefähige Kosten (vereinfacht, ohne Steuern).
              </div>
              <div>
                <span className="font-medium">DSCR:</span> NOI / Schuldienst (Zins+Tilgung). ≥ 1,2
                ist oft solide.
              </div>
              <div>
                <span className="font-medium">Cap Rate:</span> Marktrendite-Annahme; Wert ≈ NOI /
                Cap.
              </div>
              <div>
                <span className="font-medium">LTV:</span> Loan-to-Value, Darlehen / Kaufpreis.
              </div>
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
                  Entscheidung: {scoreLabelText(view.scoreLabel)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    text={`${eur(Math.round(view.cashflowMonat))} mtl.`}
                    hint="Cashflow (Y1)"
                  />
                  <Badge
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    text={`NOI-Yield ${pct(view.noiYield)}`}
                    hint="NOI / Kaufpreis"
                  />
                  <Badge
                    icon={<Sigma className="h-3.5 w-3.5" />}
                    text={`DSCR ${view.dscr ? view.dscr.toFixed(2) : "–"}`}
                    hint="NOI / Schuldienst"
                  />
                </div>
              </div>

              {/* Rechts: Score-Donut */}
              <ScoreDonut
                scorePct={scorePct}
                scoreColor={scoreColor}
                label={view.scoreLabel}
                size={42}
              />
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
