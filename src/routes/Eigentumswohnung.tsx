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
// recharts removed
import { eur, pct, type WohnInput } from "../core/calcs";

// ---------------- Types & Theme ----------------

type DecisionLabel = "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";
type Tip = { label: string; detail: string };

const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#ff914d";
const SURFACE = "#0d1117";

// ---------------- Kleine UI-Atoms ----------------

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
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
    <div className={`rounded-2xl ${className}`} style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.88)" }}>{title}</div>
          {subtitle && <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>{subtitle}</div>}
          {description && (
            <p className="text-xs mt-1 max-w-xl leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{description}</p>
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
  // Show formatted with thousand separators when not focused
  const displayValue = focused
    ? String(rawValue)
    : rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5, lineHeight: 1.3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
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
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2 text-xs ">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold mt-1 tabular-nums ">{value}</div>
      {hint && <div className="text-[11px]  mt-0.5">{hint}</div>}
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
    <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="text-sm font-medium ">{term}</div>
      <div className="text-xs ">{def}</div>
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
    <div style={{ position: "relative" }}>
      <button
        style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" /> Export
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 220, background: "#161b22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Formate wählen</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={json}
              onChange={(e) => setJson(e.target.checked)}
            />
            JSON
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={csv}
              onChange={(e) => setCsv(e.target.checked)}
            />
            CSV
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={pdf}
              onChange={(e) => setPdf(e.target.checked)}
            />
            PDF
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button
              style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </button>
            <button
              style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, background: "#FCDC45", color: "#111", fontWeight: 600, border: "none", cursor: "pointer" }}
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
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Spielwiese: Preis &amp; Miete</div>
        <span className="text-[11px] text-gray-500">
          Änderungen wirken live auf Score &amp; Cashflow
        </span>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-xs  mb-1">Kaufpreis-Anpassung</div>
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
          <div className="text-xs  mb-1">Miete-Anpassung</div>
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
        "Wohnungs-Rendite – Kurzreport",
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
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 120px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M3 9L10 3L17 9V17H13V13H7V17H3V9Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="10" cy="11" r="1.5" fill="#FCDC45"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0, lineHeight: 1.2 }}>Wohnungs-Rendite</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>Gib Kaufpreis, Miete und Finanzierung ein – du siehst sofort ob sich die Wohnung lohnt</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was kostet dich der Kauf insgesamt?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)", letterSpacing: "0.06em" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                <NumberField label="Wohnfläche (m²)" value={flaecheM2} onChange={setFlaecheM2} />
                <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Nebenkosten: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(allIn - kaufpreis))}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(allIn))}</strong>
              </div>
            </div>

            {/* Schritt 2: Miete */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 2 — Miete & laufende Kosten</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Miete & laufende Kosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Wie viel Miete bringt die Wohnung?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)", letterSpacing: "0.06em" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <NumberField label="Kaltmiete (€/m²/Monat)" value={mieteProM2Monat} onChange={setMieteProM2Monat} step={0.1} />
                <PercentField label="Leerstand & Ausfall" value={leerstandPct} onChange={setLeerstandPct} />
                <PercentField label="Nicht-umlagef. Kosten (% Bruttomiete)" value={opexPctBrutto} onChange={setOpexPctBrutto} />
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Bruttomiete p.a.: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(flaecheM2 * mieteProM2Monat * 12))}</strong> · Effektivmiete: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(monthlyEffRent * 12))}/Jahr</strong>
              </div>
            </div>

            {/* Schritt 3: Finanzierung */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 3 — Finanzierung</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Finanzierung</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Optional — wie finanzierst du den Kauf?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)", letterSpacing: "0.06em" }}>EINGABE</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", marginBottom: 14 }}>
                <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                Finanzierung einbeziehen
              </label>
              {financingOn && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <PercentField label="Eigenkapital-Quote (LTV)" value={ltvPct} onChange={setLtvPct} />
                  <PercentField label="Zinssatz p.a." value={zinsPct} onChange={setZinsPct} step={0.05} />
                  <PercentField label="Tilgung p.a." value={tilgungPct} onChange={setTilgungPct} step={0.05} />
                </div>
              )}
              {financingOn && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(loan))}</strong> · Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(annuitaetJahr))}/Jahr</strong> ({eur(Math.round(annuitaetMonat))}/Monat)
                </div>
              )}
            </div>

            {/* Spielwiese */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Was-wäre-wenn Spielwiese</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <style>{`.etw-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.etw-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.etw-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none;cursor:pointer}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Preis & Miete anpassen</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Änderungen wirken live auf Score</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Kaufpreis anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: priceAdjPct < 0 ? "#4ade80" : priceAdjPct > 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}>{signedPct(priceAdjPct)}</span>
                  </div>
                  <input type="range" min={-0.3} max={0.3} step={0.005} value={priceAdjPct} onChange={(e) => setPriceAdjPct(Number(e.target.value))} className="etw-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+30%</span></div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}>{signedPct(rentAdjPct)}</span>
                  </div>
                  <input type="range" min={-0.3} max={0.5} step={0.005} value={rentAdjPct} onChange={(e) => setRentAdjPct(Number(e.target.value))} className="etw-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+50%</span></div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                  Anpassungen in Bewertung berücksichtigen
                </label>
              </div>
            </div>

            {/* Details */}
            <DetailsSection
              noiYield={noiYield}
              dscr={dscr}
              annuitaetMonat={annuitaetMonat}
              allIn={allIn}
              noi={noi}
              annuitaetJahr={annuitaetJahr}
              monthlyCF={monthlyCF}
              monthlyEffRent={monthlyEffRent}
              monthlyOpex={monthlyOpex}
              bePrice={bePrice}
              beRentPerM2={beRentPerM2}
              capRatePct={capRatePct}
              noiCapValue={wertNOI}
              projection={projection}
            />
          </div>

          {/* RECHTS: Ergebnis sticky */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Score & Entscheidung */}
            <div style={{ borderRadius: 16, padding: 20, background: "linear-gradient(135deg, rgba(15,44,138,0.85) 0%, rgba(124,58,237,0.65) 100%)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Dein Ergebnis (live)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={decisionColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round"/>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(monthlyCF)), good: monthlyCF >= 100, okay: monthlyCF >= 0 },
                  { label: "Rendite (NOI)", value: pct(noiYield), good: noiYield >= 0.05, okay: noiYield >= 0.035 },
                  { label: "Schuldendeckung", value: Number.isFinite(dscr) ? dscr.toFixed(2) : "–", good: Number.isFinite(dscr) && dscr >= 1.2, okay: Number.isFinite(dscr) && dscr >= 1.0 },
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
                <div style={{ height: "100%", width: `${scorePct}%`, background: decisionColor, borderRadius: 2 }} />
              </div>
            </div>

            {/* Tipps */}
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

      {/* Sticky Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 12px" }}>
          <div style={{ background: "rgba(13,17,23,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, backdropFilter: "blur(20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Ergebnis (live)</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>
                  {decisionLabel === "RENTABEL" ? "Kaufen" : decisionLabel === "GRENZWERTIG" ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  {[
                    { label: `${eur(Math.round(monthlyCF))} mtl.` },
                    { label: `Rendite ${pct(noiYield)}` },
                    { label: `DSCR ${Number.isFinite(dscr) ? dscr.toFixed(2) : "–"}` },
                  ].map((b) => (
                    <span key={b.label} style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 20, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{b.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", width: 50, height: 50, flexShrink: 0 }}>
                <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
                  <circle cx="25" cy="25" r="20" fill="none" stroke={decisionColor} strokeWidth="5"
                    strokeDasharray={`${Math.round(125.6 * scorePct / 100)} 125.6`} strokeLinecap="round"/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{scorePct}%</span>
                </div>
              </div>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(4, scorePct)}%`, background: decisionColor }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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

function DetailsSection({
  noiYield, dscr, annuitaetMonat, allIn, noi, annuitaetJahr,
  monthlyCF, monthlyEffRent, monthlyOpex, bePrice, beRentPerM2,
  capRatePct, noiCapValue, projection,
}: {
  noiYield: number; dscr: number; annuitaetMonat: number; allIn: number;
  noi: number; annuitaetJahr: number; monthlyCF: number;
  monthlyEffRent: number; monthlyOpex: number;
  bePrice: number | null; beRentPerM2: number | null;
  capRatePct: number; noiCapValue: number;
  projection: { year: number; noi: number; cf: number }[];
}) {
  const C = {
    card: { background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 } as React.CSSProperties,
    sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" } as React.CSSProperties,
    divider: { flex: 1, height: 1, background: "rgba(255,255,255,0.06)" } as React.CSSProperties,
  };
  const lastProj = projection[projection.length - 1];
  const annuitaetMonatCalc = annuitaetMonat;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Detailberechnungen</span>
        <div style={C.divider} />
      </div>

      {/* Monatliche Aufschlüsselung */}
      <div style={C.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatliche Cashflow-Aufschlüsselung</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Effektive Nettokaltmiete", value: Math.round(monthlyEffRent), positive: true },
            { label: "Laufende Kosten (nicht umlagef.)", value: -Math.round(monthlyOpex), positive: false },
            { label: "Zins + Tilgung", value: -Math.round(annuitaetMonatCalc), positive: false },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: row.positive ? "#4ade80" : "#f87171" }}>{row.positive ? "+" : ""}{eur(row.value)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: monthlyCF >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, border: `1px solid ${monthlyCF >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, marginTop: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>= Cashflow pro Monat</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: monthlyCF >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(monthlyCF))}</span>
          </div>
        </div>
      </div>

      {/* Break-even & Wert */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Wert & Break-even</span>
        <div style={C.divider} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Wert (NOI/Cap) vs. Kaufpreis</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "All-in Kaufpreis", value: Math.round(allIn), color: "#7c3aed" },
              { label: "Wert nach Cap-Rate", value: Math.round(noiCapValue), color: "#FCDC45" },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{eur(row.value)}</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round(row.value / Math.max(allIn, noiCapValue) * 100))}%`, background: row.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
            <div style={{ padding: "8px 10px", background: noiCapValue >= allIn ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)", borderRadius: 8, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Wert-Differenz</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: noiCapValue >= allIn ? "#4ade80" : "#f87171" }}>{eur(Math.round(noiCapValue - allIn))}</span>
            </div>
          </div>
        </div>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Break-even Szenarien</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "12px 14px", background: "rgba(252,220,69,0.05)", borderRadius: 10, border: "1px solid rgba(252,220,69,0.12)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Break-even Kaufpreis</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#FCDC45" }}>{bePrice ? eur(bePrice) : "–"}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Unter diesem Preis wäre CF positiv</div>
            </div>
            <div style={{ padding: "12px 14px", background: "rgba(124,58,237,0.05)", borderRadius: 10, border: "1px solid rgba(124,58,237,0.15)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Mindest-Miete für CF = 0</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>{beRentPerM2 ? `${beRentPerM2.toFixed(2)} €/m²` : "–"}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Über dieser Miete läuft die Wohnung</div>
            </div>
          </div>
        </div>
      </div>

      {/* 10J Projektion */}
      <div style={C.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>10-Jahres-Projektion</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "NOI Jahr 10", value: lastProj ? eur(Math.round(lastProj.noi)) : "–", color: "#FCDC45", sub: "p.a." },
            { label: "Cashflow Jahr 10", value: lastProj ? eur(Math.round(lastProj.cf)) : "–", color: lastProj && lastProj.cf >= 0 ? "#4ade80" : "#f87171", sub: "p.a." },
            { label: "CF-Entwicklung", value: lastProj ? `${lastProj.cf - (projection[0]?.cf ?? 0) >= 0 ? "+" : ""}${eur(Math.round(lastProj.cf - (projection[0]?.cf ?? 0)))}` : "–", color: lastProj && lastProj.cf >= (projection[0]?.cf ?? 0) ? "#4ade80" : "#f87171", sub: "über 10 Jahre" },
          ].map((k) => (
            <div key={k.label} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
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
