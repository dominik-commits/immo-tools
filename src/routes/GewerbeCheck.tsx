// src/routes/GewerbeCheck.tsx
// Gewerbe-Check (v4) – PRO
// Einheitliches UI: Intro, Zwischenstand, Spielwiese, Details, Sticky-Footer.

import React, { useMemo, useState, useEffect } from "react";
import {
  Briefcase,
  Building2,
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
const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#ff914d";
const SURFACE = "#0d1117";
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
    <div className={`rounded-2xl border p-4  ${className}`} style={style}>
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
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px]  "
      title={hint}
    >
      {icon} {text}
    </span>
  );
}

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm font-medium flex items-center gap-1" style={{ color: "rgba(255,255,255,0.6)" }}>
      <span>{label}</span>
      {help && <Help title={help} />}
    </div>
  );
}

function InputBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide" style={{ background: "rgba(252,220,69,0.12)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.25)" }}>EINGABE</span>
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
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.88)" }}>{title}</div>
          {subtitle && (
            <div className="text-xs ">{subtitle}</div>
          )}
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
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type={focused ? "number" : "text"}
          step={step} value={displayValue} placeholder={placeholder}
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
        <span className="w-28 text-right tabular-nums ">
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
      <div className="text-xs ">{label}</div>
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
          className="w-16 border rounded-2xl p-1 text-right  "
          value={(value * 100).toFixed(1)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>%</span>
      </div>
    </div>
  );
}

function ScoreDonut({
  scorePct, scoreColor, label, size = 42,
}: {
  scorePct: number; scoreColor: string; label: string; size?: number;
}) {
  const r = size * 0.9;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(scorePct, 100)) * circ / 100;
  return (
    <div style={{ position: "relative", width: size * 2, height: size * 2 }}>
      <svg width={size * 2} height={size * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size} cy={size} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={Math.round(size * 0.18)} />
        <circle cx={size} cy={size} r={r} fill="none" stroke={scoreColor} strokeWidth={Math.round(size * 0.18)}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: size * 0.45, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{scorePct}%</div>
        <div style={{ fontSize: size * 0.2, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

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
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
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

/* ---------------- Hauptkomponente (PRO) ---------------- */

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const short = text.length > 90;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
        {expanded || !short ? text : text.slice(0, 90) + "…"}
      </div>
      {short && (
        <button onClick={() => setExpanded(v => !v)}
          style={{ marginTop: 4, fontSize: 10, color: "rgba(252,220,69,0.7)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 3 }}>
          {expanded ? "▲ Weniger" : "▼ Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

type ViewMode = "einfach" | "erweitert";

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
  const MODE_KEY = "gewerbe.mode.v1";
  const [mode, setMode] = useState<ViewMode>(() => {
    try { const raw = localStorage.getItem(MODE_KEY); return raw === "erweitert" ? "erweitert" : "einfach"; }
    catch { return "einfach"; }
  });
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);

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
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2">
          <div className="rounded-xl px-4 py-2 text-sm font-medium shadow-xl" style={{ background: "rgba(22,27,34,0.98)", border: "1px solid rgba(252,220,69,0.3)", color: "#FCDC45" }}>{typeof toast === "string" ? toast : (toast as any)?.message ?? ""}</div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 120px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="5" width="16" height="13" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/>
                <path d="M2 9H18" stroke="#FCDC45" strokeWidth="1" opacity="0.5"/>
                <rect x="5" y="7" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/>
                <rect x="9" y="7" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/>
                <rect x="13" y="7" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/>
                <rect x="5" y="11" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/>
                <rect x="9" y="11" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/>
                <rect x="13" y="11" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/>
                <rect x="7" y="14.5" width="6" height="3.5" fill="#FCDC45" rx="0.5"/>
                <path d="M6 5V3H14V5" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Gewerbe-Rendite</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>NOI, Cap-Rate, DSCR und Cashflow für Gewerbeobjekte</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setMode("einfach")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "einfach" ? "#FCDC45" : "transparent", color: mode === "einfach" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Einfach</button>
              <button onClick={() => setMode("erweitert")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "erweitert" ? "#FCDC45" : "transparent", color: mode === "erweitert" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Erweitert</button>
            </div>
            <button onClick={() => {}} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} /> Beispiel
            </button>
            <ExportDropdown onRun={(opts) => { if (opts.json || opts.pdf) handleExportJSON(); }} />
            <label style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }} className={pdfLoading ? "opacity-60 pointer-events-none" : ""}>
              {pdfLoading ? (<><svg className="animate-spin" style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75"/></svg> Wird gelesen…</>) : (<><Upload size={14} /> Import</>)}
              <input type="file" className="hidden" accept=".json,application/json,.pdf,application/pdf" onChange={handleImport} disabled={pdfLoading} />
            </label>
          </div>
        </div>

        {/* Zwei-Spalten */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* LINKS: Eingaben */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Schritt 1: Kaufpreis */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 1 — Kaufpreis & Kosten</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Kaufpreis & Nebenkosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was kostet das Objekt insgesamt?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
                {mode === "erweitert" && <PercentField label="Sonstiges/Puffer" value={nkSonstPct} onChange={setNkSonstPct} />}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Nebenkosten: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(KP * (nkGrEStPct+nkNotarPct+nkGrundbuchPct+nkMaklerPct+nkSonstPct)))}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(KP * (1+nkGrEStPct+nkNotarPct+nkGrundbuchPct+nkMaklerPct+nkSonstPct)))}</strong>
              </div>
            </div>

            {/* Schritt 2: Mietflächen/Zonen */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 2 — Mietflächen & Einnahmen</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Mietflächen & Zonen</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Flächen, Mieten, Leerstand & TI je Zone</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {zonen.map((z, idx) => (
                  <div key={z.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <input value={z.name} onChange={(e) => updateZone(z.id, { name: e.target.value })}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600, outline: "none", flex: 1 }} />
                      {zonen.length > 1 && (
                        <button onClick={() => removeZone(z.id)} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#f87171", fontSize: 11 }}>✕</button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <NumberField label="Fläche (m²)" value={z.areaM2} onChange={(v) => updateZone(z.id, { areaM2: v })} step={10} />
                      <NumberField label="Miete (€/m²/Mo.)" value={z.rentPerM2} onChange={(v) => updateZone(z.id, { rentPerM2: v })} step={0.5} />
                      <PercentField label="Leerstand" value={z.vacancyPct} onChange={(v) => updateZone(z.id, { vacancyPct: v })} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setZonen((prev) => [...prev, { id: uid(), name: `Zone ${prev.length + 1}`, areaM2: 200, rentPerM2: 12, vacancyPct: 0.05, recoverablePct: 0.8, freeRentMonthsY1: 0, tiPerM2: 0, leaseTermYears: 5 }])} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.2)", color: "#FCDC45", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  + Zone hinzufügen
                </button>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Bruttomiete p.a.: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(zonenCalcY1.totalGross))}</strong> · NOI: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(noiY1))}/Jahr</strong>
              </div>
            </div>

            {/* Schritt 3: Opex */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 3 — Betriebskosten & Cap-Rate</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Opex & Markt-Cap-Rate</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Betriebskosten und Marktrendite-Erwartung</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <PercentField label="Nicht-umlagef. Opex (% Bruttomiete)" value={opexTotalPctBrutto} onChange={setOpexTotalPctBrutto} />
                <PercentField label="Instandhaltung (% Bruttomiete)" value={capexRuecklagePctBrutto} onChange={setCapexRuecklagePctBrutto} />
                <PercentField label="Markt-Cap-Rate" value={capRateAssumed} onChange={setCapRateAssumed} step={0.005} help="Renditeerwartung des Marktes – bestimmt den Cap-basierten Wert" />
                {mode === "erweitert" && (
                  <>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Top-3 Mieter Bonität</div>
                      <select value={bonitaetTop3} onChange={e => setBonitaetTop3(e.target.value as any)}
                        style={{ width: "100%", height: 40, borderRadius: 10, padding: "0 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", fontSize: 13, outline: "none" }}>
                        <option value="AAA">AAA – Sehr gut</option>
                        <option value="A">A – Gut</option>
                        <option value="B">B – Mittel</option>
                        <option value="C">C – Schwach</option>
                      </select>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
                      <input type="checkbox" checked={indexiert} onChange={e => setIndexiert(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                      Mietverträge indexiert
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Schritt 4: Finanzierung */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 4 — Finanzierung</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Finanzierung</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Optional — Darlehen, Zinsen, Laufzeit</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", marginBottom: 14 }}>
                <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                Finanzierung einbeziehen
              </label>
              {financingOn && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <PercentField label="Beleihungsquote (LTV)" value={ltvPct} onChange={setLtvPct} />
                  <PercentField label="Zinssatz p.a." value={zinsPct} onChange={setZinsPct} step={0.05} />
                  <NumberField label="Laufzeit (Jahre)" value={laufzeitYears} onChange={setLaufzeitYears} step={1} />
                </div>
              )}
              {financingOn && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(loan))}</strong> · Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(annuityYear))}/Jahr</strong>
                </div>
              )}
            </div>

            {/* Spielwiese */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Was-wäre-wenn Spielwiese</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <style>{`.gew-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.gew-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.gew-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Preis & Miete anpassen</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Wirkt live auf Score</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Kaufpreis anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: priceAdjPct < 0 ? "#4ade80" : priceAdjPct > 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}>{signedPct(priceAdjPct)}</span>
                  </div>
                  <input type="range" min={-0.3} max={0.3} step={0.005} value={priceAdjPct} onChange={(e) => setPriceAdjPct(Number(e.target.value))} className="gew-range" />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}>{signedPct(rentAdjPct)}</span>
                  </div>
                  <input type="range" min={-0.3} max={0.5} step={0.005} value={rentAdjPct} onChange={(e) => setRentAdjPct(Number(e.target.value))} className="gew-range" />
                </div>
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

            {/* Cashflow Aufschlüsselung */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatlicher Cashflow (Jahr 1)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Effektive Nettomiete", value: Math.round(zonenCalcY1.totalEff / 12), positive: true },
                  { label: "Nicht-umlagef. Opex", value: -Math.round(zonenCalcY1.totalEff / 12), positive: false },
                  { label: "Instandhaltung/CapEx", value: -Math.round(zonenCalcY1.totalTI / 12), positive: false },
                  ...(tiUpfront > 0 ? [{ label: "TI (anteilig Y1)", value: -Math.round(tiUpfront / 12), positive: false }] : []),
                  ...(financingOn ? [{ label: "Zins + Tilgung", value: -Math.round(annuityYear / 12), positive: false }] : []),
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.positive ? "#4ade80" : "#f87171" }}>{row.positive ? "+" : ""}{eur(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: cashflowMonatY1 >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, border: `1px solid ${cashflowMonatY1 >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>= Cashflow pro Monat</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: cashflowMonatY1 >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(cashflowMonatY1))}</span>
                </div>
              </div>
            </div>

            {/* Wert & Break-even Kacheln */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Wert (Cap) vs. Kaufpreis</div>
                {[
                  { label: "Kaufpreis", value: KP, color: "#7c3aed" },
                  { label: "Cap-basierter Wert", value: Math.round(wertAusCap), color: "#FCDC45" },
                ].map((row) => (
                  <div key={row.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{eur(row.value)}</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Math.round(row.value / Math.max(KP, wertAusCap) * 100))}%`, background: row.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
                <div style={{ padding: "8px 10px", background: valueGap >= 0 ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)", borderRadius: 8, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Value-Gap</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: valueGap >= 0 ? "#4ade80" : "#f87171" }}>{valueGap >= 0 ? "+" : ""}{eur(valueGap)}</span>
                </div>
              </div>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Kennzahlen</div>
                {[
                  { label: "NOI-Yield", value: pct(noiYield), color: noiYield >= 0.065 ? "#4ade80" : noiYield >= 0.045 ? "#FCDC45" : "#f87171" },
                  { label: "DSCR", value: dscr ? dscr.toFixed(2) : "–", color: dscr && dscr >= 1.3 ? "#4ade80" : dscr && dscr >= 1.2 ? "#FCDC45" : "#f87171" },
                  { label: "Cap-Rate (Objekt)", value: pct(capEff), color: "rgba(255,255,255,0.75)" },
                  { label: "Cap-Spread", value: pct(capSpread), color: capSpread >= 0 ? "#4ade80" : "#f87171" },
                  { label: "NOI p.a.", value: eur(Math.round(noiY1)), color: "rgba(255,255,255,0.75)" },
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
                  <div style={{ fontSize: 20, fontWeight: 700, color: scoreLabel === "BUY" ? "#4ade80" : scoreLabel === "CHECK" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>{decisionLabelText}</div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(cashflowMonatY1)), good: cashflowMonatY1 >= 500, okay: cashflowMonatY1 >= 0 },
                  { label: "NOI-Yield", value: pct(noiYield), good: noiYield >= 0.065, okay: noiYield >= 0.045 },
                  { label: "DSCR", value: dscr ? dscr.toFixed(2) : "–", good: !!dscr && dscr >= 1.3, okay: !!dscr && dscr >= 1.2 },
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
                { term: "NOI-Yield", def: "Betriebsergebnis geteilt durch Kaufpreis. Für Gewerbe Ziel: 6–8%." },
                { term: "Cap-Rate", def: "Marktrendite-Erwartung. NOI / Cap = grober Marktwert." },
                { term: "DSCR", def: "Wie gut die Miete die Kreditrate deckt. Über 1,3 ist für Gewerbe solide." },
                { term: "Value-Gap", def: "Differenz zwischen Cap-basiertem Wert und Kaufpreis." },
                { term: "TI (Tenant Incentives)", def: "Mieterfreibeträge und Ausbauzuschüsse die du als Vermieter trägst." },
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
                    { label: `${eur(Math.round(cashflowMonatY1))} mtl.` },
                    { label: `NOI-Yield ${pct(noiYield)}` },
                    { label: `DSCR ${dscr ? dscr.toFixed(2) : "–"}` },
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
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{decisionLabelText}</div>

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
      <div className="text-sm font-medium mb-2 ">
        Tilgungsplan (exakte Annuität)
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left  border-b">
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
      <p className="text-xs  mt-2">
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
          <div className="text-sm font-medium ">
            Wert (NOI/Cap_eff) vs. Kaufpreis
          </div>
          <div className="text-xs ">
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
      <p className="text-xs  mt-2">
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
      <div className="flex items-center justify-between text-xs ">
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
