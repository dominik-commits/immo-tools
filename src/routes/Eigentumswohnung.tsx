// src/routes/Eigentumswohnung.tsx
// Eigentumswohnung-Check – UX-Refresh angelehnt an Mehrfamilienhaus-Check
// - 2-Spalten-Layout mit rechter, sticky Glossar-Sidebar
// - Eingaben in gelb hinterlegten "InputCards" mit EINGABE-Badge
// - Zwischenstand: Ampel-Box mit Score, Cashflow, Begründung & schnellen Hebeln
// - Spielwiese direkt unter Zwischenstand
// - Details: Wert vs. Kaufpreis, Projektion, Monatsrechnung & NK-Details

import React, { useEffect, useMemo, useState } from "react";
import {
  Home as HomeIcon,
  RefreshCw,
  Upload,
  Download,
  Info,
  Gauge,
  TrendingUp,
  Banknote,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { eur, pct, type WohnInput } from "../core/calcs";

// ---------------- Types & Theme ----------------

type DecisionLabel = "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";
type Tip = { label: string; detail: string };

const BRAND = "#1b2c47";
const CTA = "#ffde59";
const ORANGE = "#ff914d";
const SURFACE = "#F7F7FA";

// ---------------- Kleine UI-Atoms ----------------

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm text-foreground flex items-center gap-1">
      <span>{label}</span>
      {help && (
        <span title={help}>
          <Info className="h-4 w-4 text-gray-400" />
        </span>
      )}
    </div>
  );
}

function InputBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-yellow-50 border-yellow-200 text-yellow-700">
      EINGABE
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
  return <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>;
}

function InputCard({
  title,
  subtitle,
  description,
  children,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-amber-50/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          {description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">{description}</p>
          )}
        </div>
        <InputBadge />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  help,
  suffix,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

/**
 * Prozent-Eingabe als Number-Field (nicht Slider), für optische Angleichung an MFH.
 * value ist 0–1, angezeigt werden 0–100 %.
 */
function PercentField({
  label,
  value,
  onChange,
  step = 0.05,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
}) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
          type="number"
          step={step}
          value={((value ?? 0) * 100).toFixed(2)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}

type KPIRating = "gut" | "okay" | "schlecht" | null;

function KPI({
  icon,
  label,
  value,
  hint,
  rating,
  ratingText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  rating?: KPIRating;
  ratingText?: string;
}) {
  const ratingConfig = {
    gut: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    okay: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
    schlecht: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
  };
  const cfg = rating ? ratingConfig[rating] : null;

  return (
    <div className="rounded-xl border p-3 bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold mt-1 tabular-nums text-foreground">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      {cfg && ratingText && (
        <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          {ratingText}
        </div>
      )}
    </div>
  );
}

function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div className="py-2 border-b last:border-0">
      <div className="text-sm font-medium text-foreground">{term}</div>
      <div className="text-xs text-muted-foreground">{def}</div>
    </div>
  );
}

// ---------------- Export Dropdown (angepasst von MFH) ----------------

function ExportDropdown({
  onRun,
}: {
  onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(true);
  const [csv, setCsv] = useState(false);
  const [pdf, setPdf] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function run() {
    onRun({ json: json || (!csv && !pdf), csv, pdf });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" /> Export
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-3 z-50">
          <div className="text-xs font-medium text-gray-500 mb-2">Formate wählen</div>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={json}
              onChange={(e) => setJson(e.target.checked)}
            />{" "}
            JSON
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={csv}
              onChange={(e) => setCsv(e.target.checked)}
            />{" "}
            CSV
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={pdf}
              onChange={(e) => setPdf(e.target.checked)}
            />{" "}
            PDF
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

// ---------------- Zwischenstand & Spielwiese ----------------

function DecisionSummary({
  scorePct,
  decisionLabel,
  decisionColor,
  monthlyCF,
  noi,
  annuitaetJahr,
  decisionText,
  tips,
}: {
  scorePct: number;
  decisionLabel: DecisionLabel;
  decisionColor: string;
  monthlyCF: number;
  noi: number;
  annuitaetJahr: number;
  decisionText: string;
  tips: Tip[];
}) {
  const cfText =
    monthlyCF >= 0
      ? `Cashflow mtl.: ${eur(Math.round(monthlyCF))} (positiv)`
      : `Cashflow mtl.: ${eur(Math.round(monthlyCF))} (negativ)`;

  const labelText =
    decisionLabel === "RENTABEL"
      ? "Rentabel"
      : decisionLabel === "GRENZWERTIG"
      ? "Grenzwertig"
      : "Aktuell nicht rentabel";

  return (
    <div className="rounded-2xl shadow-md border overflow-hidden" style={{ background: BRAND }}>
      <div className="p-4 md:p-5 flex flex-col lg:flex-row gap-6 text-white">
        {/* Linke Seite: Ampel / Kennzahlen */}
        <div className="lg:w-1/3 flex flex-col gap-3">
          <div className="text-xs font-medium text-white/70">Entscheidungsempfehlung</div>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: CTA,
              }}
            >
              {scorePct}
              <span className="text-xs ml-0.5">%</span>
            </div>
            <div>
              <div
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-white/15"
                style={{
                  color: decisionColor,
                  border: `1px solid ${decisionColor}55`,
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                {labelText}
              </div>
              <div className="text-xs text-white/80 mt-1">{cfText}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mt-2">
            <div>
              <div className="text-white/70">NOI p.a.</div>
              <div className="font-semibold text-white">{eur(Math.round(noi))}</div>
            </div>
            <div>
              <div className="text-white/70">Annuität p.a.</div>
              <div className="font-semibold text-white">{eur(Math.round(annuitaetJahr))}</div>
            </div>
          </div>
        </div>

        {/* Rechte Seite: Begründung + Tipps */}
        <div className="lg:flex-1 space-y-3">
          <div className="text-xs font-medium text-white/70">Begründung (Kurzfassung)</div>
          <p className="text-sm text-white/90 leading-snug">{decisionText}</p>

          <div className="text-xs font-medium text-white/70 mt-2">Schnelle Hebel</div>
          <ul className="text-xs text-white/90 list-disc pl-4 space-y-1">
            {tips.map((t, i) => (
              <li key={i}>
                <b>{t.label}:</b> {t.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlaygroundCard({
  priceAdjPct,
  setPriceAdjPct,
  rentAdjPct,
  setRentAdjPct,
  applyAdjustments,
  setApplyAdjustments,
}: {
  priceAdjPct: number;
  setPriceAdjPct: (v: number) => void;
  rentAdjPct: number;
  setRentAdjPct: (v: number) => void;
  applyAdjustments: boolean;
  setApplyAdjustments: (v: boolean) => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Spielwiese: Preis &amp; Miete</div>
        <span className="text-[11px] text-gray-500">
          Änderungen wirken live auf Score &amp; Cashflow
        </span>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Kaufpreis-Anpassung</div>
          <input
            aria-label="Preis-Anpassung"
            type="range"
            min={-0.3}
            max={0.3}
            step={0.005}
            value={priceAdjPct}
            onChange={(e) => setPriceAdjPct(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs tabular-nums -mt-1">{signedPct(priceAdjPct)}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Miete-Anpassung</div>
          <input
            aria-label="Miet-Anpassung"
            type="range"
            min={-0.2}
            max={0.4}
            step={0.005}
            value={rentAdjPct}
            onChange={(e) => setRentAdjPct(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs tabular-nums -mt-1">{signedPct(rentAdjPct)}</div>
        </div>

        <label className="text-xs inline-flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={applyAdjustments}
            onChange={(e) => setApplyAdjustments(e.target.checked)}
          />{" "}
          Anpassungen in Bewertung berücksichtigen
        </label>
      </div>
    </Card>
  );
}

// ---------------- Helper / Utils ----------------

function signedPct(x: number) {
  const v = (x * 100).toFixed(1);
  return (x > 0 ? "+" : "") + v + " %";
}

function num(x: any, fb: number) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}

function ts() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(
    d.getHours()
  )}-${p(d.getMinutes())}`;
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

// Break-even Solver wie im ursprünglichen Wohnungs-Tool

function breakEvenPriceForCashflowZero(base: WohnInput): number | null {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return null;
  const cfAt = (price: number) => {
    const gross = base.flaecheM2 * base.mieteProM2Monat * 12;
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

function breakEvenRentPerM2ForCashflowZero(base: WohnInput): number {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return 0;
  const cfAt = (rent: number) => {
    const gross = base.flaecheM2 * rent * 12;
    const eff = gross * (1 - base.leerstandPct);
    const opex = base.flaecheM2 * base.mieteProM2Monat * 12 * base.opexPctBrutto; // vereinfacht
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

/* ======================= Haupt-Komponente ======================= */

export default function EigentumswohnungCheck() {
  // Wichtig: kein PlanGuard mehr, Plan-Gating läuft in App.tsx (RequireLogin)
  return <PageInner />;
}

function PageInner() {
  // Scroll-Schutz für Number-Inputs
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const isNumber = (el as HTMLInputElement).type === "number";
      if (isNumber && document.activeElement === el) {
        (el as HTMLInputElement).blur();
      }
    };
    document.addEventListener("wheel", handler, { passive: true });
    return () => document.removeEventListener("wheel", handler);
  }, []);

  /* ------------ Eingaben / State ------------ */

  const [kaufpreis, setKaufpreis] = useState(350_000);
  const [flaecheM2, setFlaecheM2] = useState(70);
  const [mieteProM2Monat, setMieteProM2Monat] = useState(12);
  const [leerstandPct, setLeerstandPct] = useState(0.03);
  const [pdfLoading, setPdfLoading] = useState(false);

  // laufende Kosten (nicht umlagefähig, Instandhaltung, Verwaltung …) als % der Bruttomiete
  const [opexPctBrutto, setOpexPctBrutto] = useState(0.25);

  // Nebenkosten Kauf (prozentual vom Kaufpreis) + einmalige Kosten
  const [nkGrEStPct, setNkGrEStPct] = useState(0.065);
  const [nkNotarPct, setNkNotarPct] = useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = useState(0.0357);
  const [nkSonstPct, setNkSonstPct] = useState(0.004);
  const [nkRenovierung, setNkRenovierung] = useState(0);
  const [nkSanierung, setNkSanierung] = useState(0);

  // Finanzierung
  const [financingOn, setFinancingOn] = useState(true);
  const [ltvPct, setLtvPct] = useState(0.9); // Beleihung / FK-Quote
  const [zinsPct, setZinsPct] = useState(0.035);
  const [tilgungPct, setTilgungPct] = useState(0.02);

  // Spielwiese
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // Projektion
  const [mietSteigerung, setMietSteigerung] = useState(0.01);
  const [kostenSteigerung, setKostenSteigerung] = useState(0.015);

  // Cap-Rate für Wert über NOI
  const [capRatePct, setCapRatePct] = useState(0.045);

  /* ------------ Abgeleitete Werte ------------ */

  const kaufpreisAdj = kaufpreis * (1 + (applyAdjustments ? priceAdjPct : 0));
  const kaufpreisView = kaufpreisAdj;

  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;
  const nkSumPct = kaufpreisView * nkPct;
  const nkSum = nkSumPct + nkRenovierung + nkSanierung;
  const allIn = kaufpreisView + nkSum;

  const mieteProM2Eff = mieteProM2Monat * (1 + (applyAdjustments ? rentAdjPct : 0));

  const grossRentYear = flaecheM2 * mieteProM2Eff * 12;
  const effRentYear = grossRentYear * (1 - leerstandPct);
  const opexYear = grossRentYear * opexPctBrutto;
  const noi = Math.max(0, effRentYear - opexYear); // vor Finanzierung

  const loan = financingOn ? allIn * ltvPct : 0;
  const annuitaetJahr = financingOn && loan > 0 ? loan * (zinsPct + tilgungPct) : 0;
  const annuitaetMonat = annuitaetJahr / 12;
  const zinsMonat = financingOn ? (loan * zinsPct) / 12 : 0;
  const tilgungMonat = financingOn ? (loan * tilgungPct) / 12 : 0;

  const noiYield = allIn > 0 ? noi / allIn : 0;
  const dscr = annuitaetJahr > 0 ? noi / annuitaetJahr : Infinity;

  const monthlyEffRent = effRentYear / 12;
  const monthlyOpex = opexYear / 12;
  const monthlyCF = monthlyEffRent - monthlyOpex - annuitaetMonat;

  const projection = useMemo(
    () =>
      buildProjection10y({
        years: 10,
        effRentY1: effRentYear,
        opex0: opexYear,
        rentGrowth: mietSteigerung,
        costGrowth: kostenSteigerung,
        annuitaetJahr,
      }),
    [effRentYear, opexYear, mietSteigerung, kostenSteigerung, annuitaetJahr]
  );

  const wertNOI = capRatePct > 0 ? noi / capRatePct : 0;

  // Break-even
  const breakEvenBase = {
    kaufpreis: allIn,
    flaecheM2,
    mieteProM2Monat,
    leerstandPct,
    opexPctBrutto,
    finanzierungOn: financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
  };
  const bePrice = breakEvenPriceForCashflowZero(breakEvenBase as any);
  const beRentPerM2 = breakEvenRentPerM2ForCashflowZero(breakEvenBase as any);

  // Score & Entscheidung (angelehnt an MFH)
  const scoreRaw =
    clamp01(scale(noiYield, 0.035, 0.07) * 0.55 + scale(dscr, 1.1, 1.6) * 0.45);
  const scorePct = Math.round(scoreRaw * 100);

  let decisionLabel: DecisionLabel;
  if (monthlyCF >= 100 && dscr >= 1.2 && noiYield >= 0.05) {
    decisionLabel = "RENTABEL";
  } else if (monthlyCF >= 0) {
    decisionLabel = "GRENZWERTIG";
  } else {
    decisionLabel = "NICHT_RENTABEL";
  }

  const decisionColor =
    decisionLabel === "RENTABEL"
      ? "#16a34a"
      : decisionLabel === "GRENZWERTIG"
      ? "#f59e0b"
      : "#ef4444";

  let decisionText: string;
  if (decisionLabel === "RENTABEL") {
    decisionText =
      "Der Cashflow ist positiv und die Kennzahlen liegen im Zielkorridor. Die Wohnung wirkt aktuell wirtschaftlich tragfähig.";
  } else if (decisionLabel === "GRENZWERTIG") {
    decisionText =
      "Der Cashflow liegt leicht im Plus oder um die Null-Linie. Die Kennzahlen sind okay, aber du solltest Miete, Kaufpreis und Finanzierung genau prüfen.";
  } else {
    decisionText =
      "Der Cashflow ist negativ und/oder die Kennzahlen liegen unter typischen Zielwerten. Aus heutiger Sicht ist die Wohnung wirtschaftlich nicht attraktiv.";
  }

  const tips: Tip[] = useMemo(() => {
    const t: Tip[] = [];
    if (beRentPerM2) {
      t.push({
        label: "Miete anheben",
        detail: `auf ca. ${beRentPerM2.toFixed(
          2
        )} €/m² – dann wird der Cashflow voraussichtlich positiv.`,
      });
    }
    if (bePrice) {
      t.push({
        label: "Kaufpreis verhandeln",
        detail: `auf ungefähr ${eur(bePrice)} – verbessert Rendite und Risiko deutlich.`,
      });
    }
    if (financingOn && loan > 0) {
      const r = zinsPct + tilgungPct;
      if (r > 0) {
        const ekZiel = Math.max(0, allIn - noi / r);
        const delta = Math.max(0, Math.ceil(allIn - ekZiel - loan));
        if (delta > 0) {
          t.push({
            label: "Mehr Eigenkapital",
            detail: `zusätzlich ${eur(delta)} – senkt Rate und verbessert DSCR.`,
          });
        }
      }
    }
    if (!t.length) {
      t.push({
        label: "Feintuning",
        detail:
          "Kleine Optimierungen bei Miete, Kaufpreis oder Finanzierung verbessern die Kennzahlen.",
      });
    }
    return t.slice(0, 3);
  }, [beRentPerM2, bePrice, financingOn, loan, allIn, noi, zinsPct, tilgungPct]);

  /* ------------ Export ------------ */

  function runExport(opts: { json: boolean; csv: boolean; pdf: boolean }) {
    const timestamp = ts();

    const input = {
      kaufpreis,
      flaecheM2,
      mieteProM2Monat,
      leerstandPct,
      opexPctBrutto,
      nkGrEStPct,
      nkNotarPct,
      nkGrundbuchPct,
      nkMaklerPct,
      nkSonstPct,
      nkRenovierung,
      nkSanierung,
      financingOn,
      ltvPct,
      zinsPct,
      tilgungPct,
      priceAdjPct,
      rentAdjPct,
      applyAdjustments,
      mietSteigerung,
      kostenSteigerung,
      capRatePct,
    };

    const metrics = {
      scorePct,
      decisionLabel,
      decisionText,
      monthlyCF,
      monthlyEffRent,
      monthlyOpex,
      annuitaetMonat,
      noi,
      noiYield,
      dscr: Number.isFinite(dscr) ? dscr : null,
      bePrice,
      beRentPerM2,
      loan,
      allIn,
      wertNOI,
    };

    if (opts.json) {
      const payload = { createdAt: timestamp, input, metrics };
      downloadBlob(
        `wohnung-check_${timestamp}.json`,
        "application/json",
        JSON.stringify(payload, null, 2)
      );
    }

    if (opts.csv) {
      const rows = [
        ["Kaufpreis", "All-in", "NOI_Yield", "DSCR", "CF_monat", "Entscheidung"],
        [
          kaufpreis,
          allIn,
          (noiYield * 100).toFixed(2) + " %",
          Number.isFinite(dscr) ? dscr.toFixed(2) : "–",
          Math.round(monthlyCF),
          decisionLabel,
        ],
      ];
      const csv =
        rows
          .map((r) =>
            r
              .map((c) => `"${String(c).replace(/"/g, '""')}"`)
              .join(";")
          )
          .join("\n") + "\n";
      downloadBlob(`wohnung-check_${timestamp}.csv`, "text/csv;charset=utf-8", csv);
    }

    if (opts.pdf) {
      const lines = [
        "Eigentumswohnung-Check – Kurzreport",
        "",
        `Zeitpunkt: ${timestamp}`,
        "",
        `Entscheidung: ${decisionLabel}`,
        decisionText,
        "",
        `Score: ${scorePct} %`,
        `Cashflow Monat: ${eur(Math.round(monthlyCF))}`,
        `NOI-Yield: ${(noiYield * 100).toFixed(2)} %`,
        `DSCR: ${Number.isFinite(dscr) ? dscr.toFixed(2) : "–"}`,
      ];
      const content = lines.join("\n");
      downloadBlob(`wohnung-check_${timestamp}.txt`, "text/plain;charset=utf-8", content);
    }
  }

  /* ------------ Layout / Render ------------ */

  return (
    <div className="min-h-screen" style={{ background: SURFACE }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-40">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shadow"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, ${ORANGE})`,
                color: "#fff",
              }}
            >
              <HomeIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Eigentumswohnung – Check
              </h1>
              <p className="text-muted-foreground text-sm">
                Schnell prüfen, spielerisch mit Live-Score &amp; Break-even
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Mit diesem Tool kannst du die Profitabilität einer Eigentumswohnung in
                wenigen Minuten testen. Gib Kaufpreis, Miete und – falls gewünscht – deine
                Finanzierung ein und sieh direkt im Zwischenstand, ob sich das Objekt
                unter deinen Annahmen voraussichtlich lohnt.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span
              className="px-2 py-1 rounded-lg border text-xs"
              style={{ background: "#fff", color: decisionColor }}
            >
              Score: <b>{scorePct}%</b>
            </span>
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={resetBeispiel}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>
            <ExportDropdown onRun={runExport} />
            <label className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition cursor-pointer ${pdfLoading ? "opacity-60 pointer-events-none" : ""}`}>
  {pdfLoading ? (
    <>
      <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Exposé wird ausgelesen…
    </>
  ) : (
    <>
      <Upload className="h-4 w-4" /> Import
    </>
  )}
  <input
    type="file"
    className="hidden"
    accept=".json,application/json,.pdf,application/pdf"
    onChange={handleImport}
    disabled={pdfLoading}
  />
</label>
          </div>
        </div>

        {/* 2-Spalten-Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MAIN */}
          <div className="xl:col-span-2 space-y-6">
            {/* Eingaben */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Eingaben</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  Starte mit den Basisdaten zur Wohnung. Kaufpreis, Miete und die
                  wichtigsten Kostenfaktoren bilden die Grundlage für Score, Cashflow und
                  Entscheidungsempfehlung.
                </p>
              </div>

              {/* Kaufpreis & Nebenkosten */}
              <InputCard
                title="Kaufpreis & Nebenkosten"
                subtitle="Transaktionskosten transparent machen"
                description="Hier trägst du alle wesentlichen Kosten rund um den Kauf ein. Aus Kaufpreis
                 und Nebenkosten ergibt sich der All-in-Preis – also das Kapital, das
                 tatsächlich in der Wohnung gebunden ist."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberField
                    label="Kaufpreis (€)"
                    value={kaufpreis}
                    onChange={setKaufpreis}
                    step={1_000}
                  />
                  <NumberField
                    label="Wohnfläche (m²)"
                    value={flaecheM2}
                    onChange={setFlaecheM2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <PercentField
                    label="Grunderwerbsteuer"
                    value={nkGrEStPct}
                    onChange={setNkGrEStPct}
                  />
                  <PercentField
                    label="Notar"
                    value={nkNotarPct}
                    onChange={setNkNotarPct}
                  />
                  <PercentField
                    label="Grundbuch"
                    value={nkGrundbuchPct}
                    onChange={setNkGrundbuchPct}
                  />
                  <PercentField
                    label="Makler"
                    value={nkMaklerPct}
                    onChange={setNkMaklerPct}
                  />
                  <PercentField
                    label="Sonstiges / Puffer"
                    value={nkSonstPct}
                    onChange={setNkSonstPct}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <NumberField
                      label="Renovierung (einmalig, €)"
                      value={nkRenovierung}
                      onChange={setNkRenovierung}
                      step={500}
                    />
                    <NumberField
                      label="Sanierung (einmalig, €)"
                      value={nkSanierung}
                      onChange={setNkSanierung}
                      step={500}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Summe NK (prozentual): <b>{pct(nkPct)}</b> ={" "}
                  <b>{eur(Math.round(nkSumPct))}</b> · Einmalig:{" "}
                  <b>{eur(nkRenovierung + nkSanierung)}</b> · All-in: <b>{eur(allIn)}</b>
                </div>
              </InputCard>

              {/* Miete & laufende Kosten */}
              <InputCard
                title="Miete & laufende Kosten"
                subtitle="Einnahmen und typische Abzüge"
                description="Mit Miete, Leerstand und laufenden Kosten bestimmen wir deinen operativen
                 Überschuss (NOI) vor Finanzierung. Das ist die Grundlage für Rendite
                 und Cashflow."
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <NumberField
                    label="Kaltmiete (€/m²/Monat)"
                    value={mieteProM2Monat}
                    onChange={setMieteProM2Monat}
                    step={0.5}
                  />
                  <PercentField
                    label="Leerstand (Quote)"
                    value={leerstandPct}
                    onChange={setLeerstandPct}
                    help="Mietausfall, Fluktuation, nicht zahlende Mieter."
                  />
                  <PercentField
                    label="Nicht umlagefähige Kosten (% der Bruttomiete)"
                    value={opexPctBrutto}
                    onChange={setOpexPctBrutto}
                    help="Instandhaltung, Verwaltung, Rücklagen etc."
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Bruttomiete p.a.: <b>{eur(Math.round(grossRentYear))}</b> · Eff. Miete
                  p.a. (nach Leerstand): <b>{eur(Math.round(effRentYear))}</b>
                </div>
              </InputCard>

              {/* Finanzierung (optional) */}
              <InputCard
                title="Finanzierung berücksichtigen"
                subtitle="Optional: Cashflow nach Zins & Tilgung"
                description="Wenn du hier eine Finanzierung einträgst, berechnen wir zusätzlich, wie gut
                 sich Zins und Tilgung aus der Wohnung tragen lassen und wie dein
                 monatlicher Cashflow nach Finanzierung aussieht."
              >
                <label className="text-xs inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={financingOn}
                    onChange={(e) => setFinancingOn(e.target.checked)}
                  />{" "}
                  Finanzierung einbeziehen
                </label>

                {financingOn && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    <PercentField
                      label="Fremdkapital-Quote (LTV)"
                      value={ltvPct}
                      onChange={setLtvPct}
                      step={0.01}
                    />
                    <PercentField
                      label="Zins p.a."
                      value={zinsPct}
                      onChange={setZinsPct}
                      step={0.01}
                    />
                    <PercentField
                      label="Tilgung p.a."
                      value={tilgungPct}
                      onChange={setTilgungPct}
                      step={0.01}
                    />
                  </div>
                )}

                {financingOn && (
                  <div className="text-xs text-muted-foreground">
                    Fremdkapital (berechnet): <b>{eur(Math.round(loan))}</b> · Annuität
                    p.a.: <b>{eur(Math.round(annuitaetJahr))}</b> · mtl.:{" "}
                    <b>{eur(Math.round(annuitaetMonat))}</b>
                  </div>
                )}
              </InputCard>
            </section>

            {/* Zwischenstand + Spielwiese */}
            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Zwischenstand & Empfehlung
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Die Ampel fasst Cashflow und Rendite in einer klaren Empfehlung
                  zusammen. Darunter findest du konkrete Hebel, wie du die Kennzahlen
                  verbessern kannst.
                </p>
              </div>

              <DecisionSummary
                scorePct={scorePct}
                decisionLabel={decisionLabel}
                decisionColor={decisionColor}
                monthlyCF={monthlyCF}
                noi={noi}
                annuitaetJahr={annuitaetJahr}
                decisionText={decisionText}
                tips={tips}
              />

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  In der Spielwiese kannst du testweise am Kaufpreis und an der Miete
                  drehen und sofort sehen, was das mit Score und Cashflow macht – ideal
                  für Verhandlungen und „Was-wäre-wenn“-Szenarien.
                </p>
                <PlaygroundCard
                  priceAdjPct={priceAdjPct}
                  setPriceAdjPct={setPriceAdjPct}
                  rentAdjPct={rentAdjPct}
                  setRentAdjPct={setRentAdjPct}
                  applyAdjustments={applyAdjustments}
                  setApplyAdjustments={setApplyAdjustments}
                />
              </div>
            </section>

            {/* Details */}
            <DetailsSection
              noiYield={noiYield}
              dscr={dscr}
              annuitaetMonat={annuitaetMonat}
              allIn={allIn}
              noi={noi}
              annuitaetJahr={annuitaetJahr}
              bePrice={bePrice}
              beRentPerM2={beRentPerM2}
              projection={projection}
              monthlyEffRent={monthlyEffRent}
              monthlyOpex={monthlyOpex}
              monthlyCF={monthlyCF}
              loan={loan}
              wertNOI={wertNOI}
              capRatePct={capRatePct}
              setCapRatePct={setCapRatePct}
              nkBreakdown={{
                nkGrEStPct,
                nkNotarPct,
                nkGrundbuchPct,
                nkMaklerPct,
                nkSonstPct,
                nkRenovierung,
                nkSanierung,
                kaufpreisView,
                nkSum,
              }}
            />
          </div>

          {/* SIDEBAR – Glossar sticky */}
          <aside className="xl:col-span-1 mt-8 xl:mt-16">
            <div className="xl:sticky xl:top-24 space-y-4">
              <Card>
                <div className="text-sm font-semibold mb-2">Glossar</div>
                <GlossaryItem
                  term="NOI"
                  def="Net Operating Income = Eff. Kaltmiete – laufende Kosten (nicht umlagefähig)."
                />
                <GlossaryItem
                  term="Leerstand"
                  def="Quote der Zeit, in der die Wohnung nicht vermietet oder nicht bezahlt wird."
                />
                <GlossaryItem
                  term="Annuität"
                  def="Jährliche Rate aus Zins + Tilgung auf das Darlehen (konstant)."
                />
                <GlossaryItem
                  term="DSCR"
                  def="Debt Service Coverage Ratio = NOI / Annuität. Zeigt, wie gut sich die Rate tragen lässt."
                />
                <GlossaryItem
                  term="NOI-Yield"
                  def="NOI / All-in-Kaufpreis – schnelle Renditekennzahl vor Finanzierung."
                />
                <GlossaryItem
                  term="Cap-Rate"
                  def="Renditeerwartung des Marktes. Wert = NOI / Cap-Rate."
                />
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-6xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  Ergebnis <span className="text-[11px]">(live)</span>
                </div>
                <div className="text-sm font-semibold truncate text-foreground">
                  Entscheidung:{" "}
                  {decisionLabel === "RENTABEL"
                    ? "Kaufen"
                    : decisionLabel === "GRENZWERTIG"
                    ? "Weiter prüfen"
                    : "Eher Nein"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card">
                    <Banknote className="h-3.5 w-3.5" />
                    {eur(Math.round(monthlyCF))} mtl.
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card">
                    <Gauge className="h-3.5 w-3.5" />
                    NOI-Yield {pct(noiYield)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card">
                    <TrendingUp className="h-3.5 w-3.5" />
                    DSCR {Number.isFinite(dscr) ? dscr.toFixed(2) : "–"}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-4"
                  style={{
                    borderColor: scorePct >= 70 ? "#16a34a" : scorePct >= 50 ? "#f59e0b" : "#ef4444",
                    color: scorePct >= 70 ? "#16a34a" : scorePct >= 50 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold leading-4">{scorePct}%</div>
                    <div className="text-[9px] leading-3">Score</div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="h-1.5 w-full rounded-b-2xl overflow-hidden"
              style={{ background: "#EAEAEE" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.max(4, Math.min(100, scorePct))}%`,
                  background: scorePct >= 70 ? "#16a34a" : scorePct >= 50 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ------------ lokale Helper in PageInner ------------ */

  function resetBeispiel() {
    setKaufpreis(350_000);
    setFlaecheM2(70);
    setMieteProM2Monat(12);
    setLeerstandPct(0.03);
    setOpexPctBrutto(0.25);

    setNkGrEStPct(0.065);
    setNkNotarPct(0.015);
    setNkGrundbuchPct(0.005);
    setNkMaklerPct(0.0357);
    setNkSonstPct(0.004);
    setNkRenovierung(0);
    setNkSanierung(0);

    setFinancingOn(true);
    setLtvPct(0.9);
    setZinsPct(0.035);
    setTilgungPct(0.02);

    setPriceAdjPct(0);
    setRentAdjPct(0);
    setApplyAdjustments(true);

    setMietSteigerung(0.01);
    setKostenSteigerung(0.015);
    setCapRatePct(0.045);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  if (!f) return;
  e.target.value = "";
  const name = f.name.toLowerCase();
  const type = f.type;
  const isJson = type === "application/json" || name.endsWith(".json");
  const isPdf = type === "application/pdf" || name.endsWith(".pdf");

  // PDF-Import via Backend
  if (isPdf) {
  try {
    setPdfLoading(true);
    const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/import-expose-mfh", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Import fehlgeschlagen");
      const inp = json.data?.input ?? json.data ?? {};
      setKaufpreis(num(inp.kaufpreis, kaufpreis));
      setFlaecheM2(num(inp.gesamtFlaecheM2 ?? inp.flaecheM2, flaecheM2));
      setMieteProM2Monat(
        inp.kaltmieteMonat && inp.gesamtFlaecheM2
          ? inp.kaltmieteMonat / inp.gesamtFlaecheM2
          : num(inp.mieteProM2Monat, mieteProM2Monat)
      );
      setLeerstandPct(num(inp.leerstandPct, leerstandPct));
      if (typeof inp.bundesland === "string") {
        const presets: Record<string, number> = {
          "Baden-Württemberg": 0.05, "Bayern": 0.035, "Berlin": 0.06,
          "Brandenburg": 0.065, "Bremen": 0.05, "Hamburg": 0.055,
          "Hessen": 0.06, "Mecklenburg-Vorpommern": 0.06, "Niedersachsen": 0.05,
          "Nordrhein-Westfalen": 0.065, "Rheinland-Pfalz": 0.05,
          "Saarland": 0.065, "Sachsen": 0.035, "Sachsen-Anhalt": 0.05,
          "Schleswig-Holstein": 0.065, "Thüringen": 0.065,
        };
        if (presets[inp.bundesland]) setNkGrEStPct(presets[inp.bundesland]);
      }
    } catch (err) {
        console.error(err);
        alert("PDF-Import fehlgeschlagen. Bitte prüfe das Exposé oder nutze eine JSON-Datei.");
      } finally {
        setPdfLoading(false);
      }
      return;
  }

  if (!isJson) {
    alert("Dieses Dateiformat wird nicht unterstützt. Bitte JSON oder PDF hochladen.");
    return;
  }

  const r = new FileReader();
  r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        const inp = (data as any).input ?? data;

        setKaufpreis(num(inp.kaufpreis, kaufpreis));
        setFlaecheM2(num(inp.flaecheM2, flaecheM2));
        setMieteProM2Monat(num(inp.mieteProM2Monat, mieteProM2Monat));
        setLeerstandPct(num(inp.leerstandPct, leerstandPct));
        setOpexPctBrutto(num(inp.opexPctBrutto, opexPctBrutto));

        setNkGrEStPct(num(inp.nkGrEStPct, nkGrEStPct));
        setNkNotarPct(num(inp.nkNotarPct, nkNotarPct));
        setNkGrundbuchPct(num(inp.nkGrundbuchPct, nkGrundbuchPct));
        setNkMaklerPct(num(inp.nkMaklerPct, nkMaklerPct));
        setNkSonstPct(num(inp.nkSonstPct, nkSonstPct));
        setNkRenovierung(num(inp.nkRenovierung, nkRenovierung));
        setNkSanierung(num(inp.nkSanierung, nkSanierung));

        setFinancingOn(
          typeof inp.financingOn === "boolean" ? inp.financingOn : financingOn
        );
        setLtvPct(num(inp.ltvPct, ltvPct));
        setZinsPct(num(inp.zinsPct, zinsPct));
        setTilgungPct(num(inp.tilgungPct, tilgungPct));

        setPriceAdjPct(num(inp.priceAdjPct, priceAdjPct));
        setRentAdjPct(num(inp.rentAdjPct, rentAdjPct));
        setApplyAdjustments(
          typeof inp.applyAdjustments === "boolean"
            ? inp.applyAdjustments
            : applyAdjustments
        );

        setMietSteigerung(num(inp.mietSteigerung, mietSteigerung));
        setKostenSteigerung(num(inp.kostenSteigerung, kostenSteigerung));
        setCapRatePct(num(inp.capRatePct, capRatePct));
      } catch {
        alert("Import fehlgeschlagen: Datei/Format ungültig.");
      }
    };
    r.readAsText(f);
  }
}

/* ======================= Details-Section ======================= */

function DetailsSection(props: {
  noiYield: number;
  dscr: number;
  annuitaetMonat: number;
  allIn: number;
  noi: number;
  annuitaetJahr: number;
  bePrice: number | null;
  beRentPerM2: number | null;
  projection: { year: number; noi: number; cf: number }[];
  monthlyEffRent: number;
  monthlyOpex: number;
  monthlyCF: number;
  loan: number;
  wertNOI: number;
  capRatePct: number;
  setCapRatePct: (v: number) => void;
  nkBreakdown: {
    nkGrEStPct: number;
    nkNotarPct: number;
    nkGrundbuchPct: number;
    nkMaklerPct: number;
    nkSonstPct: number;
    nkRenovierung: number;
    nkSanierung: number;
    kaufpreisView: number;
    nkSum: number;
  };
}) {
  const {
    noiYield,
    dscr,
    annuitaetMonat,
    allIn,
    noi,
    annuitaetJahr,
    bePrice,
    beRentPerM2,
    projection,
    monthlyEffRent,
    monthlyOpex,
    monthlyCF,
    loan,
    wertNOI,
    capRatePct,
    setCapRatePct,
    nkBreakdown,
  } = props;

  return (
    <section className="space-y-6">
      <div>
        <div className="text-sm text-foreground font-medium">Detailauswertung</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
          Hier kannst du die Kennzahlen hinter dem Score nachvollziehen: Rendite,
          Tragfähigkeit der Finanzierung, Break-even, Wertindikationen und Monatsrechnung.
        </p>
      </div>

      {/* Block 1: Kern-KPIs */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <KPI
            icon={<Gauge className="h-4 w-4" />}
            label="NOI-Yield"
            value={pct(noiYield)}
            hint="NOI / All-in-Kaufpreis – Rendite vor Finanzierung."
            rating={noiYield >= 0.05 ? "gut" : noiYield >= 0.035 ? "okay" : "schlecht"}
            ratingText={
              noiYield >= 0.05
                ? "Gut – im Zielkorridor (>5%)"
                : noiYield >= 0.035
                ? "Okay – etwas unter Ziel (>5%)"
                : "Niedrig – Zielwert >5%"
            }
          />
          <KPI
            icon={<TrendingUp className="h-4 w-4" />}
            label="DSCR"
            value={Number.isFinite(dscr) ? dscr.toFixed(2) : "–"}
            hint="NOI / Annuität – zeigt, wie gut sich die Rate tragen lässt."
            rating={
              !Number.isFinite(dscr)
                ? null
                : dscr >= 1.2
                ? "gut"
                : dscr >= 1.0
                ? "okay"
                : "schlecht"
            }
            ratingText={
              !Number.isFinite(dscr)
                ? undefined
                : dscr >= 1.2
                ? "Gut – Annuität gut gedeckt (>1,2)"
                : dscr >= 1.0
                ? "Okay – knapp gedeckt (Ziel >1,2)"
                : "Kritisch – NOI deckt Rate nicht"
            }
          />
          <KPI
            icon={<Banknote className="h-4 w-4" />}
            label="Annuität mtl."
            value={eur(Math.round(annuitaetMonat))}
            hint="Zins + Tilgung pro Monat (falls Finanzierung)."
          />
          <KPI
            icon={<Banknote className="h-4 w-4" />}
            label="All-in"
            value={eur(allIn)}
            hint="Kaufpreis inkl. sämtlicher Nebenkosten."
          />
        </div>
      </Card>

      {/* Block 2: Wert (NOI/Cap) vs. Kaufpreis */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium text-foreground">
            Wert (NOI/Cap) vs. Kaufpreis
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Aus dem NOI und deiner Cap-Rate leiten wir eine einfache Wertindikation ab.
            So siehst du, ob der aktuelle Kaufpreis eher über oder unter dieser
            Einschätzung liegt.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <PercentField
            label="Cap-Rate (Marktrendite-Erwartung)"
            value={capRatePct}
            onChange={setCapRatePct}
            step={0.005}
          />
          <div className="text-xs text-muted-foreground flex items-end">
            NOI p.a.: <b className="ml-1">{eur(Math.round(noi))}</b>
          </div>
          <div className="text-xs text-muted-foreground flex items-end">
            Wert (NOI / Cap): <b className="ml-1">{eur(Math.round(wertNOI))}</b>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: "Deal",
                  Preis: allIn,
                  Wert: wertNOI,
                },
              ]}
              margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RTooltip formatter={(v: any) => eur(v)} />
              <Legend />
              <Bar
                dataKey="Preis"
                fill={BRAND}
                radius={[10, 10, 0, 0]}
                name="All-in-Preis"
              >
                <LabelList
                  dataKey="Preis"
                  position="top"
                  formatter={(v: any) => eur(v)}
                />
              </Bar>
              <Bar
                dataKey="Wert"
                fill={CTA}
                radius={[10, 10, 0, 0]}
                name="Wert (NOI/Cap)"
              >
                <LabelList dataKey="Wert" position="top" formatter={(v: any) => eur(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Block 3: Break-even NOI vs. Annuität */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium text-foreground">
            Break-even (NOI vs. Annuität)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Vergleich von operativem Ergebnis und Jahresrate. Liegt der NOI deutlich über
            der Annuität, ist die Finanzierung komfortabler tragbar.
          </p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: "Jahr 1",
                  NOI: Math.round(noi),
                  Annuitaet: Math.round(annuitaetJahr),
                },
              ]}
              margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RTooltip formatter={(v: any) => eur(v)} />
              <Legend />
              <Bar dataKey="NOI" fill={CTA} radius={[10, 10, 0, 0]} name="NOI p.a.">
                <LabelList dataKey="NOI" position="top" formatter={(v: any) => eur(v)} />
              </Bar>
              <Bar
                dataKey="Annuitaet"
                fill={BRAND}
                radius={[10, 10, 0, 0]}
                name="Annuität p.a."
              >
                <LabelList
                  dataKey="Annuitaet"
                  position="top"
                  formatter={(v: any) => eur(v)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Break-even Preis: <b>{bePrice ? eur(bePrice) : "–"}</b> · Erforderliche ⌀-Miete:{" "}
          <b>{beRentPerM2 ? `${beRentPerM2.toFixed(2)} €/m²` : "–"}</b>
        </div>
      </Card>

      {/* Block 4: Projektion */}
      <Card>
        <div className="flex flex-col gap-1 mb-1">
          <div className="text-sm font-medium mb-0.5 text-foreground">
            Projektion (10 Jahre)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Vereinfachte Projektion von NOI und Cashflow unter deinen Annahmen zu Miet-
            und Kostensteigerung – hilfreich, um ein Gefühl für die Robustheit des
            Investments zu bekommen.
          </p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projection}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <RTooltip formatter={(v: any) => eur(v)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="noi"
                name="NOI p.a."
                stroke={BRAND}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cf"
                name="Cashflow p.a."
                stroke={CTA}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Block 5: Monatsrechnung */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium mb-0.5 text-foreground">
            Monatsrechnung (Jahr 1)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Wie setzt sich der monatliche Cashflow zusammen? Hier siehst du die
            wichtigsten Zahlungsströme im Überblick.
          </p>
        </div>
        <ul className="text-sm text-foreground space-y-1">
          <li>
            Eff. Nettokaltmiete mtl.: <b>{eur(Math.round(monthlyEffRent))}</b>
          </li>
          <li>
            Laufende Kosten mtl. (nicht umlagefähig):{" "}
            <b>{eur(Math.round(monthlyOpex))}</b>
          </li>
          <li>
            Zins + Tilgung mtl.: <b>{eur(Math.round(annuitaetMonat))}</b>
          </li>
          <li>
            = Cashflow mtl.: <b>{eur(Math.round(monthlyCF))}</b>
          </li>
        </ul>
      </Card>

      {/* Block 6: Nebenkosten & Darlehen */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium mb-0.5 text-foreground">
            Kaufnebenkosten & Darlehen
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Transparente Aufschlüsselung der Nebenkosten und des aufgenommenen
            Fremdkapitals.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">Kaufnebenkosten im Detail</div>
            <ul className="space-y-1 text-sm">
              <li>
                Grunderwerbsteuer: {pct(nkBreakdown.nkGrEStPct)} ={" "}
                {eur(Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkGrEStPct))}
              </li>
              <li>
                Notar: {pct(nkBreakdown.nkNotarPct)} ={" "}
                {eur(Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkNotarPct))}
              </li>
              <li>
                Grundbuch: {pct(nkBreakdown.nkGrundbuchPct)} ={" "}
                {eur(Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkGrundbuchPct))}
              </li>
              <li>
                Makler: {pct(nkBreakdown.nkMaklerPct)} ={" "}
                {eur(Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkMaklerPct))}
              </li>
              {nkBreakdown.nkSonstPct > 0 && (
                <li>
                  Sonstiges/Puffer: {pct(nkBreakdown.nkSonstPct)} ={" "}
                  {eur(Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkSonstPct))}
                </li>
              )}
              {nkBreakdown.nkRenovierung > 0 && (
                <li>Renovierung (einmalig): {eur(nkBreakdown.nkRenovierung)}</li>
              )}
              {nkBreakdown.nkSanierung > 0 && (
                <li>Sanierung (einmalig): {eur(nkBreakdown.nkSanierung)}</li>
              )}
              <li className="mt-2">
                <b>Summe NK</b>: {eur(nkBreakdown.nkSum)}
              </li>
              <li>
                All-in = Kaufpreis + NK ={" "}
                <b>{eur(nkBreakdown.nkSum + nkBreakdown.kaufpreisView)}</b>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-medium mb-1">Fremdkapital</div>
            <ul className="space-y-1 text-sm">
              <li>
                Darlehensbetrag: <b>{eur(Math.round(loan))}</b>
              </li>
              <li>
                Annuität p.a.: <b>{eur(Math.round(annuitaetJahr))}</b>
              </li>
              <li>
                Annuität mtl.: <b>{eur(Math.round(annuitaetMonat))}</b>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Hinweis: vereinfachte Annahme mit konstanter Annuität und gleichbleibendem
              Zinssatz. Sondertilgungen oder Zinsanpassungen werden nicht berücksichtigt.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ======================= weitere Utils ======================= */

function buildProjection10y(opts: {
  years: number;
  effRentY1: number;
  opex0: number;
  rentGrowth: number;
  costGrowth: number;
  annuitaetJahr: number;
}) {
  const { years, effRentY1, opex0, rentGrowth, costGrowth, annuitaetJahr } = opts;
  const data: { year: number; noi: number; cf: number }[] = [];
  for (let t = 1; t <= years; t++) {
    const effRentT = effRentY1 * Math.pow(1 + rentGrowth, t - 1);
    const opexT = opex0 * Math.pow(1 + costGrowth, t - 1);
    const noi = Math.max(0, effRentT - opexT);
    const cf = noi - annuitaetJahr;
    data.push({ year: t, noi: Math.round(noi), cf: Math.round(cf) });
  }
  return data;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scale(x: number, a: number, b: number) {
  if (b === a) return 0;
  return clamp01((x - a) / (b - a));
}
