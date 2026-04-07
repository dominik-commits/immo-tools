// src/routes/GewerbeCheck.tsx
// Gewerbe-Check (v4) – PRO
// Einheitliches UI: Intro, Zwischenstand, Spielwiese, Details, Sticky-Footer.

import React, { useMemo, useState, useEffect } from "react";
import {
  Briefcase,
  RefreshCw,
  Upload,
  Download,
  Plus,
  Trash2,
  Gauge,
  Banknote,
  TrendingUp,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PlanGuard from "@/components/PlanGuard";
import ImportFromImmoScout from "@/components/ImportFromImmoScout";

/* ----------------------------------------------------------------
 *  TYPES
 * ---------------------------------------------------------------- */

type Bonitaet = "A" | "B" | "C";

type Zone = {
  id: string;
  name: string;
  areaM2: number;
  rentPerM2: number;
  vacancyPct: number;
  recoverablePct: number;
  freeRentMonthsY1: number;
  tiPerM2: number;
  leaseTermYears: number;
};

type Tip = { label: string; detail: string };

type AmortRow = {
  year: number;
  interest: number;
  principal: number;
  annuity: number;
  outstanding: number;
};

type AmortPlan = {
  rows: AmortRow[];
  sum10: { interest: number; principal: number; annuity: number };
};

type ProjectionPoint = { year: number; cashflowPA: number; tilgungPA: number };

type ToastState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

/* ----------------------------------------------------------------
 *  BRAND COLORS
 * ---------------------------------------------------------------- */
const BRAND = "#1b2c47";
const CTA = "#ffde59";
const ORANGE = "#ff914d";
const SURFACE = "#F7F7FA";
const SURFACE_ALT = "#EAEAEE";

/* ----------------------------------------------------------------
 *  SMALL UTILS
 * ---------------------------------------------------------------- */

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

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <Info className="h-4 w-4 text-gray-400" />
    </span>
  );
}

function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-2xl border p-4 bg-card ${className}`} style={style}>
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
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card"
      title={hint}
    >
      {icon} {text}
    </span>
  );
}

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm text-foreground flex items-center gap-1">
      <span>{label}</span>
      {help && <Help title={help} />}
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
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
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
      <input
        className="mt-1 w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
      />
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  step = 0.005,
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
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={0.95}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <span className="w-28 text-right tabular-nums text-foreground">
          {pct(value)}
        </span>
      </div>
    </div>
  );
}

function PercentFieldCompact({
  label,
  value,
  onChange,
  step = 0.005,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={0.95}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <input
          type="number"
          step={0.1}
          className="w-16 border rounded-2xl p-1 text-right bg-card text-foreground"
          value={(value * 100).toFixed(1)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}

function ScoreDonut({
  scorePct,
  scoreColor,
  label,
  size = 42,
}: {
  scorePct: number;
  scoreColor: string;
  label: "BUY" | "CHECK" | "NO";
  size?: number;
}) {
  const rest = Math.max(0, 100 - scorePct);
  const inner = Math.round(size * 0.65);
  const outer = Math.round(size * 0.9);
  return (
    <div className="relative" style={{ width: size * 2, height: size * 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScoreG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scoreColor} />
              <stop offset="100%" stopColor={CTA} />
            </linearGradient>
          </defs>
          <Pie
            data={[
              { name: "Score", value: scorePct },
              { name: "Rest", value: rest },
            ]}
            startAngle={90}
            endAngle={-270}
            innerRadius={inner}
            outerRadius={outer}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="url(#gradScoreG)" />
            <Cell fill={SURFACE_ALT} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            className="text-xl font-bold leading-5"
            style={{ color: scoreColor }}
          >
            {scorePct}%
          </div>
          <div className="text-[10px] text-muted-foreground">"{label}"</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Export-Dropdown ---------- */
function ExportDropdown({
  onRun,
}: {
  onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(true);
  const [csv, setCsv] = useState(false);
  const [pdf, setPdf] = useState(false);

  function run() {
    onRun({ json: json || (!csv && !pdf), csv, pdf });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
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
          <div className="text-xs font-medium text-gray-500 mb-2">
            Formate wählen
          </div>
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

/* ---------------- Hauptkomponente (PRO) ---------------- */

export default function GewerbeCheck() {
  return (
    <PlanGuard required="pro">
      <PageInner />
    </PlanGuard>
  );
}

/* ---------------- PageInner ---------------- */

function PageInner() {
  // --- Deal-Basis ---
  const [kaufpreis, setKaufpreis] = useState(1_200_000);
  const [zonen, setZonen] = useState<Zone[]>([
    {
      id: uid(),
      name: "Büro EG",
      areaM2: 250,
      rentPerM2: 16,
      vacancyPct: 0.05,
      recoverablePct: 0.85,
      freeRentMonthsY1: 0,
      tiPerM2: 50,
      leaseTermYears: 5,
    },
    {
      id: uid(),
      name: "Büro OG",
      areaM2: 350,
      rentPerM2: 13,
      vacancyPct: 0.1,
      recoverablePct: 0.75,
      freeRentMonthsY1: 1,
      tiPerM2: 35,
      leaseTermYears: 4,
    },
  ]);

  // Betriebskosten & Rücklage (auf Brutto)
  const [opexTotalPctBrutto, setOpexTotalPctBrutto] = useState(0.26);
  const [capexRuecklagePctBrutto, setCapexRuecklagePctBrutto] =
    useState(0.04);

  // Cap & Risiko
  const [capRateAssumed, setCapRateAssumed] = useState(0.065);
  const [bonitaetTop3, setBonitaetTop3] = useState<Bonitaet>("B");
  const [indexiert, setIndexiert] = useState(true);

  // NK
  const [nkGrEStPct, setNkGrEStPct] = useState(0.065);
  const [nkNotarPct, setNkNotarPct] = useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = useState(0.0357);
  const [nkSonstPct, setNkSonstPct] = useState(0);

  // Finanzierung (exakte Annuität)
  const [financingOn, setFinancingOn] = useState(true);
  const [ltvPct, setLtvPct] = useState(0.6);
  const [zinsPct, setZinsPct] = useState(0.045);
  const [laufzeitYears, setLaufzeitYears] = useState(30);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // Toast
  const [toast, setToast] = useState<ToastState>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 👉 ImmoScout-Import anwenden
  function applyImportPayload(payload: any) {
    const d = payload?.data;
    if (!d) return;

    // Kaufpreis
    if (typeof d.kaufpreis === "number") {
      setKaufpreis(d.kaufpreis);
    }

    // Nebenkosten
    if (d.nebenkosten) {
      if (typeof d.nebenkosten.grunderwerb === "number") {
        setNkGrEStPct(d.nebenkosten.grunderwerb);
      }
      if (typeof d.nebenkosten.notar === "number") {
        setNkNotarPct(d.nebenkosten.notar);
      }
      if (typeof d.nebenkosten.grundbuch === "number") {
        setNkGrundbuchPct(d.nebenkosten.grundbuch);
      }
      if (typeof d.nebenkosten.makler === "number") {
        setNkMaklerPct(d.nebenkosten.makler);
      }
      if (typeof d.nebenkosten.sonstiges === "number") {
        setNkSonstPct(d.nebenkosten.sonstiges);
      }
    }

    // Zonen
    if (Array.isArray(d.zonen) && d.zonen.length > 0) {
      setZonen(
        d.zonen.map((z: any, idx: number) => ({
          id: uid() + "_" + idx,
          name: String(z.name ?? `Zone ${idx + 1}`),
          areaM2: num(z.areaM2, 0),
          rentPerM2: num(z.rentPerM2, 0),
          vacancyPct: clamp01(num(z.vacancyPct, 0)),
          recoverablePct: clamp01(num(z.recoverablePct, 0.8)),
          freeRentMonthsY1: Math.max(
            0,
            Math.min(24, Math.round(num(z.freeRentMonthsY1, 0)))
          ),
          tiPerM2: Math.max(0, num(z.tiPerM2, 0)),
          leaseTermYears: Math.max(0.5, num(z.leaseTermYears, 3)),
        }))
      );
    }

    setToast({
      type: "success",
      message: "ImmoScout-Daten wurden in den Gewerbe-Check übernommen.",
    });
  }

  // Abgeleitet
  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const KP = applyAdjustments ? adjustedPrice : kaufpreis;

  // --- Zonen-Einnahmen Jahr 1 (Free-Rent berücksichtigt) ---
  const zonenCalcY1 = useMemo(
    () => computeZonesY1(zonen, rentAdjPct),
    [zonen, rentAdjPct]
  );
  const grossRentYearY1 = zonenCalcY1.totalGross;
  const effRentYearY1 = zonenCalcY1.totalEff;
  const tiUpfront = zonenCalcY1.totalTI;

  // Betriebskosten (Vermieter-Sicht)
  const totalOpexY1 = grossRentYearY1 * opexTotalPctBrutto;
  const recoveredY1 = zonenCalcY1.recoveredOpex(opexTotalPctBrutto);
  const landlordOpexY1 = Math.max(0, totalOpexY1 - recoveredY1);
  const capexY1 = grossRentYearY1 * capexRuecklagePctBrutto;

  // NOI (Y1)
  const noiY1 = effRentYearY1 - landlordOpexY1 - capexY1;

  // Cap-Spread & Wert
  const avgWALT = avgWeighted(
    zonen.map((z) => ({ w: z.areaM2, v: z.leaseTermYears }))
  );
  const capSpread = calcCapSpread(avgWALT, bonitaetTop3, indexiert);
  const capEff = clampMin(capRateAssumed + capSpread, 0.0001);
  const wertAusCap = capEff > 0 ? noiY1 / capEff : 0;

  // Finanzierung – exakte Annuität
  const loan = financingOn ? KP * ltvPct : 0;
  const annuityYear = financingOn ? annuityExact(loan, zinsPct, laufzeitYears) : 0;
  const interestY1 = financingOn ? loan * zinsPct : 0;
  const principalY1 = financingOn ? Math.max(0, annuityYear - interestY1) : 0;

  const cashflowMonatY1 = (noiY1 - annuityYear - tiUpfront) / 12;

  // KPIs
  const noiYield = KP > 0 ? noiY1 / KP : 0;
  const dscr = financingOn && annuityYear > 0 ? noiY1 / annuityYear : null;

  // NK
  const nkPct =
    nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;
  const nkBetrag = Math.round(KP * nkPct);

  // Score (Ampel)
  const score = clamp01(
    scale(noiYield, 0.045, 0.09) * 0.5 +
      scale(dscr ?? 0, 1.2, 1.7) * 0.35 +
      scale(cashflowMonatY1, 0, 1200) * 0.15
  );
  const scoreLabel: "BUY" | "CHECK" | "NO" =
    score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";
  const scorePct = Math.round(score * 100);
  const scoreColor =
    score >= 0.7 ? "#16a34a" : score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Projektion (10y)
  const projection: ProjectionPoint[] = useMemo(
    () =>
      buildProjection10y({
        years: 10,
        zones: zonen,
        rentAdjPct,
        opexPct: opexTotalPctBrutto,
        capexPct: capexRuecklagePctBrutto,
        rentGrowthPct: 0.015,
        costGrowthPct: 0.02,
        loan,
        zinsPct,
        yearsLoan: laufzeitYears,
        financingOn,
        annuityExactFn: annuityExact,
      }),
    [
      zonen,
      rentAdjPct,
      opexTotalPctBrutto,
      capexRuecklagePctBrutto,
      loan,
      zinsPct,
      laufzeitYears,
      financingOn,
    ]
  );

  // Tilgungsplan (exakt)
  const tilgungsplan: AmortPlan = useMemo(
    () =>
      buildAmortizationExact(
        loan,
        zinsPct,
        laufzeitYears,
        financingOn,
        annuityExact
      ),
    [loan, zinsPct, laufzeitYears, financingOn]
  );

  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";
  const valueGap = Math.round(wertAusCap - KP);
  const valueGapPct = KP > 0 ? (wertAusCap - KP) / KP : 0;

  // Tipps für Zwischenstand
  const tips: Tip[] = useMemo(() => {
    const t: Tip[] = [];

    if (wertAusCap > 0 && KP > 0 && valueGap < 0) {
      t.push({
        label: "Kaufpreis verhandeln",
        detail: `Der Modellwert (NOI / Cap_eff) liegt bei ca. ${eur(
          Math.round(wertAusCap)
        )}. Ziel: Kaufpreis in diese Richtung bewegen (aktuell ${eur(
          Math.round(KP)
        )}).`,
      });
    }

    if (cashflowMonatY1 < 0) {
      t.push({
        label: "Opex & Incentives prüfen",
        detail:
          "Nicht umlagefähige Kosten, Free-Rent-Perioden und TI-Budgets hinterfragen – jeder Prozentpunkt weniger Opex hilft direkt im Cashflow.",
      });
    }

    if (dscr !== null && dscr < 1.2) {
      t.push({
        label: "LTV / Eigenkapital anpassen",
        detail:
          "Ein niedrigerer LTV (z. B. 55 % statt 60 %) oder mehr Eigenkapital verbessert DSCR und die Bankfähigkeit merklich.",
      });
    }

    if (noiYield < 0.055) {
      t.push({
        label: "Miete vs. Kaufpreis",
        detail:
          "NOI-Yield liegt eher im unteren Bereich. Prüfe Potenzial für Mieterhöhungen oder einen niedrigeren Einstiegspreis.",
      });
    }

    if (!t.length) {
      t.push({
        label: "Feintuning",
        detail:
          "Die Kennzahlen wirken solide. Nutze die Spielwiese, um mit kleinen Anpassungen bei Miete, Preis und LTV den Score weiter zu optimieren.",
      });
    }

    return t.slice(0, 3);
  }, [wertAusCap, KP, valueGap, cashflowMonatY1, dscr, noiYield]);

  // Entscheidungstexte
  const decisionLabelText =
    scoreLabel === "BUY"
      ? "Kaufen (unter Vorbehalt)"
      : scoreLabel === "CHECK"
      ? "Weiter prüfen"
      : "Eher Nein";

  let decisionText: string;
  if (scoreLabel === "BUY") {
    decisionText =
      "NOI, Cashflow und Cap-Rate wirken unter den aktuellen Annahmen attraktiv. Der Deal ist grundsätzlich tragfähig – Feintuning bei Preis, Opex und LTV kann das Chance-Risiko-Profil weiter verbessern.";
  } else if (scoreLabel === "CHECK") {
    decisionText =
      "Die Kennzahlen liegen im Mittelfeld. Der Deal kann funktionieren, erfordert aber genaues Hinsehen bei Miete, Opex-Struktur, Incentives und Finanzierung. Rechne mehrere Szenarien, bevor du dich final entscheidest.";
  } else {
    decisionText =
      "NOI, Cashflow oder Cap-Rate liegen klar unter typischen Zielgrößen. Unter den aktuellen Annahmen wirkt das Objekt eher nicht attraktiv – du solltest harte Verhandlungen führen oder alternative Deals prüfen.";
  }

  const cashflowText =
    cashflowMonatY1 >= 0
      ? `Cashflow mtl.: ${eur(Math.round(
          cashflowMonatY1
        ))} (inkl. TI, Y1, positiv)`
      : `Cashflow mtl.: ${eur(Math.round(
          cashflowMonatY1
        ))} (inkl. TI, Y1, negativ)`;

  // UI helpers
  function updateZone(id: string, patch: Partial<Zone>) {
    setZonen((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function removeZone(id: string) {
    setZonen((prev) => prev.filter((z) => z.id !== id));
  }
  // ---------- Export-Funktionen ----------

  function handleExportJSON() {
    const payload = {
      generatedAt: new Date().toISOString(),
      input: {
        kaufpreis: KP,
        zonen,
        opexTotalPctBrutto,
        capexRuecklagePctBrutto,
        capRateAssumed,
        bonitaetTop3,
        indexiert,
        nkGrEStPct,
        nkNotarPct,
        nkGrundbuchPct,
        nkMaklerPct,
        nkSonstPct,
        financingOn,
        ltvPct,
        zinsPct,
        laufzeitYears,
        priceAdjPct,
        rentAdjPct,
        applyAdjustments,
      },
      output: {
        grossRentYearY1,
        effRentYearY1,
        totalOpexY1,
        recoveredY1,
        landlordOpexY1,
        capexY1,
        tiUpfront,
        noiY1,
        noiYield,
        dscr,
        capEff,
        capSpread,
        wertAusCap,
        cashflowMonatY1,
        score,
        scoreLabel,
        valueGap,
        valueGapPct,
      },
    };
    downloadBlob(
      `gewerbe_export_${ts()}.json`,
      "application/json;charset=utf-8",
      JSON.stringify(payload, null, 2)
    );
  }

  function handleExportCSV() {
    const rows: (string | number)[][] = [
      ["Abschnitt", "Feld", "Wert"],
      ["Eingaben", "Kaufpreis (€)", KP],
      ["Eingaben", "Opex gesamt (% Brutto)", pct(opexTotalPctBrutto)],
      ["Eingaben", "CapEx-Rücklage (% Brutto)", pct(capexRuecklagePctBrutto)],
      ["Eingaben", "Cap Rate (Basis)", pct(capRateAssumed)],
      ["Eingaben", "Top-3 Bonität", bonitaetTop3],
      ["Eingaben", "Indexiert", indexiert ? "Ja" : "Nein"],
      ["Eingaben", "NK gesamt (%)", pct(nkPct)],
      ["Finanzierung", "Aktiv", financingOn ? "Ja" : "Nein"],
      ["Finanzierung", "LTV", financingOn ? pct(ltvPct) : "-"],
      ["Finanzierung", "Zins p.a.", financingOn ? pct(zinsPct) : "-"],
      ["Finanzierung", "Laufzeit (J)", financingOn ? laufzeitYears : "-"],
      [],
      ["Ergebnis (Y1)", "NOI p.a.", eur(Math.round(noiY1))],
      ["Ergebnis (Y1)", "NOI-Yield", pct(noiYield)],
      ["Ergebnis (Y1)", "DSCR", dscr ? dscr.toFixed(2) : "-"],
      [
        "Ergebnis (Y1)",
        "Cashflow mtl. (inkl. TI)",
        eur(Math.round(cashflowMonatY1)),
      ],
      ["Ergebnis (Y1)", "Modellwert (NOI/Cap_eff)", eur(Math.round(wertAusCap))],
      ["Ergebnis (Y1)", "Effektive Cap", pct(capEff)],
      ["Ergebnis (Y1)", "Cap-Spread (bp)", (capSpread * 10000).toFixed(0)],
      [
        "Ergebnis (Y1)",
        "Wert-Gap",
        `${eur(Math.abs(valueGap))} (${signedPct(valueGapPct)})`,
      ],
      [],
      ["Kosten (Y1)", "Bruttomiete", eur(Math.round(grossRentYearY1))],
      ["Kosten (Y1)", "Effektive Miete", eur(Math.round(effRentYearY1))],
      ["Kosten (Y1)", "Opex gesamt", eur(Math.round(totalOpexY1))],
      ["Kosten (Y1)", "Recoverables (Mieter)", eur(Math.round(recoveredY1))],
      ["Kosten (Y1)", "Vermieter-Opex", eur(Math.round(landlordOpexY1))],
      ["Kosten (Y1)", "CapEx-Rücklage", eur(Math.round(capexY1))],
      ["Kosten (Y1)", "TI upfront", eur(Math.round(tiUpfront))],
      [],
      [
        "Zonen",
        "Spalten",
        "Name;Fläche m²;Miete €/m²;Leerstand %;Recoverable %;FreeRentMonateY1;TI €/m²;LeaseTerm J",
      ],
    ];
    for (const z of zonen) {
      rows.push([
        "Zonen",
        "Zeile",
        `${z.name};${z.areaM2};${z.rentPerM2};${(z.vacancyPct * 100).toFixed(
          1
        )};${(z.recoverablePct * 100).toFixed(1)};${z.freeRentMonthsY1};${
          z.tiPerM2
        };${z.leaseTermYears}`,
      ]);
    }
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
      `gewerbe_export_${ts()}.csv`,
      "text/csv;charset=utf-8",
      csvWithBom
    );
  }

  function handleExportPDF() {
    const html = `
<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Gewerbe – Export</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica Neue,Arial,Noto Sans;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:16px 0 8px}
table{width:100%;border-collapse:collapse} th,td{padding:6px 8px} th{text-align:left}
tr+tr td{border-top:1px solid #eee} .meta{color:#555;font-size:12px;margin-bottom:12px} .right{text-align:right}
.badge{display:inline-block;border:1px solid #ddd;border-radius:9999px;padding:2px 8px;font-size:12px;margin-left:8px}
@media print { a[href]:after{content:""} }
</style></head><body>
<h1>Gewerbe-Check – Export</h1>
<div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>

<h2>Eingaben</h2>
<table>
<tr><th>Kaufpreis (bewertet)</th><td class="right">${eur(KP)}</td></tr>
<tr><th>Opex gesamt</th><td class="right">${pct(opexTotalPctBrutto)}</td></tr>
<tr><th>CapEx-Rücklage</th><td class="right">${pct(capexRuecklagePctBrutto)}</td></tr>
<tr><th>Cap Rate (Basis)</th><td class="right">${pct(capRateAssumed)}</td></tr>
<tr><th>Top-3 Bonität</th><td class="right">${bonitaetTop3}</td></tr>
<tr><th>Indexiert</th><td class="right">${indexiert ? "Ja" : "Nein"}</td></tr>
<tr><th>Finanzierung</th><td class="right">${
      financingOn
        ? `Ja – LTV ${pct(ltvPct)}, Zins ${pct(zinsPct)}, Laufzeit ${laufzeitYears} J.`
        : "Nein"
    }</td></tr>
<tr><th>Kaufnebenkosten gesamt</th><td class="right">${pct(
      nkPct
    )} (${eur(nkBetrag)})</td></tr>
</table>

<h2>Ergebnis (Jahr 1)</h2>
<table>
<tr><th>NOI p.a.</th><td class="right">${eur(Math.round(noiY1))}</td></tr>
<tr><th>NOI-Yield</th><td class="right">${pct(noiYield)}</td></tr>
<tr><th>DSCR</th><td class="right">${dscr ? dscr.toFixed(2) : "–"}</td></tr>
<tr><th>Cashflow mtl. (inkl. TI)</th><td class="right">${eur(
      Math.round(cashflowMonatY1)
    )}</td></tr>
<tr><th>Effektive Cap</th><td class="right">${pct(
      capEff
    )} <span class="badge">${(capSpread * 10000).toFixed(
      0
    )} bp Spread</span></td></tr>
<tr><th>Modellwert (NOI/Cap)</th><td class="right">${eur(
      Math.round(wertAusCap)
    )}</td></tr>
<tr><th>Wert-Gap</th><td class="right">${eur(
      Math.abs(valueGap)
    )} (${signedPct(valueGapPct)})</td></tr>
</table>
`.trim();

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) {
      w.document.open();
      w.document.write(
        html +
          `
<h2>Zonen (Y1)</h2>
<table>
  <thead><tr>
    <th>Name</th><th class="right">Fläche</th><th class="right">Miete</th><th class="right">Leerstand</th>
    <th class="right">Recoverable</th><th class="right">Free-Rent</th><th class="right">TI</th><th class="right">LeaseTerm</th>
  </tr></thead>
  <tbody>
  ${zonen
    .map(
      (z) => `
    <tr>
      <td>${z.name}</td>
      <td class="right">${z.areaM2.toLocaleString("de-DE")} m²</td>
      <td class="right">${z.rentPerM2.toFixed(2)} €/m²</td>
      <td class="right">${pct(z.vacancyPct)}</td>
      <td class="right">${pct(z.recoverablePct)}</td>
      <td class="right">${z.freeRentMonthsY1} Mo</td>
      <td class="right">${eur(Math.round(z.tiPerM2 * z.areaM2))}</td>
      <td class="right">${z.leaseTermYears.toFixed(1)} J</td>
    </tr>
  `
    )
    .join("")}
  </tbody>
</table>

<script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
</body></html>`
      );
      w.document.close();
    }
  }

  function runSelectedExports(opts: { json: boolean; csv: boolean; pdf: boolean }) {
    if (opts.json) handleExportJSON();
    if (opts.csv) handleExportCSV();
    if (opts.pdf) handleExportPDF();
  }

async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  if (!f) return;
  e.target.value = "";
  const name = f.name.toLowerCase();
  const isPdf = f.type === "application/pdf" || name.endsWith(".pdf");
  const isJson = f.type === "application/json" || name.endsWith(".json");

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
      if (inp.kaltmieteMonat && inp.gesamtFlaecheM2) {
        setZonen([{
          id: uid(),
          name: "Zone 1 (aus Exposé)",
          areaM2: num(inp.gesamtFlaecheM2, 200),
          rentPerM2: inp.kaltmieteMonat / inp.gesamtFlaecheM2,
          vacancyPct: num(inp.leerstandPct, 0.05),
          recoverablePct: 0.8,
          freeRentMonthsY1: 0,
          tiPerM2: 30,
          leaseTermYears: 5,
        }]);
      }
      setToast({ type: "success", message: "PDF-Exposé erfolgreich importiert." });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "PDF-Import fehlgeschlagen. Bitte prüfe das Exposé." });
    } finally {
      setPdfLoading(false);
    }
    return;
  }

  if (isJson) {
    importJson(f);
    return;
  }

  setToast({ type: "error", message: "Dieses Dateiformat wird nicht unterstützt." });
}

  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setKaufpreis(num(d.kaufpreis, kaufpreis));
        setZonen(
          Array.isArray(d.zonen) && d.zonen.length
            ? d.zonen.map((z: any) => ({
                id: z.id ?? uid(),
                name: String(z.name ?? "Zone"),
                areaM2: num(z.areaM2, 0),
                rentPerM2: num(z.rentPerM2, 0),
                vacancyPct: clamp01(num(z.vacancyPct, 0)),
                recoverablePct: clamp01(num(z.recoverablePct, 0.8)),
                freeRentMonthsY1: Math.max(
                  0,
                  Math.min(24, Math.floor(num(z.freeRentMonthsY1, 0)))
                ),
                tiPerM2: Math.max(0, num(z.tiPerM2, 0)),
                leaseTermYears: Math.max(0.5, num(z.leaseTermYears, 3)),
              }))
            : zonen
        );
        setOpexTotalPctBrutto(num(d.opexTotalPctBrutto, opexTotalPctBrutto));
        setCapexRuecklagePctBrutto(
          num(d.capexRuecklagePctBrutto, capexRuecklagePctBrutto)
        );
        setCapRateAssumed(num(d.capRateAssumed, capRateAssumed));
        setBonitaetTop3((d.bonitaetTop3 as Bonitaet) ?? bonitaetTop3);
        setIndexiert(Boolean(d.indexiert));
        setNkGrEStPct(num(d.nkGrEStPct, nkGrEStPct));
        setNkNotarPct(num(d.nkNotarPct, nkNotarPct));
        setNkGrundbuchPct(num(d.nkGrundbuchPct, nkGrundbuchPct));
        setNkMaklerPct(num(d.nkMaklerPct, nkMaklerPct));
        setNkSonstPct(num(d.nkSonstPct, nkSonstPct));
        setFinancingOn(Boolean(d.financingOn));
        setLtvPct(num(d.ltvPct, ltvPct));
        setZinsPct(num(d.zinsPct, zinsPct));
        setLaufzeitYears(num(d.laufzeitYears, laufzeitYears));
        setPriceAdjPct(num(d.priceAdjPct, priceAdjPct));
        setRentAdjPct(num(d.rentAdjPct, rentAdjPct));
        setApplyAdjustments(Boolean(d.applyAdjustments));

        setToast({
          type: "success",
          message: "JSON-Import erfolgreich geladen.",
        });
      } catch {
        setToast({
          type: "error",
          message: "Ungültige Datei – JSON konnte nicht gelesen werden.",
        });
      }
    };
    r.readAsText(file);
  }

  /* ---------------- Render ---------------- */
  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: SURFACE }}
    >
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2">
          <div
            className={
              "rounded-full px-4 py-2 text-sm shadow-md border " +
              (toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200")
            }
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Inhalt mit extra Bottom-Padding für den Sticky Footer */}
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
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Gewerbe-Check
              </h1>
              <p className="text-muted-foreground text-sm">
                Exakte Annuität, Recoverables je Zone & Incentives – aufgebaut
                wie der Mehrfamilienhaus-Check, nur für Gewerbe.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Mit diesem Tool prüfst du schnell, ob ein Gewerbedeal unter
                deinen Annahmen wirtschaftlich tragfähig ist. Erfasse Zonen,
                Opex, Incentives und Finanzierung – Score, Ampel und Cashflow
                zeigen dir sofort, ob „Kaufen“, „Weiter prüfen“ oder eher „Nein“
                die passende Richtung ist.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* ImmoScout-Import als eigener Button */}
            <ImportFromImmoScout plan="pro" onImported={applyImportPayload} />

            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={() => {
                setKaufpreis(1_200_000);
                setZonen([
                  {
                    id: uid(),
                    name: "Büro EG",
                    areaM2: 250,
                    rentPerM2: 16,
                    vacancyPct: 0.05,
                    recoverablePct: 0.85,
                    freeRentMonthsY1: 0,
                    tiPerM2: 50,
                    leaseTermYears: 5,
                  },
                  {
                    id: uid(),
                    name: "Büro OG",
                    areaM2: 350,
                    rentPerM2: 13,
                    vacancyPct: 0.1,
                    recoverablePct: 0.75,
                    freeRentMonthsY1: 1,
                    tiPerM2: 35,
                    leaseTermYears: 4,
                  },
                ]);
                setOpexTotalPctBrutto(0.26);
                setCapexRuecklagePctBrutto(0.04);
                setCapRateAssumed(0.065);
                setBonitaetTop3("B");
                setIndexiert(true);
                setNkGrEStPct(0.065);
                setNkNotarPct(0.015);
                setNkGrundbuchPct(0.005);
                setNkMaklerPct(0.0357);
                setNkSonstPct(0);
                setFinancingOn(true);
                setLtvPct(0.6);
                setZinsPct(0.045);
                setLaufzeitYears(30);
                setPriceAdjPct(0);
                setRentAdjPct(0);
                setApplyAdjustments(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>

            <ExportDropdown onRun={runSelectedExports} />

            {/* Import */}
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
    <><Upload className="h-4 w-4" /> Import</>
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

        {/* 2-Spalten-Layout: Main + Glossar */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MAIN */}
          <div className="xl:col-span-2 space-y-6">
            {/* Kaufpreis & Nebenkosten */}
            <InputCard
              title="Kaufpreis & Nebenkosten"
              subtitle="Deal-Basis"
              description="Hier erfasst du den Kaufpreis und die wichtigsten Kaufnebenkosten. In der Spielwiese kannst du später mit Abschlägen oder Aufschlägen auf den Kaufpreis experimentieren."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <NumberField
                  label="Kaufpreis Objekt (€)"
                  value={kaufpreis}
                  onChange={setKaufpreis}
                  step={1000}
                  help="Netto-Kaufpreis ohne Nebenkosten."
                />
                <NumberField
                  label="Grunderwerbsteuer (%)"
                  value={nkGrEStPct * 100}
                  onChange={(v) => setNkGrEStPct(v / 100)}
                  step={0.1}
                />
                <NumberField
                  label="Makler (% vom KP)"
                  value={nkMaklerPct * 100}
                  onChange={(v) => setNkMaklerPct(v / 100)}
                  step={0.1}
                />
                <NumberField
                  label="Notar & Beurkundung (%)"
                  value={nkNotarPct * 100}
                  onChange={(v) => setNkNotarPct(v / 100)}
                  step={0.1}
                />
                <NumberField
                  label="Grundbuchkosten (%)"
                  value={nkGrundbuchPct * 100}
                  onChange={(v) => setNkGrundbuchPct(v / 100)}
                  step={0.1}
                />
                <NumberField
                  label="Sonstige NK (%)"
                  value={nkSonstPct * 100}
                  onChange={(v) => setNkSonstPct(v / 100)}
                  step={0.1}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Geschätzte Kaufnebenkosten gesamt:{" "}
                <b>
                  {pct(nkPct)} ({eur(nkBetrag)})
                </b>
              </p>
            </InputCard>

            {/* Zonen */}
            <InputCard
              title="Mietzonen & Incentives"
              subtitle="Zonenbasierte Mieteingaben"
              description="Lege jede vermietete Fläche als eigene Zone an – mit Fläche, Miete, Leerstand, Recoverables, Free-Rent und TI-Budgets. So siehst du genau, wie jede Zone zum NOI beiträgt."
            >
              <div className="space-y-3">
                {zonen.map((z) => (
                  <Card key={z.id} className="bg-white/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            className="text-sm font-medium bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-[#0F2C8A] flex-1"
                            value={z.name}
                            onChange={(e) =>
                              updateZone(z.id, { name: e.target.value })
                            }
                          />
                          <button
                            type="button"
                            className="text-xs text-red-500 inline-flex items-center gap-1"
                            onClick={() => removeZone(z.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Entfernen
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <NumberField
                            label="Fläche (m²)"
                            value={z.areaM2}
                            onChange={(v) => updateZone(z.id, { areaM2: v })}
                            step={1}
                          />
                          <NumberField
                            label="Miete €/m²"
                            value={z.rentPerM2}
                            onChange={(v) =>
                              updateZone(z.id, { rentPerM2: v })
                            }
                            step={0.5}
                          />
                          <PercentFieldCompact
                            label="Leerstand"
                            value={z.vacancyPct}
                            onChange={(v) =>
                              updateZone(z.id, { vacancyPct: v })
                            }
                          />
                          <PercentFieldCompact
                            label="Recoverable-Anteil"
                            value={z.recoverablePct}
                            onChange={(v) =>
                              updateZone(z.id, { recoverablePct: v })
                            }
                          />
                          <NumberField
                            label="Free-Rent Monate (Y1)"
                            value={z.freeRentMonthsY1}
                            onChange={(v) =>
                              updateZone(z.id, {
                                freeRentMonthsY1: Math.max(
                                  0,
                                  Math.min(24, Math.round(v))
                                ),
                              })
                            }
                            step={1}
                          />
                          <NumberField
                            label="TI-Budget €/m²"
                            value={z.tiPerM2}
                            onChange={(v) => updateZone(z.id, { tiPerM2: v })}
                            step={5}
                          />
                          <NumberField
                            label="Restlaufzeit Mietvertrag (Jahre)"
                            value={z.leaseTermYears}
                            onChange={(v) =>
                              updateZone(z.id, { leaseTermYears: v })
                            }
                            step={0.5}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-dashed hover:border-solid hover:bg-white/60"
                  onClick={() =>
                    setZonen((prev) => [
                      ...prev,
                      {
                        id: uid(),
                        name: `Zone ${prev.length + 1}`,
                        areaM2: 200,
                        rentPerM2: 12,
                        vacancyPct: 0.05,
                        recoverablePct: 0.8,
                        freeRentMonthsY1: 0,
                        tiPerM2: 30,
                        leaseTermYears: 5,
                      },
                    ])
                  }
                >
                  <Plus className="h-3 w-3" /> Weitere Zone hinzufügen
                </button>
              </div>
            </InputCard>

            {/* Risiko / Cap-Rate */}
            <InputCard
              title="Risiko, Cap-Rate & Bonität"
              subtitle="Bewertungsebene"
              description="Lege deine Markterwartung über die Cap-Rate fest und bewerte die Top-3-Mieter. Indexierte Mietverträge und längere Restlaufzeiten senken die effektive Cap-Rate."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <NumberField
                  label="Cap Rate (Basis, Markt) %"
                  value={capRateAssumed * 100}
                  onChange={(v) => setCapRateAssumed(v / 100)}
                  step={0.05}
                  help="Deine marktübliche Nettoanfangsrendite."
                />
                <div>
                  <LabelWithHelp
                    label="Top-3-Mieter Bonität"
                    help="A = sehr stark, B = solide, C = eher schwach."
                  />
                  <select
                    className="mt-1 w-full border rounded-2xl p-2 bg-card text-sm"
                    value={bonitaetTop3}
                    onChange={(e) =>
                      setBonitaetTop3(e.target.value as Bonitaet)
                    }
                  >
                    <option value="A">A – sehr starke Bonität</option>
                    <option value="B">B – solide Bonität</option>
                    <option value="C">C – erhöhte Risiken</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-5 md:mt-7">
                  <input
                    id="indexiert"
                    type="checkbox"
                    checked={indexiert}
                    onChange={(e) => setIndexiert(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="indexiert"
                    className="text-sm text-foreground"
                  >
                    Mietverträge indexiert
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Effektive Cap-Rate (inkl. Spread): <b>{pct(capEff)}</b>{" "}
                ({(capSpread * 10000).toFixed(0)} bp Spread).
              </p>
            </InputCard>

            {/* Finanzierung */}
            <InputCard
              title="Finanzierung"
              subtitle="Annuitätendarlehen"
              description="Optional kannst du eine Finanzierung mit exakter Annuität abbilden. Der Score berücksichtigt dann DSCR und Cashflow nach Debt Service."
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="financingOn"
                    type="checkbox"
                    checked={financingOn}
                    onChange={(e) => setFinancingOn(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="financingOn"
                    className="text-sm text-foreground"
                  >
                    Finanzierung aktiv
                  </label>
                </div>

                {financingOn && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <SliderRow
                        label="Loan-to-Value (LTV)"
                        value={ltvPct * 100}
                        min={30}
                        max={80}
                        step={1}
                        right={pct(ltvPct)}
                        onChange={(v) => setLtvPct(v / 100)}
                      />
                    </div>
                    <NumberField
                      label="Zins p.a. (%)"
                      value={zinsPct * 100}
                      onChange={(v) => setZinsPct(v / 100)}
                      step={0.05}
                    />
                    <NumberField
                      label="Laufzeit (Jahre)"
                      value={laufzeitYears}
                      onChange={setLaufzeitYears}
                      step={1}
                    />
                  </div>
                )}
              </div>
            </InputCard>

            {/* Spielwiese */}
            <InputCard
              title="Spielwiese"
              subtitle="Was-wäre-wenn-Szenarien"
              description="Teste mit einfachen Schiebereglern, wie sich Kaufpreisabschläge und Mietanpassungen auf Wert, Cashflow und Score auswirken."
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="applyAdjustments"
                    type="checkbox"
                    checked={applyAdjustments}
                    onChange={(e) => setApplyAdjustments(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="applyAdjustments"
                    className="text-sm text-foreground"
                  >
                    Anpassungen aktiv auf Berechnung anwenden
                  </label>
                </div>
                <SliderRow
                  label="Kaufpreis-Anpassung"
                  value={priceAdjPct * 100}
                  min={-20}
                  max={20}
                  step={1}
                  right={signedPct(priceAdjPct)}
                  onChange={(v) => setPriceAdjPct(v / 100)}
                />
                <SliderRow
                  label="Mietanpassung (alle Zonen)"
                  value={rentAdjPct * 100}
                  min={-20}
                  max={20}
                  step={1}
                  right={signedPct(rentAdjPct)}
                  onChange={(v) => setRentAdjPct(v / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Aktuell zugrunde gelegter Kaufpreis: <b>{eur(KP)}</b>{" "}
                  (inkl. Spielwiese).
                </p>
              </div>
            </InputCard>

            {/* Zwischenstand & Ergebnis-Karten */}
            <Card className="border-0 shadow-sm" style={{ background: "#0F2C8A" }}>
              <GewerbeDecisionSummary
                scorePct={scorePct}
                scoreLabel={scoreLabel}
                scoreColor={scoreColor}
                decisionLabelText={decisionLabelText}
                decisionText={decisionText}
                cashflowText={cashflowText}
                noiY1={noiY1}
                annuityYear={annuityYear}
                wertAusCap={wertAusCap}
                KP={KP}
                valueGap={valueGap}
                tips={tips}
              />
            </Card>

            {/* KPI-Indikatoren */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* NOI-Yield */}
              <div className="rounded-xl border p-3 bg-card">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="h-4 w-4" /> NOI-Yield
                </div>
                <div className="text-lg font-semibold mt-1 tabular-nums text-foreground">{pct(noiYield)}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">NOI / Kaufpreis – Rendite vor Finanzierung.</div>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${
                  noiYield >= 0.065
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : noiYield >= 0.045
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    noiYield >= 0.065 ? "bg-emerald-500" : noiYield >= 0.045 ? "bg-amber-400" : "bg-red-500"
                  }`} />
                  {noiYield >= 0.065
                    ? "Gut – starke Gewerberendite (>6,5%)"
                    : noiYield >= 0.045
                    ? "Okay – im Marktbereich (Ziel >6,5%)"
                    : "Niedrig – Zielwert >4,5–6,5%"}
                </div>
              </div>

              {/* DSCR */}
              <div className="rounded-xl border p-3 bg-card">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> DSCR
                </div>
                <div className="text-lg font-semibold mt-1 tabular-nums text-foreground">
                  {dscr ? dscr.toFixed(2) : "–"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">NOI / Annuität – Schuldentragfähigkeit.</div>
                {dscr !== null && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${
                    dscr >= 1.3
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : dscr >= 1.2
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      dscr >= 1.3 ? "bg-emerald-500" : dscr >= 1.2 ? "bg-amber-400" : "bg-red-500"
                    }`} />
                    {dscr >= 1.3
                      ? "Gut – komfortabel gedeckt (>1,3)"
                      : dscr >= 1.2
                      ? "Okay – knapp über Mindest (>1,2)"
                      : "Kritisch – unter Bankstandard (<1,2)"}
                  </div>
                )}
              </div>

              {/* Cashflow */}
              <div className="rounded-xl border p-3 bg-card">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Banknote className="h-4 w-4" /> Cashflow mtl. (Y1)
                </div>
                <div className="text-lg font-semibold mt-1 tabular-nums text-foreground">
                  {eur(Math.round(cashflowMonatY1))}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Nach Finanzierung & TI (Jahr 1).</div>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${
                  cashflowMonatY1 >= 500
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : cashflowMonatY1 >= 0
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cashflowMonatY1 >= 500 ? "bg-emerald-500" : cashflowMonatY1 >= 0 ? "bg-amber-400" : "bg-red-500"
                  }`} />
                  {cashflowMonatY1 >= 500
                    ? "Gut – positiver Cashflow"
                    : cashflowMonatY1 >= 0
                    ? "Okay – knapp positiv"
                    : "Negativ – monatlicher Zuschuss nötig"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ValueVsPrice
                KP={KP}
                wertAusCap={wertAusCap}
                valueGap={valueGap}
                valueGapPct={valueGapPct}
                capEff={capEff}
                capRateAssumed={capRateAssumed}
                capSpread={capSpread}
                viewTag={viewTag}
              />

              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Cashflow & Tilgung (10 Jahre)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Jahrescashflow nach Finanzierung vs. Tilgung.
                    </div>
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={projection}
                      margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <RTooltip
                        formatter={(v: any) => eur(v)}
                        labelFormatter={(l) => `Jahr ${l}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cashflowPA"
                        name="Cashflow p.a."
                        stroke={BRAND}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="tilgungPA"
                        name="Tilgung p.a."
                        stroke={ORANGE}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Tilgungsplan */}
            <AmortTable plan={tilgungsplan} />
          </div>

          {/* Glossar Sidebar */}
          <aside className="hidden xl:block space-y-4 sticky top-6 h-fit">
            <Card>
              <div className="text-sm font-medium mb-1 text-foreground">
                Kurz-Glossar
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>
                  <b>NOI</b> – Netto-Mietertrag nach Opex &amp; CapEx,
                  vor Finanzierung.
                </li>
                <li>
                  <b>DSCR</b> – Debt Service Coverage Ratio, Verhältnis von NOI
                  zu jährlicher Kreditrate.
                </li>
                <li>
                  <b>Recoverables</b> – umlagefähige Betriebskosten, die über
                  Nebenkosten auf Mieter umgelegt werden.
                </li>
                <li>
                  <b>TI</b> – Tenant Improvements (Ausbaukosten), hier als
                  einmaliger Abfluss im ersten Jahr.
                </li>
                <li>
                  <b>Cap Rate</b> – Marktrendite, mit der der NOI kapitalisiert
                  wird, um einen Wert abzuleiten.
                </li>
              </ul>
            </Card>
            <Card>
              <div className="text-sm font-medium mb-1 text-foreground">
                Tipp zur Nutzung
              </div>
              <p className="text-xs text-muted-foreground">
                Starte mit einer groben Schätzung zu Miete, Opex und Cap-Rate.
                Nutze dann die Spielwiese, um Kaufpreis und Mieten zu variieren.
                Die Ampel und der Score helfen dir, schnell ein Gefühl für das
                Chance-Risiko-Profil zu bekommen.
              </p>
            </Card>
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
                  <span className="text-[11px] text-muted-foreground">
                    (live)
                  </span>
                </div>
                <div className="text-sm font-semibold truncate text-foreground">
                  Entscheidung: {decisionLabelText}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    text={eur(Math.round(cashflowMonatY1)) + " mtl."}
                    hint="Cashflow (Y1, inkl. TI)"
                  />
                  <Badge
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    text={`NOI-Yield ${pct(noiYield)}`}
                    hint="NOI / Kaufpreis"
                  />
                  <Badge
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    text={dscr ? dscr.toFixed(2) : "–"}
                    hint="DSCR (Y1)"
                  />
                </div>
              </div>

              {/* Rechts: Score-Donut */}
              <ScoreDonut
                scorePct={scorePct}
                scoreColor={scoreColor}
                label={scoreLabel}
                size={42}
              />
            </div>

            {/* Progress-Bar */}
            <div
              className="h-1.5 w-full rounded-b-2xl overflow-hidden"
              style={{ background: SURFACE_ALT }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.max(4, Math.min(100, scorePct))}%`,
                  background: `linear-gradient(90deg, ${scoreColor}, ${CTA})`,
                }}
                aria-label={`Score ${scorePct}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} // <-- Ende PageInner

/* -------------------- Entscheidungs-Komponente -------------------- */

type GewerbeDecisionSummaryProps = {
  scorePct: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
  scoreColor: string;
  decisionLabelText: string;
  decisionText: string;
  cashflowText: string;
  noiY1: number;
  annuityYear: number;
  wertAusCap: number;
  KP: number;
  valueGap: number;
  tips: Tip[];
};

function GewerbeDecisionSummary(props: GewerbeDecisionSummaryProps) {
  const {
    scorePct,
    scoreLabel,
    scoreColor,
    decisionLabelText,
    decisionText,
    cashflowText,
    noiY1,
    annuityYear,
    wertAusCap,
    KP,
    valueGap,
    tips,
  } = props;

  return (
    <div className="rounded-2xl p-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs opacity-80">
            Zwischenstand (auf Basis deiner Eingaben)
          </div>
          <div className="text-lg font-semibold">{decisionLabelText}</div>

          <div className="text-sm opacity-90 max-w-xl">{decisionText}</div>

          <div className="mt-3 space-y-1 text-sm">
            <div>{cashflowText}</div>
            <div>
              Jährlicher Netto-Mietertrag (NOI): {eur(Math.round(noiY1))}
            </div>
            {annuityYear > 0 && (
              <div>
                Jährliche Kreditrate (inkl. Zins & Tilgung):{" "}
                {eur(Math.round(annuityYear))}
              </div>
            )}
            <div>
              Modellwert laut Berechnung: {eur(Math.round(wertAusCap))}{" "}
              (Differenz zum Kaufpreis: {eur(Math.abs(valueGap))})
            </div>
            <div className="text-xs opacity-80 pt-1">
              NOI = Netto-Mietertrag nach laufenden Kosten und
              Instandhaltungsrücklage, vor Finanzierung.
            </div>
          </div>
        </div>

        <ScoreDonut
          scorePct={scorePct}
          scoreColor={scoreColor}
          label={scoreLabel}
          size={62}
        />
      </div>

      {/* Hebel */}
      <div className="mt-4">
        <div className="text-xs opacity-80 mb-1">
          Schnelle Hebel für diesen Deal
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

/* -------------------- AmortTable -------------------- */

type AmortTableProps = {
  plan?: AmortPlan;
};

function AmortTable({ plan }: AmortTableProps) {
  if (!plan || !plan.rows.length) return null;

  return (
    <Card>
      <div className="text-sm font-medium mb-2 text-foreground">
        Tilgungsplan (exakte Annuität)
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-4">Jahr</th>
              <th className="py-2 pr-4">Zins</th>
              <th className="py-2 pr-4">Tilgung</th>
              <th className="py-2 pr-4">Annuität</th>
              <th className="py-2 pr-4">Restschuld</th>
            </tr>
          </thead>
          <tbody>
            {plan.rows
              .slice(0, Math.min(10, plan.rows.length))
              .map((r) => (
                <tr key={r.year} className="border-b last:border-0">
                  <td className="py-1 pr-4">{r.year}</td>
                  <td className="py-1 pr-4 tabular-nums">
                    {eur(Math.round(r.interest))}
                  </td>
                  <td className="py-1 pr-4 tabular-nums">
                    {eur(Math.round(r.principal))}
                  </td>
                  <td className="py-1 pr-4 tabular-nums">
                    {eur(Math.round(r.annuity))}
                  </td>
                  <td className="py-1 pr-4 tabular-nums">
                    {eur(Math.round(r.outstanding))}
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2 pr-4 font-medium">Summe (10J)</td>
              <td className="py-2 pr-4 font-medium tabular-nums">
                {eur(Math.round(plan.sum10.interest))}
              </td>
              <td className="py-2 pr-4 font-medium tabular-nums">
                {eur(Math.round(plan.sum10.principal))}
              </td>
              <td className="py-2 pr-4 font-medium tabular-nums">
                {eur(Math.round(plan.sum10.annuity))}
              </td>
              <td className="py-2 pr-4" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        TI wird als einmaliger Abfluss in Y1 berücksichtigt (nicht in der
        Annuität).
      </p>
    </Card>
  );
}

/* -------------------- Charts/Widgets -------------------- */

type ValueVsPriceProps = {
  KP: number;
  wertAusCap: number;
  valueGap: number;
  valueGapPct: number;
  capEff: number;
  capRateAssumed: number;
  capSpread: number;
  viewTag: string;
};

function ValueVsPrice({
  KP,
  wertAusCap,
  valueGap,
  valueGapPct,
  capEff,
  capRateAssumed,
  capSpread,
  viewTag,
}: ValueVsPriceProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">
            Wert (NOI/Cap_eff) vs. Kaufpreis
          </div>
          <div className="text-xs text-muted-foreground">
            Basis: {viewTag.toLowerCase()}
          </div>
        </div>
        <span
          className={
            "px-2 py-1 rounded-full text-xs border " +
            (valueGap >= 0
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200")
          }
        >
          {valueGap >= 0 ? "Unter Wert" : "Über Wert"} ·{" "}
          {eur(Math.abs(valueGap))} ({signedPct(valueGapPct)})
        </span>
      </div>
      <div className="h-56 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[
              {
                name: "Deal",
                Preis: Math.round(KP),
                Wert: Math.round(wertAusCap),
              },
            ]}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} />
                <stop offset="100%" stopColor="#2a446e" />
              </linearGradient>
              <linearGradient id="gradWert" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CTA} />
                <stop offset="100%" stopColor={ORANGE} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RTooltip formatter={(v: any) => eur(v)} />
            <Legend />
            <Bar
              dataKey="Preis"
              fill="url(#gradPreis)"
              radius={[10, 10, 0, 0]}
            >
              <LabelList
                dataKey="Preis"
                position="top"
                formatter={(v: any) => eur(v)}
              />
            </Bar>
            <Bar
              dataKey="Wert"
              fill="url(#gradWert)"
              radius={[10, 10, 0, 0]}
            >
              <LabelList
                dataKey="Wert"
                position="top"
                formatter={(v: any) => eur(v)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Effektive Cap: {pct(capEff)} (Basis {pct(capRateAssumed)}{" "}
        {capSpread >= 0 ? "+" : "-"} {Math.abs(capSpread * 100).toFixed(1)} bp
        Risiko).
      </p>
    </Card>
  );
}

/* -------------------- Logik / Calcs -------------------- */

function computeZonesY1(zonen: Zone[], rentAdjPct: number) {
  let totalGross = 0,
    totalEff = 0,
    totalTI = 0;

  const recoveredOpexFromZones = (opexPct: number) => {
    return zonen.reduce((s, z) => {
      const grossY1 =
        z.areaM2 *
        z.rentPerM2 *
        (1 + rentAdjPct) *
        12 *
        (1 - Math.min(z.freeRentMonthsY1, 12) / 12);
      return s + grossY1 * opexPct * clamp01(z.recoverablePct);
    }, 0);
  };

  for (const z of zonen) {
    const grossY1 =
      z.areaM2 *
      z.rentPerM2 *
      (1 + rentAdjPct) *
      12 *
      (1 - Math.min(z.freeRentMonthsY1, 12) / 12);
    const effY1 = grossY1 * (1 - clamp01(z.vacancyPct));
    const ti = z.areaM2 * Math.max(0, z.tiPerM2);
    totalGross += grossY1;
    totalEff += effY1;
    totalTI += ti;
  }

  return {
    totalGross,
    totalEff,
    totalTI,
    recoveredOpex: recoveredOpexFromZones,
  };
}

function annuityExact(loan: number, r: number, years: number) {
  if (loan <= 0 || r <= 0 || years <= 0) return 0;
  const n = Math.round(years);
  const ann = (loan * r) / (1 - Math.pow(1 + r, -n));
  return ann;
}

function buildAmortizationExact(
  loan: number,
  r: number,
  years: number,
  on: boolean,
  annuityFn: (L: number, r: number, n: number) => number
): AmortPlan {
  const rows: AmortRow[] = [];
  if (!on || loan <= 0 || r <= 0 || years <= 0)
    return { rows, sum10: { interest: 0, principal: 0, annuity: 0 } };

  let outstanding = loan;
  const n = Math.round(years);
  const ann = annuityFn(loan, r, n);

  for (let y = 1; y <= n; y++) {
    const interest = outstanding * r;
    const principal = Math.min(ann - interest, outstanding);
    outstanding = Math.max(0, outstanding - principal);
    rows.push({
      year: y,
      interest,
      principal,
      annuity: ann,
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

function buildProjection10y(opts: {
  years: number;
  zones: Zone[];
  rentAdjPct: number;
  opexPct: number;
  capexPct: number;
  rentGrowthPct: number;
  costGrowthPct: number;
  loan: number;
  zinsPct: number;
  yearsLoan: number;
  financingOn: boolean;
  annuityExactFn: (L: number, r: number, n: number) => number;
}): ProjectionPoint[] {
  const {
    years,
    zones,
    rentAdjPct,
    opexPct,
    capexPct,
    rentGrowthPct,
    costGrowthPct,
    loan,
    zinsPct,
    yearsLoan,
    financingOn,
    annuityExactFn,
  } = opts;

  const data: ProjectionPoint[] = [];
  let outstanding = financingOn ? loan : 0;
  const n = Math.round(yearsLoan);
  const ann = financingOn ? annuityExactFn(loan, zinsPct, n) : 0;

  for (let t = 1; t <= years; t++) {
    let gross = 0,
      eff = 0,
      recovered = 0,
      ti = 0;

    for (const z of zones) {
      const freeFactorY1 =
        t === 1 ? 1 - Math.min(z.freeRentMonthsY1, 12) / 12 : 1;
      const grossZ0 =
        z.areaM2 * z.rentPerM2 * (1 + rentAdjPct) * 12 * freeFactorY1;
      const grossZt = grossZ0 * Math.pow(1 + rentGrowthPct, t - 1);
      const effZt = grossZt * (1 - clamp01(z.vacancyPct));

      gross += grossZt;
      eff += effZt;
      recovered += grossZt * opexPct * clamp01(z.recoverablePct);

      if (t === 1) ti += z.areaM2 * Math.max(0, z.tiPerM2);
    }

    const opexT = gross * (opexPct * Math.pow(1 + costGrowthPct, t - 1));
    const capexT = gross * (capexPct * Math.pow(1 + costGrowthPct, t - 1));
    const landlordOpexT = Math.max(0, opexT - recovered);
    const noiT = eff - landlordOpexT - capexT;

    const interest = financingOn ? outstanding * zinsPct : 0;
    const principal = financingOn
      ? Math.min(ann - interest, Math.max(0, outstanding))
      : 0;

    outstanding = Math.max(0, outstanding - principal);

    const cf = noiT - (financingOn ? ann : 0) - (t === 1 ? ti : 0);

    data.push({
      year: t,
      cashflowPA: Math.round(cf),
      tilgungPA: Math.round(principal),
    });
  }

  return data;
}

function calcCapSpread(walt: number, bonitaet: Bonitaet, indexiert: boolean) {
  const spreadWALT = walt < 3 ? 0.006 : walt < 5 ? 0.003 : walt < 8 ? 0.0 : -0.002;
  const spreadBon = bonitaet === "A" ? -0.002 : bonitaet === "B" ? 0 : 0.004;
  const spreadIdx = indexiert ? -0.001 : 0;
  return clampRange(spreadWALT + spreadBon + spreadIdx, -0.004, 0.012);
}

/* ---- Simple Helper ---- */

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

function clampMin(x: number, m: number) {
  return x < m ? m : x;
}

function clampRange(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
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

function avgWeighted(items: { w: number; v: number }[]) {
  const W = items.reduce((s, i) => s + i.w, 0);
  if (W <= 0) return 0;
  return items.reduce((s, i) => s + i.v * i.w, 0) / W;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  right,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  right?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {right && <span>{right}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
