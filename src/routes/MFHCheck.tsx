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
// recharts not used
import PlanGuard from "@/components/PlanGuard";

/* ---------------- Types ---------------- */
type ViewMode = "einfach" | "erweitert";
type Unit = { id: string; name: string; areaM2: number; rentPerM2: number };
type Tip = { label: string; detail: string };
type DecisionLabel = "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";

/* ---------------- Theme ---------------- */
const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#a78bfa";
const SURFACE = "#0d1117";
const SURFACE_CARD = "rgba(255,255,255,0.04)";
const SURFACE_INPUT = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT_PRIMARY = "#e6edf3";
const TEXT_MUTED = "rgba(255,255,255,0.4)";

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
    <div className="text-sm font-medium flex items-center gap-1" style={{ color: "rgba(255,255,255,0.6)" }}>
      <span>{label}</span>
      {help && (
        <span title={help}>
          <Info className="h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
        </span>
      )}
    </div>
  );
}

function InputBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide" style={{ background: "rgba(252,220,69,0.12)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.25)" }}>EINGABE</span>
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
      className={`rounded-2xl ${className}`}
      style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}
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
    <div className="rounded-2xl p-5" style={{ background: "rgba(252,220,69,0.03)", border: "1px solid rgba(252,220,69,0.12)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>{title}</div>
          {subtitle && <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>{subtitle}</div>}
          {description && (
            <p className="text-xs mt-1 max-w-xl leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
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
  const [focused, setFocused] = React.useState(false);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const displayValue = focused
    ? String(rawValue)
    : rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type={focused ? "number" : "text"}
          step={step}
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
          className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
          type="number"
          step={step}
          value={((value ?? 0) * 100).toFixed(2)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>%</span>
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
        className="px-3 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-all"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" /> Export
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl p-3 z-50" style={{ background: "rgba(22,27,34,0.99)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
          <div className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.38)" }}>Formate wählen</div>
          <label className="flex items-center gap-2 py-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <input
              type="checkbox"
              checked={json}
              onChange={(e) => setJson(e.target.checked)}
            />{" "}
            JSON
          </label>
          <label className="flex items-center gap-2 py-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <input
              type="checkbox"
              checked={csv}
              onChange={(e) => setCsv(e.target.checked)}
            />{" "}
            CSV
          </label>
          <label className="flex items-center gap-2 py-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <input
              type="checkbox"
              checked={pdf}
              onChange={(e) => setPdf(e.target.checked)}
            />{" "}
            PDF
          </label>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)" }}
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-lg font-medium"
              style={{ background: "#FCDC45", color: "#0d1117" }}
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

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const short = text.length > 90;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
        {expanded || !short ? text : text.slice(0, 90) + "…"}
      </div>
      {short && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ marginTop: 4, fontSize: 10, color: "rgba(252,220,69,0.7)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 3 }}
        >
          {expanded ? "▲ Weniger" : "▼ Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

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
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 120px" }}>

        {/* ── Topbar ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="7" width="14" height="10" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/>
                <path d="M1 8L10 2L19 8" stroke="#FCDC45" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="6" y="11" width="2.5" height="2.5" fill="#FCDC45" rx="0.5"/>
                <rect x="11.5" y="11" width="2.5" height="2.5" fill="#FCDC45" rx="0.5"/>
                <rect x="8.75" y="14" width="2.5" height="3" fill="#FCDC45" rx="0.5"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0, lineHeight: 1.2 }}>Mietshaus-Analyse</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>Gib deine Daten ein und sieh sofort ob sich das Objekt lohnt</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Mode switcher */}
            <div style={{ display: "inline-flex", borderRadius: 10, padding: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setMode("einfach")}
                style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "einfach" ? "#FCDC45" : "transparent", color: mode === "einfach" ? "#0d1117" : "rgba(255,255,255,0.5)" }}
              >
                Einfach
              </button>
              <button
                onClick={() => setMode("erweitert")}
                style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "erweitert" ? "#FCDC45" : "transparent", color: mode === "erweitert" ? "#0d1117" : "rgba(255,255,255,0.5)" }}
              >
                Erweitert
              </button>
            </div>
            <button onClick={resetBeispiel} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} /> Beispiel
            </button>
            <ExportDropdown onRun={runExport} />
            <label style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }} className={pdfLoading ? "opacity-60 pointer-events-none" : ""}>
              {pdfLoading ? (<><svg className="animate-spin" style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75"/></svg> Wird gelesen…</>) : (<><Upload size={14} /> Import</>)}
              <input type="file" className="hidden" accept=".json,application/json,.pdf,application/pdf" onChange={handleImport} disabled={pdfLoading} />
            </label>
          </div>
        </div>

        {/* ── Zwei-Spalten-Layout ────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* ── LINKE SPALTE: Eingaben ────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Sektion-Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: -4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 1 — Kaufpreis & Kosten</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Kaufpreis & NK */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Kaufpreis & Nebenkosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was kostet dich der Kauf insgesamt?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)", letterSpacing: "0.06em" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Bundesland</div>
                  <select
                    value={bundesland}
                    onChange={(e) => applyLandPreset(e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "8px 12px", color: "rgba(255,255,255,0.88)", fontSize: 13, outline: "none" }}
                  >
                    {LAND_LIST.map((l) => <option key={l} value={l}>{l.replace("_", "-")}</option>)}
                  </select>
                </div>
                <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
              </div>
              {mode === "erweitert" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <PercentField label="Sonstiges/Puffer" value={nkSonstPct} onChange={setNkSonstPct} />
                  <NumberField label="Renovierung einmalig (€)" value={nkRenovierung} onChange={setNkRenovierung} step={500} />
                  <NumberField label="Sanierung einmalig (€)" value={nkSanierung} onChange={setNkSanierung} step={1000} />
                </div>
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Nebenkosten gesamt: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{pct(nkPct)}</strong> = <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(nkSum)}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(allIn)}</strong>
              </div>
            </div>

            {/* Sektion-Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 2 — Einnahmen & Fläche</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Fläche & Einnahmen */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Fläche & Einnahmen</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Wie viel Miete bringt das Objekt?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)", letterSpacing: "0.06em" }}>EINGABE</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
                  <input type="radio" checked={mgmtMode === "gesamt"} onChange={() => setMgmtMode("gesamt")} style={{ accentColor: "#FCDC45" }} /> Gesamtdaten
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
                  <input type="radio" checked={mgmtMode === "einheiten"} onChange={() => setMgmtMode("einheiten")} style={{ accentColor: "#FCDC45" }} /> Einheiten einzeln erfassen
                </label>
              </div>
              {mgmtMode === "gesamt" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <NumberField label="Gesamtfläche (m²)" value={gesamtFlaecheM2} onChange={setGesamtFlaecheM2} />
                  <NumberField label="Kaltmiete pro Jahr (€)" value={kaltmieteJahr} onChange={setKaltmieteJahr} step={500} />
                  <PercentField label="Leerstand & Mietausfall" value={leerstandPct} onChange={setLeerstandPct} help="Anteil der Zeit/Fläche ohne Miete" />
                  <NumberField label="Nicht-umlagef. Kosten/Jahr (€)" value={nichtUmlagefaehigeKosten} onChange={setNichtUmlagefaehigeKosten} step={100} />
                  {mode === "erweitert" && (
                    <PercentField label="Instandhaltungsrücklage (% Miete)" value={capexRuecklagePctBrutto} onChange={setCapexRuecklagePctBrutto} step={0.005} />
                  )}
                </div>
              ) : (
                <UnitsEditor units={units} updateUnit={updateUnit} removeUnit={removeUnit} addUnit={addUnit} totals={totals} />
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                ⌀ Miete: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{totals.avgRentPerM2.toFixed(2)} €/m²</strong> · Effektivmiete: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(effRentYear))}/Jahr</strong>
              </div>
            </div>

            {/* Sektion-Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 3 — Finanzierung</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Finanzierung */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Finanzierung</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Optional — wie finanzierst du den Kauf?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)", letterSpacing: "0.06em" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Eigenkapital (€)" value={eigenkapital} onChange={setEigenkapital} step={5000} />
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
                    <input type="checkbox" checked={manualLoan} onChange={(e) => setManualLoan(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                    Darlehen manuell setzen
                  </label>
                  {manualLoan && (
                    <NumberField label="Darlehensbetrag (€)" value={darlehenManual} onChange={setDarlehenManual} step={5000} />
                  )}
                </div>
                <PercentField label="Zinssatz p.a." value={zins} onChange={setZins} step={0.05} />
                <PercentField label="Tilgung p.a." value={tilgung} onChange={setTilgung} step={0.05} />
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(loan))}</strong> · Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(annuitaetJahr))}/Jahr</strong> ({eur(Math.round(annuitaetMonat))}/Monat)
              </div>
            </div>

            {/* Spielwiese */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Was-wäre-wenn Spielwiese</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <PlaygroundCard priceAdjPct={priceAdjPct} setPriceAdjPct={setPriceAdjPct} rentAdjPct={rentAdjPct} setRentAdjPct={setRentAdjPct} applyAdjustments={applyAdjustments} setApplyAdjustments={setApplyAdjustments} />

            {/* Details */}
            <DetailsSection
              noiYield={noiYield} dscr={dscr} annuitaetMonat={annuitaetMonat} allIn={allIn}
              noi={noi} annuitaetJahr={annuitaetJahr} bePrice={bePrice} beRentPerM2={beRentPerM2}
              projection={projection} monthlyEffRent={monthlyEffRent} monthlyOpex={monthlyOpex}
              monthlyCapex={monthlyCapex} monthlyCF={monthlyCF} zinsMonat={zinsMonat}
              tilgungMonat={tilgungMonat} amort={amort}
              nkBreakdown={{ bundesland, nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct, nkRenovierung, nkSanierung, kaufpreisView, nkSum }}
            />
          </div>

          {/* ── RECHTE SPALTE: Ergebnis (sticky) ─────────── */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Score & Entscheidung */}
            <div style={{ borderRadius: 16, padding: 20, background: "linear-gradient(135deg, rgba(15,44,138,0.85) 0%, rgba(124,58,237,0.65) 100%)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Dein Ergebnis (live)</div>

              {/* Score-Ring + Entscheidung */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={decisionColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }}/>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Score</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Empfehlung</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: decisionLabel === "RENTABEL" ? "#4ade80" : decisionLabel === "GRENZWERTIG" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>
                    {decisionLabel === "RENTABEL" ? "Kaufen" : decisionLabel === "GRENZWERTIG" ? "Weiter prüfen" : "Eher Nein"}
                  </div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>

              {/* 3 KPI-Kacheln */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(monthlyCF)), good: monthlyCF >= 100, okay: monthlyCF >= 0 },
                  { label: "Rendite (NOI)", value: pct(noiYield), good: noiYield >= 0.05, okay: noiYield >= 0.035 },
                  { label: "Schuldendeckung", value: annuitaetJahr > 0 ? dscr.toFixed(2) : "–", good: dscr >= 1.2, okay: dscr >= 1.0 },
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

              {/* Progress bar */}
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: decisionColor, borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
            </div>

            {/* Hebel / Tipps */}
            {tips.length > 0 && (
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Schnelle Hebel</div>
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
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Was bedeutet das?</div>
              {[
                { term: "Rendite (NOI)", def: "Dein Jahresgewinn aus Miete geteilt durch den Kaufpreis. Ziel: über 5%." },
                { term: "Cashflow", def: "Was nach Kosten & Kreditrate monatlich übrig bleibt. Positiv = gut." },
                { term: "Schuldendeckung (DSCR)", def: "Wie gut die Mieteinnahmen die Kreditrate decken. Über 1,2 ist solide." },
                { term: "All-in-Preis", def: "Kaufpreis + Nebenkosten. Was du wirklich bezahlst." },
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

      {/* ── Sticky Footer ──────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 12px" }}>
          <div style={{ background: "rgba(13,17,23,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, backdropFilter: "blur(20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Ergebnis <span style={{ color: "rgba(255,255,255,0.2)" }}>(live)</span></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>
                  {decisionLabel === "RENTABEL" ? "Kaufen" : decisionLabel === "GRENZWERTIG" ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                  {[
                    { icon: "€", label: `${eur(Math.round(monthlyCF))} mtl.` },
                    { icon: "%", label: `Rendite ${pct(noiYield)}` },
                    { icon: "×", label: `DSCR ${annuitaetJahr > 0 ? dscr.toFixed(2) : "–"}` },
                  ].map((b) => (
                    <span key={b.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 20, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{b.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", width: 50, height: 50, flexShrink: 0 }}>
                <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
                  <circle cx="25" cy="25" r="20" fill="none" stroke={decisionColor} strokeWidth="5"
                    strokeDasharray={`${Math.round(125.6 * scorePct / 100)} 125.6`} strokeLinecap="round"/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                </div>
              </div>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(4, scorePct)}%`, background: decisionColor, transition: "width 0.5s ease" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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
        "Mietshaus-Analyse – Kurzreport",
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
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
    padding: "8px 10px", color: "rgba(255,255,255,0.88)", fontSize: 13,
    outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {units.map((u, idx) => (
        <div key={u.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 40px", gap: 10, alignItems: "end" }}>
            <div>
              <span style={labelStyle}>Einheit</span>
              <input
                style={inputStyle}
                value={u.name}
                onChange={(e) => updateUnit({ id: u.id, patch: { name: e.target.value } })}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
            <div>
              <span style={labelStyle}>Fläche (m²)</span>
              <input
                type="number" style={inputStyle}
                value={u.areaM2}
                onChange={(e) => updateUnit({ id: u.id, patch: { areaM2: num(e.target.value, u.areaM2) } })}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
            <div>
              <span style={labelStyle}>€/m²/Monat</span>
              <input
                type="number" step={0.1} style={inputStyle}
                value={u.rentPerM2}
                onChange={(e) => updateUnit({ id: u.id, patch: { rentPerM2: num(e.target.value, u.rentPerM2) } })}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <button
                onClick={() => removeUnit(u.id)}
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Trash2 size={14} color="#f87171" />
              </button>
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Kaltmiete p.a.: <strong style={{ color: "rgba(255,255,255,0.65)" }}>{eur(Math.round(u.areaM2 * u.rentPerM2 * 12))}</strong>
          </div>
        </div>
      ))}

      <button
        onClick={addUnit}
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.2)", color: "#FCDC45", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
      >
        <Plus size={14} /> Einheit hinzufügen
      </button>

      <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
        Summe Fläche: <strong style={{ color: "rgba(255,255,255,0.7)" }}>{totals.area.toLocaleString("de-DE")} m²</strong> · Miete p.a.: <strong style={{ color: "rgba(255,255,255,0.7)" }}>{eur(Math.round(totals.grossRentYear))}</strong> · ⌀: <strong style={{ color: "#FCDC45" }}>{totals.avgRentPerM2.toFixed(2)} €/m²</strong>
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
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold /15"
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
    <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
      <style>{`
        .propora-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.08);
          outline: none;
          cursor: pointer;
        }
        .propora-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #FCDC45;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(252,220,69,0.2);
          transition: box-shadow 0.15s;
        }
        .propora-range::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 5px rgba(252,220,69,0.25);
        }
        .propora-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #FCDC45;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 3px rgba(252,220,69,0.2);
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Was-wäre-wenn Spielwiese</div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Änderungen wirken live auf Score</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Kaufpreis anpassen</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: priceAdjPct < 0 ? "#4ade80" : priceAdjPct > 0 ? "#f87171" : "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>{signedPct(priceAdjPct)}</span>
          </div>
          <input
            type="range" min={-0.3} max={0.3} step={0.005}
            value={priceAdjPct}
            onChange={(e) => setPriceAdjPct(Number(e.target.value))}
            className="propora-range"
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
            <span>−30%</span><span>0</span><span>+30%</span>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>{signedPct(rentAdjPct)}</span>
          </div>
          <input
            type="range" min={-0.3} max={0.5} step={0.005}
            value={rentAdjPct}
            onChange={(e) => setRentAdjPct(Number(e.target.value))}
            className="propora-range"
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
            <span>−30%</span><span>0</span><span>+50%</span>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
          <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
          Anpassungen in Bewertung berücksichtigen
        </label>
      </div>
    </div>
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
    noiYield, dscr, annuitaetMonat, allIn, noi, annuitaetJahr,
    bePrice, beRentPerM2, projection,
    monthlyEffRent, monthlyOpex, monthlyCapex, monthlyCF,
    zinsMonat, tilgungMonat, amort, nkBreakdown,
  } = props;

  const C = {
    card: { background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 } as React.CSSProperties,
    sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" } as React.CSSProperties,
    divider: { flex: 1, height: 1, background: "rgba(255,255,255,0.06)" } as React.CSSProperties,
  };

  const lastProj = projection[projection.length - 1];
  const cfTrend = lastProj ? lastProj.cf - (projection[0]?.cf ?? 0) : 0;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <span style={C.sectionLabel}>Detailberechnungen</span>
        <div style={C.divider} />
      </div>

      {/* Monatsrechnung */}
      <div style={C.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatliche Cashflow-Aufschlüsselung</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Effektive Nettokaltmiete", value: Math.round(monthlyEffRent), positive: true },
            { label: "Betriebskosten (nicht umlagef.)", value: -Math.round(monthlyOpex), positive: false },
            { label: "Instandhaltungsrücklage", value: -Math.round(monthlyCapex), positive: false },
            { label: "Zinsen", value: -Math.round(zinsMonat), positive: false },
            { label: "Tilgung", value: -Math.round(tilgungMonat), positive: false },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: row.positive ? "#4ade80" : "#f87171", fontVariantNumeric: "tabular-nums" }}>{row.positive ? "+" : ""}{eur(row.value)}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: monthlyCF >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, border: `1px solid ${monthlyCF >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, marginTop: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>= Cashflow pro Monat</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: monthlyCF >= 0 ? "#4ade80" : "#f87171", fontVariantNumeric: "tabular-nums" }}>{eur(Math.round(monthlyCF))}</span>
          </div>
        </div>
      </div>

      {/* Break-even & Projektion Kacheln */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Break-even & Projektion</span>
        <div style={C.divider} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Betriebsergebnis vs. Kreditrate</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Betriebsergebnis (NOI)", value: Math.round(noi), color: "#FCDC45" },
              { label: "Kreditrate p.a.", value: Math.round(annuitaetJahr), color: "#7c3aed" },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{eur(row.value)}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round(row.value / Math.max(noi, annuitaetJahr) * 100))}%`, background: row.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
            <div style={{ padding: "8px 12px", background: noi >= annuitaetJahr ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)", borderRadius: 8, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Überschuss p.a.</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: noi >= annuitaetJahr ? "#4ade80" : "#f87171", fontVariantNumeric: "tabular-nums" }}>{eur(Math.round(noi - annuitaetJahr))}</span>
            </div>
          </div>
        </div>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Break-even Szenarien</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "12px 14px", background: "rgba(252,220,69,0.05)", borderRadius: 10, border: "1px solid rgba(252,220,69,0.12)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Break-even Kaufpreis</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#FCDC45", fontVariantNumeric: "tabular-nums" }}>{bePrice ? eur(bePrice) : "–"}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Unter diesem Preis wäre CF positiv</div>
            </div>
            <div style={{ padding: "12px 14px", background: "rgba(124,58,237,0.05)", borderRadius: 10, border: "1px solid rgba(124,58,237,0.15)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Mindest-Miete für CF = 0</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>{beRentPerM2 ? `${beRentPerM2.toFixed(2)} €/m²` : "–"}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Über dieser Miete läuft das Objekt</div>
            </div>
          </div>
        </div>
      </div>

      {/* 10J Projektion Kacheln */}
      <div style={C.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>10-Jahres-Projektion</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Betriebsergebnis Jahr 10", value: lastProj ? eur(Math.round(lastProj.noi)) : "–", color: "#FCDC45", sub: "p.a." },
            { label: "Cashflow Jahr 10", value: lastProj ? eur(Math.round(lastProj.cf)) : "–", color: lastProj && lastProj.cf >= 0 ? "#4ade80" : "#f87171", sub: "p.a." },
            { label: "CF-Entwicklung", value: `${cfTrend >= 0 ? "+" : ""}${eur(Math.round(cfTrend))}`, color: cfTrend >= 0 ? "#4ade80" : "#f87171", sub: "über 10 Jahre" },
          ].map((k) => (
            <div key={k.label} style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.28)", lineHeight: 1.6 }}>
          Hochrechnung mit deinen Miet- und Kostensteigerungsannahmen. Leerstand und Annuität bleiben konstant.
        </div>
      </div>

      {/* Nebenkosten + Tilgung */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Kapitaleinsatz & Schuldenabbau</span>
        <div style={C.divider} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Kaufnebenkosten</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { label: `Grunderwerbsteuer (${nkBreakdown.bundesland})`, value: Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkGrEStPct) },
              { label: "Notar", value: Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkNotarPct) },
              { label: "Grundbuch", value: Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkGrundbuchPct) },
              { label: "Makler", value: Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkMaklerPct) },
              ...(nkBreakdown.nkSonstPct > 0 ? [{ label: "Sonstiges", value: Math.round(nkBreakdown.kaufpreisView * nkBreakdown.nkSonstPct) }] : []),
              ...(nkBreakdown.nkRenovierung > 0 ? [{ label: "Renovierung", value: nkBreakdown.nkRenovierung }] : []),
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>{eur(row.value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 6, background: "rgba(252,220,69,0.05)", borderRadius: 9, border: "1px solid rgba(252,220,69,0.12)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Summe NK</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FCDC45", fontVariantNumeric: "tabular-nums" }}>{eur(nkBreakdown.nkSum)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>All-in Gesamt</span>
              <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(nkBreakdown.nkSum + nkBreakdown.kaufpreisView)}</span>
            </div>
          </div>
        </div>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Zins & Tilgung (10 Jahre)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Gezahlte Zinsen", value: Math.round(amort.sum10.interest), color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)" },
              { label: "Getilgtes Kapital", value: Math.round(amort.sum10.principal), color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.15)" },
              { label: "Summe Raten gesamt", value: Math.round(amort.sum10.annuity), color: "rgba(255,255,255,0.65)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
            ].map((row) => (
              <div key={row.label} style={{ padding: "12px 14px", background: row.bg, borderRadius: 10, border: `1px solid ${row.border}` }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{eur(row.value)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.28)", lineHeight: 1.5 }}>Konstante Annuität, gleichbleibender Zinssatz.</div>
        </div>
      </div>

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
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
        {icon} {label}
      </div>
      <div className="text-xl font-bold mt-1 tabular-nums" style={{ color: "#e6edf3" }}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{term}</div>
      <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{def}</div>
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
