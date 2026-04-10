// src/routes/MFHCheck.tsx
// Mehrfamilienhaus-Check – v3.8 (UX-Refresh + Erklärtexte)
// - Fokus auf klare Entscheidungsempfehlung & schnelle Hebel
// - Zwischenstand: Ampel + Begründung + Tipps, optisch hervorgehoben
// - Spielwiese direkt unter dem Zwischenstand
// - Mehr Erklärtexte für Eingaben, Projektion, Monatsrechnung, NK-Details
// - Sidebar schlank (Glossar), etwas weiter nach unten versetzt

import React, { useEffect, useMemo, useState } from "react";
import {
  Home as HomeIcon,
  RefreshCw,
  Upload,
  Download,
  Info,
  Settings2,
  Wand2,
  Gauge,
  TrendingUp,
  Banknote,
  Plus,
  Trash2,
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
import PlanGuard from "@/components/PlanGuard";

/* ---------------- Types ---------------- */
type ViewMode = "einfach" | "erweitert";
type Unit = { id: string; name: string; areaM2: number; rentPerM2: number };
type Tip = { label: string; detail: string };
type DecisionLabel = "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";

/* ---------------- Theme ---------------- */
const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#ff914d";
const SURFACE = "#f0f2f7";

/* ---------------- Bundesland-Defaults ---------------- */
const LAND_PRESETS: Record<
  string,
  { grest: number; notar: number; grundbuch: number; makler: number }
> = {
  "Baden-Württemberg": { grest: 0.05, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Bayern: { grest: 0.035, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Berlin: { grest: 0.065, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Brandenburg: { grest: 0.065, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Bremen: { grest: 0.05, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Hamburg: { grest: 0.045, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Hessen: { grest: 0.06, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Niedersachsen: { grest: 0.05, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Mecklenburg_Vorpommern: { grest: 0.06, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  NRW: { grest: 0.065, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Rheinland_Pfalz: { grest: 0.05, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Saarland: { grest: 0.065, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Sachsen: { grest: 0.035, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Sachsen_Anhalt: { grest: 0.05, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Schleswig_Holstein: { grest: 0.065, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
  Thüringen: { grest: 0.065, notar: 0.015, grundbuch: 0.005, makler: 0.0357 },
};
const LAND_LIST = Object.keys(LAND_PRESETS);

/* ---------------- Kleine UI-Atoms ---------------- */
function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
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
    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold tracking-wide">
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
  return (
    <div
      className={`rounded-2xl bg-white border border-gray-100 p-5 ${className}`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
    >
      {children}
    </div>
  );
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
    <div className="rounded-2xl bg-white border-2 border-amber-100 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          {description && (
            <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
              {description}
            </p>
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
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/20 focus:border-[#0F2C8A]/40 transition-all"
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
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/20 focus:border-[#0F2C8A]/40 transition-all"
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

/* ---------------- Export Dropdown ---------------- */

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

/* ---------------- Haupt-Komponente ---------------- */

export default function MFHCheck() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}
function PageInner() {
  // Global: Number-Scroll-Schutz
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

  // Modus-Schalter (global) – Persistenz
  const MODE_KEY = "mfh.mode.v3";
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(MODE_KEY) : null;
      return raw === "erweitert" || raw === "einfach" ? (raw as ViewMode) : "einfach";
    } catch {
      return "einfach";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  // ===== Objekt / Flächenmanagement =====
  const [mgmtMode, setMgmtMode] = useState<"gesamt" | "einheiten">("gesamt");
  const [gesamtFlaecheM2, setGesamtFlaecheM2] = useState(520);
  const [kaltmieteJahr, setKaltmieteJahr] = useState(45_000);
  const [nichtUmlagefaehigeKosten, setNichtUmlagefaehigeKosten] = useState(6_500);
  const [units, setUnits] = useState<Unit[]>([
    { id: uid(), name: "WE 1", areaM2: 53, rentPerM2: 9.5 },
    { id: uid(), name: "WE 2", areaM2: 56, rentPerM2: 9.2 },
  ]);
  const [leerstandPct, setLeerstandPct] = useState(0.04);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Kaufpreis & NK
  const [kaufpreis, setKaufpreis] = useState(650_000);
  const [bundesland, setBundesland] = useState<string>("Berlin");
  const [nkGrEStPct, setNkGrEStPct] = useState(LAND_PRESETS["Berlin"].grest);
  const [nkNotarPct, setNkNotarPct] = useState(LAND_PRESETS["Berlin"].notar);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(LAND_PRESETS["Berlin"].grundbuch);
  const [nkMaklerPct, setNkMaklerPct] = useState(LAND_PRESETS["Berlin"].makler);
  const [nkSonstPct, setNkSonstPct] = useState(0.004);
  const [nkRenovierung, setNkRenovierung] = useState(0);
  const [nkSanierung, setNkSanierung] = useState(0);
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // Finanzierung inkl. EK
  const [eigenkapital, setEigenkapital] = useState(150_000);
  const [manualLoan, setManualLoan] = useState(false);
  const [darlehenManual, setDarlehenManual] = useState(400_000);
  const [zins, setZins] = useState(0.035);
  const [tilgung, setTilgung] = useState(0.02);

  // Spielwiese
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // NK-Preset anwenden
  function applyLandPreset(name: string) {
    const p = LAND_PRESETS[name];
    if (!p) return;
    setBundesland(name);
    setNkGrEStPct(p.grest);
    setNkNotarPct(p.notar);
    setNkGrundbuchPct(p.grundbuch);
    setNkMaklerPct(p.makler);
  }

  // Abgeleitete Summen (Flächenmanagement)
  const totals = useMemo(() => {
    if (mgmtMode === "gesamt") {
      const avgRentPerM2 =
        gesamtFlaecheM2 > 0 ? kaltmieteJahr / (gesamtFlaecheM2 * 12) : 0;
      return { area: gesamtFlaecheM2, grossRentYear: kaltmieteJahr, avgRentPerM2 };
    } else {
      const area = units.reduce((s, u) => s + num(u.areaM2, 0), 0);
      const grossRentYear = units.reduce(
        (s, u) => s + num(u.areaM2, 0) * num(u.rentPerM2, 0) * 12,
        0
      );
      const avgRentPerM2 = area > 0 ? grossRentYear / (area * 12) : 0;
      return { area, grossRentYear, avgRentPerM2 };
    }
  }, [mgmtMode, gesamtFlaecheM2, kaltmieteJahr, units]);

  // Preis-Anpassung + All-in
  const kaufpreisAdj = Math.round(kaufpreis * (1 + priceAdjPct));
  const kaufpreisView = applyAdjustments ? kaufpreisAdj : kaufpreis;
  const nkSumPercent = Math.round(kaufpreisView * nkPct);
  const nkSum = nkSumPercent + Math.max(0, nkRenovierung) + Math.max(0, nkSanierung);
  const allIn = kaufpreisView + nkSum;

  // Miete-Anpassung + Leerstand
  const grossRentAdj =
    totals.grossRentYear * (1 + (applyAdjustments ? rentAdjPct : 0));
  const effRentYear = grossRentAdj * (1 - clamp01(leerstandPct));

  // Instandhaltungsrücklage (ehem. CapEx)
  const [capexRuecklagePctBrutto, setCapexRuecklagePctBrutto] = useState(0.03);
  const capexRuecklage = grossRentAdj * capexRuecklagePctBrutto;
  const noi = Math.max(0, effRentYear - nichtUmlagefaehigeKosten - capexRuecklage);

  // Darlehen (aus EK oder manuell)
  const loan = Math.max(
    0,
    manualLoan ? darlehenManual : kaufpreisView - Math.max(0, eigenkapital)
  );
  const annuitaetJahr = loan * (zins + tilgung);
  const annuitaetMonat = annuitaetJahr / 12;
  const zinsMonat = (loan * zins) / 12;
  const tilgungMonat = (loan * tilgung) / 12;

  // KPIs & Score
  const noiYield = kaufpreisView > 0 ? noi / kaufpreisView : 0;
  const dscr = annuitaetJahr > 0 ? noi / annuitaetJahr : 0;
  const score = clamp01(
    scale(noiYield, 0.035, 0.07) * 0.55 + scale(dscr, 1.1, 1.6) * 0.45
  );
  const scorePct = Math.round(score * 100);

  // Monatsrechnung (Y1)
  const monthlyEffRent = effRentYear / 12;
  const monthlyOpex = nichtUmlagefaehigeKosten / 12;
  const monthlyCapex = capexRuecklage / 12;
  const monthlyCF = monthlyEffRent - monthlyOpex - monthlyCapex - annuitaetMonat;

  // Projektion (10 Jahre)
  const [mietSteigerung, setMietSteigerung] = useState(0.01);
  const [kostenSteigerung, setKostenSteigerung] = useState(0.015);
  const projection = useMemo(
    () =>
      buildProjection10y({
        years: 10,
        effRentY1: effRentYear,
        nichtUmlagefaehige0: nichtUmlagefaehigeKosten,
        capexPct0: capexRuecklagePctBrutto,
        rentGrowth: mietSteigerung,
        costGrowth: kostenSteigerung,
        annuitaetJahr,
      }),
    [
      effRentYear,
      nichtUmlagefaehigeKosten,
      capexRuecklagePctBrutto,
      mietSteigerung,
      kostenSteigerung,
      annuitaetJahr,
    ]
  );

  // Tilgungsplan (10y Übersicht)
  const amort = useMemo(
    () => buildAmortization({ darlehen: loan, zins, annuitaetJahr, maxYears: 40 }),
    [loan, zins, annuitaetJahr]
  );

  // Break-even Solver
  const bePrice = breakEvenPriceForCashflowZero({
    basePrice: kaufpreisView,
    area: totals.area,
    grossRentY: totals.grossRentYear,
    rentAdjPct: applyAdjustments ? rentAdjPct : 0,
    leerstandPct,
    nichtUmlagefaehigeKosten,
    capexPctBrutto: capexRuecklagePctBrutto,
    ek: eigenkapital,
    zins,
    tilgung,
    manualLoan,
  });
  const beRentPerM2 = breakEvenRentPerM2ForCashflowZero({
    price: kaufpreisView,
    area: totals.area,
    rentPerM2Now: totals.avgRentPerM2,
    leerstandPct,
    nichtUmlagefaehigeKosten,
    capexPctBrutto: capexRuecklagePctBrutto,
    ek: eigenkapital,
    zins,
    tilgung,
    manualLoan,
    loan,
  });

  // Tipps (werden im Zwischenstand genutzt)
  const tips: Tip[] = useMemo(() => {
    const t: Tip[] = [];
    if (beRentPerM2) {
      t.push({
        label: "Miete anheben",
        detail: `auf ~ ${beRentPerM2.toFixed(
          2
        )} €/m² – dann wird der Cashflow voraussichtlich positiv.`,
      });
    }
    if (bePrice) {
      t.push({
        label: "Kaufpreis verhandeln",
        detail: `auf ca. ${eur(bePrice)} – verbessert Rendite und Risiko deutlich.`,
      });
    }
    const r = zins + tilgung;
    if (!manualLoan && r > 0) {
      const ekZiel = Math.max(0, kaufpreisView - noi / r);
      const delta = Math.max(0, Math.ceil(ekZiel - eigenkapital));
      if (delta > 0) {
        t.push({
          label: "Mehr Eigenkapital",
          detail: `+ ${eur(delta)} – senkt Rate und verbessert DSCR.`,
        });
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
  }, [beRentPerM2, bePrice, manualLoan, kaufpreisView, eigenkapital, zins, tilgung, noi]);

  /* -------- Entscheidung / Ampel-Logik -------- */

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
      "Der Cashflow ist positiv und die Kennzahlen liegen im Zielkorridor. Die Immobilie wirkt aktuell wirtschaftlich tragfähig.";
  } else if (decisionLabel === "GRENZWERTIG") {
    decisionText =
      "Der Cashflow liegt leicht im Plus oder um die Null-Linie. Die Kennzahlen sind okay, aber du solltest genau prüfen (Miete, EK, Zinsbindung, Kosten).";
  } else {
    decisionText =
      "Der Cashflow ist negativ und/oder die Kennzahlen liegen unter typischen Zielwerten. Aus heutiger Sicht ist die Immobilie wirtschaftlich nicht attraktiv.";
  }

  /* -------- Layout / Render -------- */

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f7" }}>
      <div className="max-w-6xl mx-auto px-5 py-8 space-y-8 pb-40">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 rounded-2xl grid place-items-center"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, #1a4fc4)`,
                color: "#fff",
                boxShadow: "0 4px 12px rgba(15,44,138,0.3)"
              }}
            >
              <HomeIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Mehrfamilienhaus-Check
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Portfolio-tauglich · Live-Score · Break-even · Projektion
              </p>
              <p className="text-xs text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                Mit diesem Tool kannst du die Profitabilität eines Mehrfamilienhauses
                in wenigen Minuten durchrechnen. Gib die Basiswerte zu Kaufpreis,
                Finanzierung und Mieten ein und sieh direkt im Scoring, ob sich das
                Objekt unter deinen Annahmen voraussichtlich lohnt.
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
              className="px-3 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-gray-700"
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
        {/* Modus-Schalter */}
        <div className="sticky top-0 z-10 py-2 -mt-2" style={{ background: "#f0f2f7" }}>
          <div className="flex items-center">
            <div
              className="inline-flex rounded-xl border p-1 bg-white text-sm"
              title="Modus wählen"
            >
              <button
                className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${
                  mode === "einfach"
                    ? "bg-[#0F2C8A] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setMode("einfach")}
              >
                <Wand2 className="h-4 w-4" /> Einfach
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${
                  mode === "erweitert"
                    ? "bg-[#0F2C8A] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setMode("erweitert")}
              >
                <Settings2 className="h-4 w-4" /> Erweitert
              </button>
            </div>
          </div>
        </div>

        {/* 2-Spalten-Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MAIN */}
          <div className="xl:col-span-2 space-y-6">
            {/* ===== Eingaben ===== */}
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Eingaben</h2>
                <p className="text-xs text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                  Starte hier mit den Basisdaten zu Kaufpreis, Nebenkosten,
                  Finanzierung und Mieten. Alle Eingaben sind flexibel anpassbar – die
                  Auswertung oben im Zwischenstand reagiert direkt auf deine
                  Änderungen.
                </p>
              </div>

              {/* 1) Kaufpreis & NK */}
              <InputCard
                title="Kaufpreis & Nebenkosten"
                subtitle="Bundesland wählen (Voreinstellungen) – Werte sind frei überschreibbar"
                description="In diesem Abschnitt trägst du sämtliche Kostenfaktoren rund um den Kauf ein. Auf Basis von Kaufpreis und Nebenkosten berechnen wir den All-in-Preis der Immobilie."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberField
                    label="Kaufpreis (€)"
                    value={kaufpreis}
                    onChange={setKaufpreis}
                    step={1000}
                  />
                  <div>
                    <LabelWithHelp
                      label="Bundesland (Preset)"
                      help="Setzt typische Prozentsätze – alle Felder unten bleiben editierbar."
                    />
                    <select
                      className="mt-1 w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
                      value={bundesland}
                      onChange={(e) => applyLandPreset(e.target.value)}
                    >
                      {LAND_LIST.map((l) => (
                        <option key={l} value={l}>
                          {l.replace("_", "-")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    label="Sonstiges/Puffer"
                    value={nkSonstPct}
                    onChange={setNkSonstPct}
                  />
                  <NumberField
                    label="Renovierungskosten (einmalig, €)"
                    value={nkRenovierung}
                    onChange={setNkRenovierung}
                    step={500}
                  />
                  <NumberField
                    label="Sanierungskosten (einmalig, €)"
                    value={nkSanierung}
                    onChange={setNkSanierung}
                    step={500}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Summe NK (prozentual): <b>{pct(nkPct)}</b> ={" "}
                  <b>{eur(nkSumPercent)}</b> · Einmalig:{" "}
                  <b>{eur(nkRenovierung + nkSanierung)}</b> · All-in:{" "}
                  <b>{eur(allIn)}</b>
                </div>
              </InputCard>

              {/* 2) Finanzierung */}
              <InputCard
                title="Finanzierung"
                subtitle="Eigenkapital + Darlehen · konstante Annuität aus Zins & Tilgung"
                description="Hier legst du fest, wie viel Eigenkapital du einbringst und wie dein Darlehen aussieht. Daraus ergeben sich Rate, Zins- und Tilgungsanteile sowie die wichtigsten Risikokennzahlen."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberField
                    label="Eigenkapital (€)"
                    value={eigenkapital}
                    onChange={setEigenkapital}
                    step={1000}
                  />
                  <label className="text-xs inline-flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={manualLoan}
                      onChange={(e) => setManualLoan(e.target.checked)}
                    />{" "}
                    Darlehen manuell setzen
                  </label>
                  {manualLoan && (
                    <NumberField
                      label="Darlehen (manuell, €)"
                      value={darlehenManual}
                      onChange={setDarlehenManual}
                      step={1000}
                    />
                  )}
                  <PercentField
                    label="Zins p.a."
                    value={zins}
                    onChange={setZins}
                    step={0.01}
                  />
                  <PercentField
                    label="Tilgung p.a."
                    value={tilgung}
                    onChange={setTilgung}
                    step={0.01}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Fremdkapital (berechnet): <b>{eur(loan)}</b> · Annuität p.a.:{" "}
                  <b>{eur(Math.round(annuitaetJahr))}</b> · mtl.:{" "}
                  <b>{eur(Math.round(annuitaetMonat))}</b>
                </div>
              </InputCard>

              {/* 3) Flächenmanagement & Einnahmen */}
              <InputCard
                title="Flächenmanagement & Einnahmen"
                subtitle="Gesamtwerte ODER auf Einheitenebene erfassen (summiert)"
                description="Beschreibe hier dein Objekt: entweder als Gesamtdaten oder detailliert nach Einheiten. Aus Fläche, Miete und Leerstand berechnen wir deine effektiven Mieteinnahmen."
              >
                <div className="flex items-center gap-3 text-xs mb-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mgmtMode === "gesamt"}
                      onChange={() => setMgmtMode("gesamt")}
                    />{" "}
                    Gesamtdaten
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mgmtMode === "einheiten"}
                      onChange={() => setMgmtMode("einheiten")}
                    />{" "}
                    Einheiten
                  </label>
                </div>

                {mgmtMode === "gesamt" ? (
                  <>
                    <NumberField
                      label="Gesamtfläche (m²)"
                      value={gesamtFlaecheM2}
                      onChange={setGesamtFlaecheM2}
                    />
                    <NumberField
                      label="Gesamtkaltmiete p.a. (€)"
                      value={kaltmieteJahr}
                      onChange={setKaltmieteJahr}
                      step={500}
                    />
                    <div className="text-xs text-muted-foreground">
                      ⌀ Miete: <b>{totals.avgRentPerM2.toFixed(2)} €/m²</b>
                    </div>
                  </>
                ) : (
                  <UnitsEditor
                    units={units}
                    updateUnit={updateUnit}
                    removeUnit={removeUnit}
                    addUnit={addUnit}
                    totals={totals}
                  />
                )}

                <PercentField
                  label="Leerstand (Quote)"
                  value={leerstandPct}
                  onChange={setLeerstandPct}
                  help="Mietausfall/Fluktuation – wirkt auf Effektivmiete"
                />

                <NumberField
                  label="Nicht umlagefähige Kosten p.a. (€)"
                  value={nichtUmlagefaehigeKosten}
                  onChange={setNichtUmlagefaehigeKosten}
                  step={100}
                />
                <PercentField
                  label="Instandhaltungsrücklage (% der Bruttomiete)"
                  value={capexRuecklagePctBrutto}
                  onChange={setCapexRuecklagePctBrutto}
                  step={0.005}
                />
              </InputCard>
            </section>

            {/* ===== Zwischenstand + Spielwiese ===== */}
            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Zwischenstand & Empfehlung
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Hier siehst du auf einen Blick, wie dein Mehrfamilienhaus unter den
                  aktuellen Annahmen performt. Ampel, Score und kurze Begründung helfen
                  dir bei der Entscheidung, ob sich ein Einstieg lohnt – inklusive
                  konkreter Hebel zur Verbesserung.
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
                  In der Spielwiese kannst du Kaufpreis und Miete testweise verändern und
                  direkt sehen, wie sich Score und Cashflow verschieben – ideal für
                  Verhandlungen und „Was-wäre-wenn“-Szenarien.
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

            {/* ===== Details ===== */}
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
              monthlyCapex={monthlyCapex}
              monthlyCF={monthlyCF}
              zinsMonat={zinsMonat}
              tilgungMonat={tilgungMonat}
              amort={amort}
              nkBreakdown={{
                bundesland,
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

          {/* SIDEBAR – bewusst schlank: nur Glossar */}
          <aside className="xl:col-span-1 mt-8 xl:mt-16">
            <div className="xl:sticky xl:top-8 space-y-4">
              <Card>
                <div className="text-sm font-semibold mb-2">Glossar</div>
                <GlossaryItem
                  term="NOI"
                  def="Net Operating Income = Eff. Kaltmiete – nicht umlagefähige Kosten – Instandhaltungsrücklage."
                />
                <GlossaryItem
                  term="Leerstand"
                  def="Quote der nicht vermieteten / nicht zahlenden Fläche. Wirkt auf Eff. Miete."
                />
                <GlossaryItem
                  term="Annuität"
                  def="Jährliche Rate aus Zins + Tilgung auf die Darlehenshöhe (konstant)."
                />
                <GlossaryItem
                  term="DSCR"
                  def="Debt Service Coverage Ratio = NOI / Annuität. >1,2 ist häufig Zielgröße."
                />
                <GlossaryItem
                  term="NOI-Yield"
                  def="NOI / Kaufpreis – schnelle Renditekennzahl (vor Finanzierung)."
                />
                <GlossaryItem
                  term="Break-even"
                  def="Punkt, an dem NOI die Annuität deckt (CF ≥ 0)."
                />
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky Ergebnis-Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-6xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="p-3 flex items-center justify-between gap-3">
              {/* Links: Entscheidung + Badges */}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  Ergebnis{" "}
                  <span className="text-[11px] text-muted-foreground">(live)</span>
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
                    DSCR {dscr.toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Rechts: Score */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center border-4 flex-shrink-0"
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
            {/* Progress-Bar */}
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

  /* ===== Aktionen & Helper-Funktionen (innerhalb von PageInner) ===== */

  // Gemeinsame Import-Logik (wird von JSON & PDF genutzt)
  function applyImportedInput(raw: any) {
    const inp = (raw as any).input ?? raw;

    setMode(inp.mode === "erweitert" ? "erweitert" : "einfach");
    setMgmtMode(inp.mgmtMode === "einheiten" ? "einheiten" : "gesamt");

    if (inp.mgmtMode === "einheiten" && Array.isArray(inp.units)) {
      setUnits(
        inp.units.map((u: any, i: number) => ({
          id: uid(),
          name: String(u.name ?? `WE ${i + 1}`),
          areaM2: Number(u.areaM2 ?? 0),
          rentPerM2: Number(u.rentPerM2 ?? 0),
        }))
      );
    } else {
      setGesamtFlaecheM2(Number(inp.gesamtFlaecheM2 ?? 0));
      setKaltmieteJahr(Number(inp.kaltmieteJahr ?? 0));
    }

    setNichtUmlagefaehigeKosten(Number(inp.nichtUmlagefaehigeKosten ?? 0));
    setLeerstandPct(Number(inp.leerstandPct ?? 0));

    setKaufpreis(Number(inp.kaufpreis ?? 0));
    if (typeof inp.bundesland === "string" && LAND_PRESETS[inp.bundesland]) {
      setBundesland(inp.bundesland);
    }
    setNkGrEStPct(Number(inp.nkGrEStPct ?? nkGrEStPct));
    setNkNotarPct(Number(inp.nkNotarPct ?? nkNotarPct));
    setNkGrundbuchPct(Number(inp.nkGrundbuchPct ?? nkGrundbuchPct));
    setNkMaklerPct(Number(inp.nkMaklerPct ?? nkMaklerPct));
    setNkSonstPct(Number(inp.nkSonstPct ?? nkSonstPct));
    setNkRenovierung(Number(inp.nkRenovierung ?? 0));
    setNkSanierung(Number(inp.nkSanierung ?? 0));

    setEigenkapital(Number(inp.eigenkapital ?? 0));
    setManualLoan(Boolean(inp.manualLoan));
    setDarlehenManual(Number(inp.darlehenManual ?? 0));
    setZins(Number(inp.zins ?? 0));
    setTilgung(Number(inp.tilgung ?? 0));

    setPriceAdjPct(Number(inp.priceAdjPct ?? 0));
    setRentAdjPct(Number(inp.rentAdjPct ?? 0));
    setApplyAdjustments(
      typeof inp.applyAdjustments === "boolean" ? inp.applyAdjustments : true
    );

    setCapexRuecklagePctBrutto(
      Number(inp.capexRuecklagePctBrutto ?? capexRuecklagePctBrutto)
    );
    setMietSteigerung(Number(inp.mietSteigerung ?? 0.01));
    setKostenSteigerung(Number(inp.kostenSteigerung ?? 0.015));
  }

  function resetBeispiel() {
    setMode("einfach");
    setMgmtMode("gesamt");
    setGesamtFlaecheM2(520);
    setKaltmieteJahr(45_000);
    setNichtUmlagefaehigeKosten(6_500);
    setUnits([
      { id: uid(), name: "WE 1", areaM2: 53, rentPerM2: 9.5 },
      { id: uid(), name: "WE 2", areaM2: 56, rentPerM2: 9.2 },
    ]);
    setLeerstandPct(0.04);

    setKaufpreis(650_000);
    applyLandPreset("Berlin");
    setNkSonstPct(0.004);
    setNkRenovierung(0);
    setNkSanierung(0);

    setEigenkapital(150_000);
    setManualLoan(false);
    setDarlehenManual(400_000);
    setZins(0.035);
    setTilgung(0.02);

    setPriceAdjPct(0);
    setRentAdjPct(0);
    setApplyAdjustments(true);

    setCapexRuecklagePctBrutto(0.03);
    setMietSteigerung(0.01);
    setKostenSteigerung(0.015);
  }

  // JSON + PDF Import
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    // erlaubt, denselben Dateinamen erneut auszuwählen
    e.target.value = "";

    const name = f.name.toLowerCase();
    const type = f.type;

    const isJson =
      type === "application/json" || name.endsWith(".json");
    const isPdf =
      type === "application/pdf" || name.endsWith(".pdf");

    // JSON-Import (wie bisher)
    if (isJson) {
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(String(r.result));
          applyImportedInput(data);
        } catch {
          alert("Import fehlgeschlagen: Datei/Format ungültig.");
        }
      };
      r.readAsText(f);
      return;
    }

    // PDF-Expose-Import (Backend)
    if (isPdf) {
  try {
    setPdfLoading(true);
    const formData = new FormData();
        formData.append("file", f);

        const res = await fetch("/api/import-expose-mfh", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
	if (!data.success) throw new Error(data.error || "Import fehlgeschlagen");
	applyImportedInput(data.data);
      } catch (err) {
        console.error(err);
        alert(
          "PDF-Import fehlgeschlagen. Bitte prüfe das Exposé oder nutze eine JSON-Datei."
        );
      } finally {
        setPdfLoading(false);
      }
      return;
    }

    alert("Dieses Dateiformat wird nicht unterstützt. Bitte JSON oder PDF hochladen.");
  }

  function runExport(opts: { json: boolean; csv: boolean; pdf: boolean }) {
    const timestamp = ts();

    const input = {
      mode,
      mgmtMode,
      gesamtFlaecheM2,
      kaltmieteJahr,
      nichtUmlagefaehigeKosten,
      units,
      leerstandPct,
      kaufpreis,
      bundesland,
      nkGrEStPct,
      nkNotarPct,
      nkGrundbuchPct,
      nkMaklerPct,
      nkSonstPct,
      nkRenovierung,
      nkSanierung,
      eigenkapital,
      manualLoan,
      darlehenManual,
      zins,
      tilgung,
      priceAdjPct,
      rentAdjPct,
      applyAdjustments,
      capexRuecklagePctBrutto,
      mietSteigerung,
      kostenSteigerung,
    };

    const metrics = {
      scorePct,
      decisionLabel,
      decisionText,
      monthlyCF,
      monthlyEffRent,
      monthlyOpex,
      monthlyCapex,
      annuitaetMonat,
      noi,
      noiYield,
      dscr,
      bePrice,
      beRentPerM2,
      loan,
      allIn,
    };

    if (opts.json) {
      const payload = { createdAt: timestamp, input, metrics };
      downloadBlob(
        `mfh-check_${timestamp}.json`,
        "application/json",
        JSON.stringify(payload, null, 2)
      );
    }

    if (opts.csv) {
      const rows = [
        [
          "Kaufpreis",
          "All-in",
          "NOI_Yield",
          "DSCR",
          "CF_monat",
          "CF_Jahr",
          "Entscheidung",
        ],
        [
          kaufpreis,
          allIn,
          (noiYield * 100).toFixed(2) + " %",
          dscr.toFixed(2),
          Math.round(monthlyCF),
          Math.round(monthlyCF * 12),
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
      downloadBlob(`mfh-check_${timestamp}.csv`, "text/csv;charset=utf-8", csv);
    }

    if (opts.pdf) {
      const lines = [
        "Mehrfamilienhaus-Check – Kurzreport",
        "",
        `Zeitpunkt: ${timestamp}`,
        "",
        `Entscheidung: ${decisionLabel}`,
        decisionText,
        "",
        `Score: ${scorePct} %`,
        `Cashflow Monat: ${eur(Math.round(monthlyCF))}`,
        `NOI-Yield: ${(noiYield * 100).toFixed(2)} %`,
        `DSCR: ${dscr.toFixed(2)}`,
      ];
      const content = lines.join("\n");
      downloadBlob(
        `mfh-check_${timestamp}.txt`,
        "text/plain;charset=utf-8",
        content
      );
    }
  }

  function updateUnit({ id, patch }: { id: string; patch: Partial<Unit> }) {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  function removeUnit(id: string) {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }

  function addUnit() {
    setUnits((prev) => [
      ...prev,
      {
        id: uid(),
        name: `WE ${prev.length + 1}`,
        areaM2: 50,
        rentPerM2: totals.avgRentPerM2 || 10,
      },
    ]);
  }
}
/* ---------------- Widgets & UI-Komponenten ---------------- */

function UnitsEditor({
  units,
  updateUnit,
  removeUnit,
  addUnit,
  totals,
}: {
  units: Unit[];
  updateUnit: (opts: { id: string; patch: Partial<Unit> }) => void;
  removeUnit: (id: string) => void;
  addUnit: () => void;
  totals: { area: number; grossRentYear: number; avgRentPerM2: number };
}) {
  return (
    <div className="space-y-2">
      {units.map((u, idx) => (
        <div key={u.id} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <LabelWithHelp label="Einheit" />
            <input
              className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
              value={u.name}
              onChange={(e) =>
                updateUnit({ id: u.id, patch: { name: e.target.value } })
              }
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
          <div className="col-span-3">
            <LabelWithHelp label="Fläche (m²)" />
            <input
              type="number"
              className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
              value={u.areaM2}
              onChange={(e) =>
                updateUnit({
                  id: u.id,
                  patch: { areaM2: num(e.target.value, u.areaM2) },
                })
              }
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
          <div className="col-span-3">
            <LabelWithHelp label="Miete (€/m²/Monat)" />
            <input
              type="number"
              step={0.1}
              className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
              value={u.rentPerM2}
              onChange={(e) =>
                updateUnit({
                  id: u.id,
                  patch: { rentPerM2: num(e.target.value, u.rentPerM2) },
                })
              }
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              className="mb-1 inline-flex items-center justify-center h-9 px-3 rounded-lg border hover:bg-red-50"
              onClick={() => removeUnit(u.id)}
              title="Zeile löschen"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
          <div className="col-span-12 text-xs text-muted-foreground -mt-1">
            Kaltmiete p.a.: <b>{eur(Math.round(u.areaM2 * u.rentPerM2 * 12))}</b>
          </div>
          {idx < units.length - 1 && <div className="col-span-12 border-b" />}
        </div>
      ))}

      <button
        className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-card hover:shadow"
        onClick={addUnit}
      >
        <Plus className="h-3.5 w-3.5" /> Einheit hinzufügen
      </button>

      <div className="text-xs text-muted-foreground">
        Summe Fläche:{" "}
        <b>{totals.area.toLocaleString("de-DE")} m²</b> · Summe Miete p.a.:{" "}
        <b>{eur(Math.round(totals.grossRentYear))}</b> · ⌀:{" "}
        <b>{totals.avgRentPerM2.toFixed(2)} €/m²</b>
      </div>
    </div>
  );
}

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
    <div
      className="rounded-2xl shadow-md border overflow-hidden"
      style={{ background: BRAND }}
    >
      <div className="p-4 md:p-5 flex flex-col lg:flex-row gap-6 text-white">
        {/* Linke Seite: Ampel / Kennzahlen */}
        <div className="lg:w-1/3 flex flex-col gap-3">
          <div className="text-xs font-medium text-white/70">
            Entscheidungsempfehlung
          </div>
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
              <div className="font-semibold text-white">
                {eur(Math.round(noi))}
              </div>
            </div>
            <div>
              <div className="text-white/70">Annuität p.a.</div>
              <div className="font-semibold text-white">
                {eur(Math.round(annuitaetJahr))}
              </div>
            </div>
          </div>
        </div>

        {/* Rechte Seite: Begründung + Tipps */}
        <div className="lg:flex-1 space-y-3">
          <div className="text-xs font-medium text-white/70">
            Begründung (Kurzfassung)
          </div>
          <p className="text-sm text-white/90 leading-snug">
            {decisionText}
          </p>

          <div className="text-xs font-medium text-white/70 mt-2">
            Schnelle Hebel
          </div>
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
        <div className="text-sm font-semibold">Spielwiese: Preis & Miete</div>
        <span className="text-[11px] text-gray-500">
          Änderungen wirken live auf Score & Cashflow
        </span>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Kaufpreis-Anpassung
          </div>
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
          <div className="text-xs tabular-nums -mt-1">
            {signedPct(priceAdjPct)}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Miete-Anpassung
          </div>
          <input
            aria-label="Miet-Anpassung"
            type="range"
            min={-0.3}
            max={0.5}
            step={0.005}
            value={rentAdjPct}
            onChange={(e) => setRentAdjPct(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs tabular-nums -mt-1">
            {signedPct(rentAdjPct)}
          </div>
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
  monthlyCapex: number;
  monthlyCF: number;
  zinsMonat: number;
  tilgungMonat: number;
  amort: ReturnType<typeof buildAmortization>;
  nkBreakdown: {
    bundesland: string;
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
    monthlyCapex,
    monthlyCF,
    zinsMonat,
    tilgungMonat,
    amort,
    nkBreakdown,
  } = props;

  return (
    <section className="space-y-6">
      <div>
        <div className="text-sm text-foreground font-medium">Detailberechnungen</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
          In diesem Bereich kannst du die Kennzahlen hinter dem Score nachvollziehen:
          Rendite, Risiko, Break-even, Entwicklung über die Zeit und die konkrete
          Monatsrechnung. Ideal, wenn du tiefer in die Analyse einsteigen möchtest oder
          Bankgespräche vorbereitest.
        </p>
      </div>

      {/* Block 1: Kern-KPIs */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <KPI
            icon={<Gauge className="h-4 w-4" />}
            label="NOI-Yield"
            value={pct(noiYield)}
            hint="NOI / Kaufpreis (bewertet) – grobe Renditekennzahl vor Finanzierung."
          />
          <KPI
            icon={<TrendingUp className="h-4 w-4" />}
            label="DSCR"
            value={annuitaetJahr > 0 ? dscr.toFixed(2) : "–"}
            hint="NOI / Annuität – zeigt, wie gut die Rate aus dem Objekt tragbar ist."
          />
          <KPI
            icon={<Banknote className="h-4 w-4" />}
            label="Annuität mtl."
            value={eur(Math.round(annuitaetMonat))}
            hint="Zins + Tilgung pro Monat."
          />
          <KPI
            icon={<Banknote className="h-4 w-4" />}
            label="All-in"
            value={eur(allIn)}
            hint="Kaufpreis inkl. sämtlicher Nebenkosten."
          />
        </div>
      </Card>

      {/* Block 2: Break-even Visualisierung */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium text-foreground">
            Break-even (NOI vs. Annuität)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Hier siehst du, wie dein operatives Ergebnis (NOI) im ersten Jahr im
            Verhältnis zur jährlichen Rate steht. Liegt der NOI deutlich über der
            Annuität, ist die Finanzierung komfortabler tragbar. Liegt er darunter,
            wird der Cashflow schnell negativ.
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
              <defs>
                <linearGradient id="gradNOI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CTA} />
                  <stop offset="100%" stopColor={ORANGE} />
                </linearGradient>
                <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} />
                  <stop offset="100%" stopColor="#2a446e" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RTooltip formatter={(v: any) => eur(v as number)} />
              <Legend />
              <Bar
                dataKey="NOI"
                fill="url(#gradNOI)"
                radius={[10, 10, 0, 0]}
                name="NOI p.a."
              >
                <LabelList
                  dataKey="NOI"
                  position="top"
                  formatter={(v: any) => eur(v as number)}
                />
              </Bar>
              <Bar
                dataKey="Annuitaet"
                fill="url(#gradA)"
                radius={[10, 10, 0, 0]}
                name="Annuität p.a."
              >
                <LabelList
                  dataKey="Annuitaet"
                  position="top"
                  formatter={(v: any) => eur(v as number)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Break-even Preis:{" "}
          <b>{bePrice ? eur(bePrice) : "–"}</b> · Erforderliche ⌀-Miete:{" "}
          <b>{beRentPerM2 ? `${beRentPerM2.toFixed(2)} €/m²` : "–"}</b>
        </div>
      </Card>

      {/* Block 3: Projektion */}
      <Card>
        <div className="flex flex-col gap-1 mb-1">
          <div className="text-sm font-medium mb-0.5 text-foreground">
            Projektion (10 Jahre)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Diese vereinfachte Projektion zeigt, wie sich NOI und Cashflow über die
            nächsten zehn Jahre entwickeln können – basierend auf deinen Annahmen zu
            Miet- und Kostensteigerung. So erhältst du ein Gefühl dafür, wie robust das
            Objekt in der Haltephase ist.
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
              <RTooltip formatter={(v: any) => eur(v as number)} />
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
        <p className="text-xs text-muted-foreground mt-2">
          Annahmen: Miete und Kosten entwickeln sich gemäß den von dir gesetzten
          Steigerungsraten, Leerstand bleibt konstant, Annuität und Zinssatz ändern sich
          nicht. Die Grafik ersetzt keine individuelle Finanzplanung, liefert aber einen
          schnellen Eindruck der Dynamik.
        </p>
      </Card>

      {/* Block 4: Monatsrechnung (Jahr 1) */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium mb-0.5 text-foreground">
            Monatsrechnung (Jahr 1)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Die Monatsrechnung zeigt dir, wie sich die laufenden Zahlungsströme im
            ersten Jahr zusammensetzen – von der effektiven Nettokaltmiete über
            Instandhaltung und nicht umlagefähige Kosten bis hin zu Zins und Tilgung.
            Das ist dein „Realitätscheck“ für die Liquidität.
          </p>
        </div>
        <ul className="text-sm text-foreground space-y-1">
          <li>
            Eff. Nettokaltmiete mtl.:{" "}
            <b>{eur(Math.round(monthlyEffRent))}</b>
          </li>
          <li>
            Nicht umlagefähige Kosten mtl.:{" "}
            <b>{eur(Math.round(monthlyOpex))}</b>
          </li>
          <li>
            Instandhaltungsrücklage mtl.:{" "}
            <b>{eur(Math.round(monthlyCapex))}</b>
          </li>
          <li>
            Zinsen mtl.: <b>{eur(Math.round(zinsMonat))}</b>
          </li>
          <li>
            Tilgung mtl.: <b>{eur(Math.round(tilgungMonat))}</b>
          </li>
          <li>
            = Cashflow mtl.: <b>{eur(Math.round(monthlyCF))}</b>
          </li>
        </ul>
      </Card>

      {/* Block 5: Nebenkosten + Tilgungssumme (10 Jahre) */}
      <Card>
        <div className="flex flex-col gap-1 mb-2">
          <div className="text-sm font-medium mb-0.5 text-foreground">
            Kaufnebenkosten & Tilgung (10 Jahre)
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Hier siehst du, wie sich dein Einstiegskapital zusammensetzt und welche
            Summen in den ersten zehn Jahren über Zins und Tilgung fließen. So kannst du
            besser einschätzen, wie viel Kapital im Objekt gebunden ist und wie hoch der
            Schuldabbau ausfällt.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">Kaufnebenkosten im Detail</div>
            <ul className="space-y-1 text-sm">
              <li>
                Grunderwerbsteuer ({nkBreakdown.bundesland}):{" "}
                {pct(nkBreakdown.nkGrEStPct)} ={" "}
                {eur(
                  Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkGrEStPct)
                )}
              </li>
              <li>
                Notar: {pct(nkBreakdown.nkNotarPct)} ={" "}
                {eur(
                  Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkNotarPct)
                )}
              </li>
              <li>
                Grundbuch: {pct(nkBreakdown.nkGrundbuchPct)} ={" "}
                {eur(
                  Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkGrundbuchPct)
                )}
              </li>
              <li>
                Makler: {pct(nkBreakdown.nkMaklerPct)} ={" "}
                {eur(
                  Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkMaklerPct)
                )}
              </li>
              {nkBreakdown.nkSonstPct > 0 && (
                <li>
                  Sonstiges/Puffer: {pct(nkBreakdown.nkSonstPct)} ={" "}
                  {eur(
                    Math.round(
                      nkBreakdown.kaufpreisView * nkBreakdown.nkSonstPct
                    )
                  )}
                </li>
              )}
              {nkBreakdown.nkRenovierung > 0 && (
                <li>
                  Renovierung (einmalig): {eur(nkBreakdown.nkRenovierung)}
                </li>
              )}
              {nkBreakdown.nkSanierung > 0 && (
                <li>
                  Sanierung (einmalig): {eur(nkBreakdown.nkSanierung)}
                </li>
              )}
              <li className="mt-2">
                <b>Summe NK</b>: {eur(nkBreakdown.nkSum)}
              </li>
              <li>
                All-in = Kaufpreis + NK ={" "}
                <b>
                  {eur(nkBreakdown.nkSum + nkBreakdown.kaufpreisView)}
                </b>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-medium mb-1">
              Zins & Tilgung in 10 Jahren (vereinfachte Übersicht)
            </div>
            <ul className="space-y-1 text-sm">
              <li>
                Zinsen (10 Jahre):{" "}
                <b>{eur(Math.round(amort.sum10.interest))}</b>
              </li>
              <li>
                Tilgung (10 Jahre):{" "}
                <b>{eur(Math.round(amort.sum10.principal))}</b>
              </li>
              <li>
                Summe Raten (10 Jahre):{" "}
                <b>{eur(Math.round(amort.sum10.annuity))}</b>
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

function KPI({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold mt-1 tabular-nums text-foreground">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );
}

function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="text-sm font-medium text-foreground">{term}</div>
      <div className="text-xs text-muted-foreground">{def}</div>
    </div>
  );
}

/* ---------------- Logik/Calcs ---------------- */

function buildProjection10y(opts: {
  years: number;
  effRentY1: number;
  nichtUmlagefaehige0: number;
  capexPct0: number;
  rentGrowth: number;
  costGrowth: number;
  annuitaetJahr: number;
}) {
  const {
    years,
    effRentY1,
    nichtUmlagefaehige0,
    capexPct0,
    rentGrowth,
    costGrowth,
    annuitaetJahr,
  } = opts;
  const data: { year: number; noi: number; cf: number }[] = [];
  for (let t = 1; t <= years; t++) {
    const effRentT = effRentY1 * Math.pow(1 + rentGrowth, t - 1);
    const opexT = nichtUmlagefaehige0 * Math.pow(1 + costGrowth, t - 1);
    const capexT = effRentY1 * capexPct0 * Math.pow(1 + costGrowth, t - 1);
    const noi = Math.max(0, effRentT - opexT - capexT);
    const cf = noi - annuitaetJahr;
    data.push({ year: t, noi: Math.round(noi), cf: Math.round(cf) });
  }
  return data;
}

function buildAmortization({
  darlehen,
  zins,
  annuitaetJahr,
  maxYears,
}: {
  darlehen: number;
  zins: number;
  annuitaetJahr: number;
  maxYears: number;
}) {
  const rows: {
    year: number;
    interest: number;
    principal: number;
    annuity: number;
    outstanding: number;
  }[] = [];
  if (darlehen <= 0 || zins <= 0 || annuitaetJahr <= 0)
    return {
      rows,
      sum10: { interest: 0, principal: 0, annuity: 0 },
    };

  let outstanding = darlehen;
  for (let y = 1; y <= maxYears; y++) {
    const interest = outstanding * zins;
    const principal = Math.min(
      Math.max(0, annuitaetJahr - interest),
      outstanding
    );
    outstanding = Math.max(0, outstanding - principal);
    rows.push({
      year: y,
      interest,
      principal,
      annuity: annuitaetJahr,
      outstanding,
    });
    if (outstanding <= 1) break;
  }

  const sum10 = rows.slice(0, 10).reduce(
    (a, r) => ({
      interest: a.interest + r.interest,
      principal: a.principal + r.principal,
      annuity: a.annuity + r.annuity,
    }),
    { interest: 0, principal: 0, annuity: 0 }
  );
  return { rows, sum10 };
}

function breakEvenPriceForCashflowZero({
  basePrice,
  area,
  grossRentY,
  rentAdjPct,
  leerstandPct,
  nichtUmlagefaehigeKosten,
  capexPctBrutto,
  ek,
  zins,
  tilgung,
  manualLoan,
}: {
  basePrice: number;
  area: number;
  grossRentY: number;
  rentAdjPct: number;
  leerstandPct: number;
  nichtUmlagefaehigeKosten: number;
  capexPctBrutto: number;
  ek: number;
  zins: number;
  tilgung: number;
  manualLoan: boolean;
}) {
  if (manualLoan || area <= 0) return null;
  const target = 0;
  let lo = Math.max(1, basePrice * 0.5),
    hi = basePrice * 1.5;

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const grossAdj = grossRentY * (1 + rentAdjPct);
    const eff = grossAdj * (1 - clamp01(leerstandPct));
    const capex = grossAdj * capexPctBrutto;
    const noi = Math.max(0, eff - nichtUmlagefaehigeKosten - capex);
    const loan = Math.max(0, mid - Math.max(0, ek));
    const ann = loan * (zins + tilgung);
    const cf = noi - ann;
    if (cf > target) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

function breakEvenRentPerM2ForCashflowZero({
  price,
  area,
  rentPerM2Now,
  leerstandPct,
  nichtUmlagefaehigeKosten,
  capexPctBrutto,
  ek,
  zins,
  tilgung,
  manualLoan,
  loan,
}: {
  price: number;
  area: number;
  rentPerM2Now: number;
  leerstandPct: number;
  nichtUmlagefaehigeKosten: number;
  capexPctBrutto: number;
  ek: number;
  zins: number;
  tilgung: number;
  manualLoan: boolean;
  loan: number;
}) {
  if (area <= 0) return null;
  const target = 0;
  let lo = 0,
    hi = Math.max(20, rentPerM2Now * 2.5);

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const gross = area * mid * 12;
    const eff = gross * (1 - clamp01(leerstandPct));
    const capex = gross * capexPctBrutto;
    const noi = Math.max(0, eff - nichtUmlagefaehigeKosten - capex);
    const L = manualLoan ? loan : Math.max(0, price - Math.max(0, ek));
    const ann = L * (zins + tilgung);
    const cf = noi - ann;
    if (cf > target) hi = mid;
    else lo = mid;
  }
  return Number(((lo + hi) / 2).toFixed(2));
}

/* ---------------- Utils ---------------- */

function eur(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      })
    : "–";
}

function pct(x: number) {
  return Number.isFinite(x) ? (x * 100).toFixed(1) + " %" : "–";
}

function signedPct(x: number) {
  const v = (x * 100).toFixed(1);
  return (x > 0 ? "+" : "") + v + " %";
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scale(x: number, a: number, b: number) {
  if (b === a) return 0;
  return clamp01((x - a) / (b - a));
}

function num(x: any, fb: number) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function ts() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(
    d.getDate()
  )}_${p(d.getHours())}-${p(d.getMinutes())}`;
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
