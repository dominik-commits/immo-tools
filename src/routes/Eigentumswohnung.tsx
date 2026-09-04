// src/routes/Eigentumswohnung.tsx
// Eigentumswohnung-Check – UX-Refresh angelehnt an Mehrfamilienhaus-Check
// - 2-Spalten-Layout mit rechter, sticky Glossar-Sidebar
// - Eingaben in gelb hinterlegten "InputCards" mit EINGABE-Badge
// - Zwischenstand: Ampel-Box mit Score, Cashflow, Begründung & schnellen Hebeln
// - Spielwiese direkt unter Zwischenstand
// - Details: Wert vs. Kaufpreis, Projektion, Monatsrechnung & NK-Details

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Home as HomeIcon,
  RefreshCw,
  Upload,
  FileText,
  Chrome,
  Download,
  Info,
  Gauge,
  TrendingUp,
  Banknote,
  ChevronDown,
  Sparkles,
  ArrowRight as ArrowRight2,
  ArrowLeft as ArrowLeft2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { eur, pct, type WohnInput } from "../core/calcs";
import { buildProjection10y, type EtwProInput } from "../core/etwCalc";
import { OnboardingWizard } from "../components/OnboardingWizard";
import { SaveToPortfolioButton } from "../components/SaveToPortfolioButton";
import { ProGate } from "../components/ProGate";
import { downloadPdfExport } from "../utils/downloadPdfExport";
import { StandortPanel } from "../components/StandortPanel";
import { useUserPlan, isPro, type UserPlan } from "../hooks/useUserPlan";
import { useEtwProAnalysis } from "../hooks/useEtwProAnalysis";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useEtwUsage } from "../hooks/useEtwUsage";
import { useUrlPrefill } from "../hooks/useUrlPrefill";
import { trackFirstAnalysisCompleted } from "../hooks/useTrackingEvents";
import html2canvas from "html2canvas";
import { Share2 } from "lucide-react";
import { MapPin } from "lucide-react";

// ---------------- Types & Theme ----------------

type DecisionLabel = "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";
type ViewMode = "einfach" | "erweitert";

// Richtwert Bauzinsen -- KEIN Live-Feed (keine zuverlässige kostenlose API ohne Key gefunden),
// sondern manuell zu pflegender Referenzwert. Bei Aktualisierung: Wert + Stand-Monat anpassen.
const MARKT_ZINS_RICHTWERT = 0.036;
const MARKT_ZINS_STAND = "Jan. 2026";
type Tip = { label: string; detail: string };

const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#ff914d";
const SURFACE = "#0d1117";

// Generische Beispieltexte für den geblurrten ProGate-Platzhalter (Free-User).
// Bewusst ohne Bezug zu den echten Eingaben des Nutzers -- nur Illustration.
const PLACEHOLDER_ANALYSIS_SENTENCES = [
  "Der Kaufpreis liegt nah am Wert, den die Wohnung nach ihrer Mietrendite eigentlich hätte.",
  "Dadurch bleiben dir aktuell rund 120 € im Monat übrig.",
];
const PLACEHOLDER_MARKET_COMPARISON =
  "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Ballungsraum-Wohnungen (ca. 3,5–5 %).";
const PLACEHOLDER_PROJECTION_10Y = Array.from({ length: 10 }, (_, i) => ({
  year: i + 1,
  noi: 8000 + i * 150,
  cf: 1200 + i * 80,
}));
const PLACEHOLDER_ETF = { eigenkapital: 100_000, etfWert10y: 196_715, immoWert10y: 118_000, etfDelta: -78_715 };
const PLACEHOLDER_SCORE_BREAKDOWN = { noiYieldScore: 0.62, dscrScore: 0.71, weights: { noiYield: 0.55, dscr: 0.45 } };

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

/** Animiert einen sich ändernden Wert mit einem kurzen Pop-In — macht "live" spürbar. */
function AnimatedValue({
  value,
  style,
}: {
  value: string;
  style?: React.CSSProperties;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6, filter: "blur(2px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ display: "inline-block", ...style }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

/** Animiert eine Zahl beim Ändern sanft hoch/runter zum Zielwert (statt hartem Sprung). */
function useCountUp(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const from = fromRef.current;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return display;
}

/** Kurzer Partikel-Ausbruch, z.B. wenn das Ergebnis auf "Rentabel" kippt. Entfernt sich selbst. */
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  const dots = React.useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 55 + Math.random() * 35;
        const colors = ["#4ade80", "#FCDC45", "#60a5fa", "#f472b6"];
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          color: colors[i % colors.length],
          size: 4 + Math.random() * 4,
        };
      }),
    []
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {dots.map((d) => (
        <motion.span
          key={d.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: d.x, y: d.y, opacity: 0, scale: 1 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          style={{
            position: "absolute", left: "50%", top: "50%", width: d.size, height: d.size,
            borderRadius: "50%", background: d.color, marginLeft: -d.size / 2, marginTop: -d.size / 2,
          }}
        />
      ))}
    </div>
  );
}

/** Gestaffelte Eingangsanimation fuer Sidebar-Karten (fade + slide-up, versetzt nach index) */
function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.09, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Geführte Kurz-Tour: Spotlight auf ein Element + Tooltip. Nutzergesteuert (Button), kein Auto-Popup. */
function TourOverlay({
  targetRef, step, total, title, text, onNext, onSkip,
}: {
  targetRef: React.RefObject<HTMLElement>;
  step: number;
  total: number;
  title: string;
  text: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    function measure() {
      if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [targetRef, step]);
  if (!rect) return null;
  const pad = 8;
  const tooltipTop = rect.bottom + 14;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div
        style={{
          position: "fixed",
          top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
          borderRadius: 14, border: "2px solid #FCDC45",
          boxShadow: "0 0 0 9999px rgba(5,8,14,0.8)",
          pointerEvents: "none", transition: "all 0.25s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed", top: Math.min(tooltipTop, window.innerHeight - 160), left: Math.max(16, Math.min(rect.left, window.innerWidth - 316)),
          width: 300, background: "#161b22", border: "1px solid rgba(252,220,69,0.3)", borderRadius: 14, padding: 16,
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: "#FCDC45", letterSpacing: "0.06em", marginBottom: 6 }}>SCHRITT {step + 1}/{total}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 14 }}>{text}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", padding: 0 }}>Tour beenden</button>
          <button onClick={onNext} style={{ background: "#FCDC45", border: "none", borderRadius: 8, padding: "7px 14px", color: "#0d1117", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {step + 1 < total ? "Weiter" : "Fertig"}
          </button>
        </div>
      </div>
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
  const [draft, setDraft] = React.useState<string | null>(null);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

  const formattedValue = rawValue.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // When focused: show draft (empty string initially), else show formatted number
  const displayVal = focused ? (draft ?? "") : formattedValue;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5, lineHeight: 1.3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${focused ? "rgba(252,220,69,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: "rgba(255,255,255,0.88)",
            height: 40,
            boxSizing: "border-box",
          }}
          type="text"
          inputMode="decimal"
          value={displayVal}
          placeholder={focused ? formattedValue : (placeholder ?? "")}
          onFocus={() => {
            setFocused(true);
            setDraft(""); // leert das Feld; alter Wert wird grauer Placeholder
          }}
          onBlur={() => {
            setFocused(false);
            if (draft !== null && draft.trim() !== "") {
              const parsed = parseFloat(draft.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(parsed)) onChange(parsed);
            }
            setDraft(null);
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            if (raw.trim() !== "") {
              const parsed = parseFloat(raw.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(parsed)) onChange(parsed);
            }
          }}
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
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(((value ?? 0) * 100).toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type="text"
          inputMode="decimal"
          value={displayVal}
          placeholder={focused ? formattedValue : ""}
          onFocus={() => { setFocused(true); setDraft(""); }}
          onBlur={() => {
            setFocused(false);
            if (draft !== null && draft.trim() !== "") {
              const p = parseFloat(draft.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(p)) onChange(p / 100);
            }
            setDraft(null);
          }}
          onChange={(e) => {
            const r = e.target.value;
            setDraft(r);
            if (r.trim() !== "") {
              const p = parseFloat(r.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(p)) onChange(p / 100);
            }
          }}
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
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Formate wählen</div>
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
  const { user: clerkUser } = useUser();
  const { plan } = useUserPlan();
  const isFreeUser = plan === "free";
  const { isLimitReached, remaining, trackKaufpreis, MONTHLY_LIMIT } = useEtwUsage(isFreeUser);
  const prefill = useUrlPrefill();
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const investorName = clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || "Propora-Nutzer";
  const isFreePlan = plan === "free" || (!plan);
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

  const MODE_KEY = "etw.mode.v1";
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const raw = localStorage.getItem(MODE_KEY);
      return raw === "erweitert" ? "erweitert" : "einfach";
    } catch { return "einfach"; }
  });
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);

  // Eingabe-Schritte als Tabs (frei wechselbar, Ergebnis bleibt immer live sichtbar)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // 3D-Tilt-Effekt auf der Ergebnis-Karte bei Mausbewegung
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  };
  const handleCardMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Teilbare Ergebnis-Karte (Bild-Export)
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  async function shareResult() {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, { scale: 2, backgroundColor: "#0a1628" });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const file = new File([blob], "propora-ergebnis.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "PROPORA Analyse" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "propora-ergebnis.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // still fine -- user simply doesn't get the export, no need to alert loudly
    } finally {
      setSharing(false);
    }
  }

  // Prefill aus URL-Parametern (Chrome Extension Import)
  useEffect(() => {
    if (!prefill.hasPrefill) return;
    if (prefill.kaufpreis) setKaufpreis(prefill.kaufpreis);
    if (prefill.flaeche)   setFlaecheM2(prefill.flaeche);
    if (prefill.kaltmiete && prefill.flaeche)
      setMieteProM2Monat(Math.round((prefill.kaltmiete / prefill.flaeche) * 100) / 100);
    if (prefill.plz)       setPlz(prefill.plz);
    if (prefill.adresse)   setAdresse(prefill.adresse);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [adresse, setAdresse] = useState(() => prefill.adresse ?? "");
  const [plz, setPlz] = useState(() => prefill.plz ?? "");

  // Adress-Autovervollständigung (OpenStreetMap Nominatim, kein API-Key nötig)
  type AddressSuggestion = { label: string; postcode: string; lat: string; lon: string };
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: string; lon: string } | null>(null);

  // Geführte Kurz-Tour (nutzergesteuert, ergänzt den bestehenden OnboardingWizard)
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourTabsRef = useRef<HTMLDivElement>(null);
  const tourScoreRef = useRef<HTMLDivElement>(null);
  const tourSpielwieseRef = useRef<HTMLDivElement>(null);
  const tourShareRef = useRef<HTMLButtonElement>(null);
  const tourSteps = [
    { ref: tourTabsRef, title: "Deine Eingaben", text: "Kaufpreis, Miete und Finanzierung sind Tabs — du kannst frei zwischen ihnen wechseln, ohne zu scrollen." },
    { ref: tourScoreRef, title: "Dein Ergebnis, live", text: "Score und Empfehlung aktualisieren sich sofort bei jeder Eingabe, egal in welchem Tab du gerade bist." },
    { ref: tourSpielwieseRef, title: "Spielwiese", text: "Zieh die Regler oder klick eine Schnellauswahl, um Was-wäre-wenn-Szenarien durchzuspielen — ohne deine echten Werte zu verändern." },
    { ref: tourShareRef, title: "Ergebnis teilen", text: "Ein Klick erstellt eine Bild-Karte deines Ergebnisses zum Teilen oder Speichern." },
  ] as const;
  const addressBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (adresse.trim().length < 5) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    setSuggestLoading(true);
    const t = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=de&limit=5&q=${encodeURIComponent(adresse)}`,
        { signal: controller.signal }
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) => {
          const suggestions: AddressSuggestion[] = (data || [])
            .filter((d) => d?.address?.postcode)
            .map((d) => {
              const a = d.address;
              const street = [a.road, a.house_number].filter(Boolean).join(" ");
              const city = a.city || a.town || a.village || a.municipality || "";
              return { label: [street, city].filter(Boolean).join(", "), postcode: a.postcode as string, lat: d.lat, lon: d.lon };
            });
          // Duplikate raus
          const seen = new Set<string>();
          setAddressSuggestions(suggestions.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true))));
        })
        .catch(() => {})
        .finally(() => setSuggestLoading(false));
    }, 500);
    return () => { clearTimeout(t); controller.abort(); };
  }, [adresse]);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [kaufpreis, setKaufpreis] = useState(() => prefill.kaufpreis ?? 350_000);
  useEffect(() => { trackKaufpreis(kaufpreis); }, [kaufpreis, trackKaufpreis]);
  const [flaecheM2, setFlaecheM2] = useState(() => prefill.flaeche ?? 70);
  const [mieteProM2Monat, setMieteProM2Monat] = useState(() => {
    if (prefill.kaltmiete && prefill.flaeche) {
      return Math.round((prefill.kaltmiete / prefill.flaeche) * 100) / 100;
    }
    return 12;
  });
  const [leerstandPct, setLeerstandPct] = useState(0.03);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const { getToken } = useAuth();

  // laufende Kosten (nicht umlagefähig, Instandhaltung, Verwaltung …) als % der Bruttomiete
  const [opexPctBrutto, setOpexPctBrutto] = useState(0.25);
  const [instandhaltungPct, setInstandhaltungPct] = useState(0.01);

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
  const [ltvPct, setLtvPct] = useState(0.3); // Beleihung / FK-Quote
  const [zinsPct, setZinsPct] = useState(0.035);
  const [tilgungPct, setTilgungPct] = useState(0.02);

  // Erkennt unverändertes Demo-Beispiel (für sanfteren Ersteindruck)
  const isExample = !adresse && kaufpreis === 350_000 && flaecheM2 === 70 && mieteProM2Monat === 12;

  // Activation-Funnel: feuert, sobald der Nutzer eine eigene Analyse macht (weg vom Beispielobjekt)
  useEffect(() => {
    if (!isExample) trackFirstAnalysisCompleted("etw");
  }, [isExample]);

  const [objectSaved, setObjectSaved] = useState(false);

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

  // Free: nur Jahr 1-2 lokal sichtbar. Die volle 10-Jahres-Projektion ist PRO
  // und kommt ausschließlich über useEtwProAnalysis vom Server (siehe unten) --
  // sie wird hier bewusst nicht mehr für alle Nutzer berechnet/gehalten.
  const projectionPreview = useMemo(
    () =>
      buildProjection10y({
        years: 2,
        effRentY1: effRentYear,
        opex0: opexYear,
        rentGrowth: mietSteigerung,
        costGrowth: kostenSteigerung,
        annuitaetJahr,
      }),
    [effRentYear, opexYear, mietSteigerung, kostenSteigerung, annuitaetJahr]
  );

  const wertNOI = capRatePct > 0 ? noi / capRatePct : 0;

  // "Schlägt diese Wohnung eine ETF-Anlage?" -- Eigenkapital wird an DetailsSection durchgereicht
  const eigenkapital = Math.max(0, allIn - loan);

  // Break-even
  const breakEvenBase = {
    kaufpreis: allIn,
    flaecheM2,
    mieteProM2Monat,
    leerstandPct,
    opexPctBrutto,
    financingOn,
    ltvPct,
    zinsPct,
    tilgungPct,
  };
  const bePrice = breakEvenPriceForCashflowZero(breakEvenBase as any);
  const beRentPerM2 = breakEvenRentPerM2ForCashflowZero(breakEvenBase as any);

  // PRO: Score-Breakdown, Handlungsempfehlung, volle 10J-Projektion & ETF-Vergleich
  // kommen ausschließlich vom Server (siehe /api/analyze/pro, type: "etw") -- für Free-User
  // wird dieser Call gar nicht erst ausgelöst (useEtwProAnalysis prüft isPro intern).
  const etwProInput: EtwProInput = useMemo(
    () => ({
      noiYield,
      dscr,
      allIn,
      wertNOI,
      monthlyCF,
      financingOn,
      loan,
      ltvPct,
      bePrice: bePrice ?? null,
      beRentPerM2,
      mieteProM2Monat,
      effRentYear,
      opexYear,
      mietSteigerung,
      kostenSteigerung,
      annuitaetJahr,
      eigenkapital,
    }),
    [noiYield, dscr, allIn, wertNOI, monthlyCF, financingOn, loan, ltvPct, bePrice, beRentPerM2, mieteProM2Monat, effRentYear, opexYear, mietSteigerung, kostenSteigerung, annuitaetJahr, eigenkapital]
  );
  const { data: etwPro, loading: etwProLoading } = useEtwProAnalysis(etwProInput, plan);

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

  // Score-Ring zaehlt sanft zum Zielwert hoch, statt hart zu springen
  const displayScorePct = useCountUp(scorePct);

  // Konfetti, wenn das Ergebnis frisch auf "Rentabel" kippt (nicht beim allerersten Render)
  const [showConfetti, setShowConfetti] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const prevDecisionRef = useRef<DecisionLabel | null>(null);
  useEffect(() => {
    if (prevDecisionRef.current !== null && prevDecisionRef.current !== "RENTABEL" && decisionLabel === "RENTABEL") {
      setShowConfetti(true);
    }
    prevDecisionRef.current = decisionLabel;
  }, [decisionLabel]);

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

  // Vollständige Analyse (mehrsätzige Handlungsempfehlung) + Markteinordnung sind PRO
  // und kommen aus etwPro (siehe useEtwProAnalysis oben) statt hier lokal berechnet zu werden.
  const analysisSentences = etwPro?.analysisSentences ?? [];
  const marketComparison = etwPro?.marketComparison ?? "";

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
      <OnboardingWizard analyzer="etw" onClose={() => setTourStep(0)} />
      {tourStep !== null && (
        <TourOverlay
          targetRef={tourSteps[tourStep].ref}
          step={tourStep}
          total={tourSteps.length}
          title={tourSteps[tourStep].title}
          text={tourSteps[tourStep].text}
          onNext={() => setTourStep((s) => (s !== null && s + 1 < tourSteps.length ? s + 1 : null))}
          onSkip={() => setTourStep(null)}
        />
      )}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 120px" }}>
        {prefill.hasPrefill && (
          <div style={{ background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span>
              Daten aus{" "}
              <strong style={{ color: "#FCDC45" }}>
                {prefill.source === "is24" ? "ImmobilienScout24"
                  : prefill.source === "immowelt" ? "Immowelt"
                  : prefill.source === "immonet" ? "ImmoNet"
                  : prefill.source === "kleinanzeigen" ? "Kleinanzeigen"
                  : "Exposé"}
              </strong>{" "}
              importiert – Felder wurden vorausgefüllt.{" "}
              {prefill.exposeUrl && (
                <a href={prefill.exposeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#FCDC45", textDecoration: "underline" }}>
                  Exposé ansehen
                </a>
              )}
            </span>
          </div>
        )}
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
            {/* Mode Toggle */}
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setMode("einfach")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "einfach" ? "#FCDC45" : "transparent", color: mode === "einfach" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>
                Einfach
              </button>
              <button onClick={() => setMode("erweitert")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "erweitert" ? "#FCDC45" : "transparent", color: mode === "erweitert" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>
                Erweitert
              </button>
            </div>
            <button onClick={resetBeispiel} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} /> Beispiel
            </button>
            <button onClick={() => setTourStep(0)} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", color: "#FCDC45", display: "inline-flex", alignItems: "center", gap: 6 }}>
              🗺️ Tour
            </button>
            <ExportDropdown onRun={runExport} />
            {isPro(plan) && (
              <button
                disabled={pdfExporting}
                onClick={async () => {
                  setPdfExporting(true);
                  try {
                    await downloadPdfExport("etw", { investorName, adresse, kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto, nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct, nkRenovierung, nkSanierung, financingOn, ltvPct, zinsPct, tilgungPct, allIn, noi, annuitaetJahr, annuitaetMonat, monthlyCF, noiYield, dscr, loan, scorePct, decisionLabel, decisionText, bePrice: bePrice ?? null, beRentPerM2: beRentPerM2 ?? null, projection: (etwPro?.projectionFull ?? []).map(p => ({ year: p.year, noi: p.noi ?? 0, cf: p.cf ?? 0 })) }, getToken);
                  } catch {
                    alert("PDF-Export fehlgeschlagen. Bitte später erneut versuchen.");
                  } finally {
                    setPdfExporting(false);
                  }
                }}
                style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: pdfExporting ? "wait" : "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6, opacity: pdfExporting ? 0.6 : 1 }}
              >
                <FileText size={14} /> {pdfExporting ? "Wird erstellt…" : "Bankbericht"}
              </button>
            )}
            <SaveToPortfolioButton name={adresse || "ETW"} analyzerType="etw" adresse={adresse} kaufpreis={kaufpreis} data={{ scorePct, noi, dscr, monthlyCF }} onSaved={() => setObjectSaved(true)} />
            <label style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }} className={pdfLoading ? "opacity-60 pointer-events-none" : ""}>
              {pdfLoading ? (<><svg className="animate-spin" style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75"/></svg> Wird gelesen…</>) : (<><Upload size={14} /> Import</>)}
              <input type="file" className="hidden" accept=".json,application/json,.pdf,application/pdf" onChange={handleImport} disabled={pdfLoading} />
            </label>
          </div>
        </div>

        {isFreeUser && isLimitReached && (
          <div style={{ marginBottom: 20, padding: "20px 24px", borderRadius: 16, background: "rgba(252,220,69,0.06)", border: "1px solid rgba(252,220,69,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FCDC45", marginBottom: 4 }}>Monatslimit erreicht</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Du hast deine {MONTHLY_LIMIT} kostenlosen Analysen diesen Monat aufgebraucht. Upgrade für unbegrenzte Nutzung.</div>
            </div>
            <a href="/upgrade?required=basis&from=Wohnungs-Rendite" style={{ flexShrink: 0, padding: "10px 20px", borderRadius: 10, background: "#FCDC45", color: "#0d1117", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Jetzt upgraden</a>
          </div>
        )}
        {isFreeUser && !isLimitReached && remaining <= 3 && (
          <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
            Noch {remaining} von {MONTHLY_LIMIT} kostenlosen Analysen diesen Monat übrig.
          </div>
        )}
        {/* Zwei-Spalten */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start", opacity: (isFreeUser && isLimitReached) ? 0.4 : 1, pointerEvents: (isFreeUser && isLimitReached) ? "none" : "auto" }}>

          {/* LINKS: Eingaben */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Schritt-Tabs: frei wechselbar, Ergebnis rechts bleibt immer live */}
            <div ref={tourTabsRef} style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 5 }}>
              {[
                { n: 1 as const, label: "Kaufpreis & Kosten" },
                { n: 2 as const, label: "Miete & Kosten" },
                { n: 3 as const, label: "Finanzierung" },
              ].map((s) => (
                <button
                  key={s.n}
                  onClick={() => setActiveStep(s.n)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, transition: "all 0.15s",
                    background: activeStep === s.n ? "#FCDC45" : "transparent",
                    color: activeStep === s.n ? "#0d1117" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 18, height: 18, borderRadius: "50%", fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                    background: activeStep === s.n ? "rgba(13,17,23,0.15)" : "rgba(255,255,255,0.08)",
                  }}>{s.n}</span>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Schritt 1: Kaufpreis */}
            {activeStep === 1 && (<>
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
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10, marginBottom: 12 }}>
                <div ref={addressBoxRef} style={{ position: "relative" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Objektbezeichnung / Adresse</div>
                  <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                    type="text" placeholder="z.B. Musterstra&#xDF;e 12, Berlin"
                    value={adresse}
                    onChange={(e) => { setAdresse(e.target.value); setShowSuggestions(true); setSelectedCoords(null); }}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                  />
                  {showSuggestions && (suggestLoading || addressSuggestions.length > 0) && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                      {suggestLoading && (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Suche…</div>
                      )}
                      {!suggestLoading && addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setAdresse(s.label);
                            setPlz(s.postcode);
                            setSelectedCoords({ lat: s.lat, lon: s.lon });
                            setShowSuggestions(false);
                          }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}
                        >
                          <MapPin size={11} style={{ display: "inline", marginRight: 6, verticalAlign: -1, color: "#FCDC45" }} />
                          {s.label} <span style={{ color: "rgba(255,255,255,0.35)" }}>· {s.postcode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>PLZ</div>
                  <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                    type="text" inputMode="numeric" maxLength={5} placeholder="10115"
                    value={plz} onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <StandortPanel plz={plz} />
              </div>
              {selectedCoords && (
                <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <iframe
                    title="Standort-Karte"
                    width="100%"
                    height="160"
                    style={{ border: 0, display: "block", filter: "grayscale(0.15) contrast(1.05)" }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(parseFloat(selectedCoords.lon) - 0.006).toFixed(5)}%2C${(parseFloat(selectedCoords.lat) - 0.004).toFixed(5)}%2C${(parseFloat(selectedCoords.lon) + 0.006).toFixed(5)}%2C${(parseFloat(selectedCoords.lat) + 0.004).toFixed(5)}&layer=mapnik&marker=${selectedCoords.lat}%2C${selectedCoords.lon}`}
                  />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                <NumberField label="Wohnfläche (m²)" value={flaecheM2} onChange={setFlaecheM2} />
              </div>
              {mode === "einfach" ? (
                <div style={{ marginTop: 12 }}>
                  <PercentField
                    label="Nebenkosten gesamt"
                    help="Grunderwerbsteuer, Notar, Grundbuch & Makler zusammen."
                    value={nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct}
                    onChange={(next) => {
                      const current = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct;
                      const scale = current > 0 ? next / current : 0;
                      if (current > 0) {
                        setNkGrEStPct(nkGrEStPct * scale);
                        setNkNotarPct(nkNotarPct * scale);
                        setNkGrundbuchPct(nkGrundbuchPct * scale);
                        setNkMaklerPct(nkMaklerPct * scale);
                      } else {
                        // Kein Referenzverhältnis vorhanden -> auf Grunderwerbsteuer buchen
                        setNkGrEStPct(next);
                      }
                    }}
                  />
                  <button
                    onClick={() => setMode("erweitert")}
                    style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#FCDC45", fontWeight: 600, width: "100%", textAlign: "left" }}
                  >
                    <ChevronDown size={16} style={{ flexShrink: 0 }} />
                    Einzelposten aufschlüsseln (Steuer, Notar, Grundbuch, Makler)
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                  <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                  <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                  <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
                </div>
              )}
              {mode === "erweitert" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                  <PercentField label="Sonstiges / Puffer" value={nkSonstPct} onChange={setNkSonstPct} />
                  <NumberField label="Renovierung einmalig (€)" value={nkRenovierung} onChange={setNkRenovierung} step={500} />
                  <NumberField label="Sanierung einmalig (€)" value={nkSanierung} onChange={setNkSanierung} step={1000} />
                </div>
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Nebenkosten: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(allIn - kaufpreis))}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(allIn))}</strong>
              </div>
            </div>
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
              Weiter zu Miete & Kosten <ArrowRight2 size={15} />
            </button>
            </>)}

            {/* Schritt 2: Miete */}
            {activeStep === 2 && (<>
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
                {mode === "erweitert" && (
                  <PercentField label="Instandhaltungsrücklage (% Miete)" value={instandhaltungPct} onChange={setInstandhaltungPct} step={0.005} />
                )}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Bruttomiete p.a.: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(flaecheM2 * mieteProM2Monat * 12))}</strong> · Effektivmiete: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(monthlyEffRent * 12))}/Jahr</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(1)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                <ArrowLeft2 size={14} /> Zurück
              </button>
              <button onClick={() => setActiveStep(3)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Finanzierung <ArrowRight2 size={15} />
              </button>
            </div>
            </>)}

            {/* Schritt 3: Finanzierung */}
            {activeStep === 3 && (<>
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
                  <PercentField label="Beleihungsquote (LTV)" value={ltvPct} onChange={setLtvPct} />
                  <PercentField label="Zinssatz p.a." value={zinsPct} onChange={setZinsPct} step={0.05} />
                  <PercentField label="Tilgung p.a." value={tilgungPct} onChange={setTilgungPct} step={0.05} />
                </div>
              )}
              {financingOn && (
                <div style={{ marginTop: 8, fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>
                  Richtwert Bauzins (Stand: {MARKT_ZINS_STAND}): <strong style={{ color: "rgba(255,255,255,0.55)" }}>{pct(MARKT_ZINS_RICHTWERT)}</strong>
                  {zinsPct > MARKT_ZINS_RICHTWERT + 0.003 && <span style={{ color: "#f87171" }}> · du liegst darüber</span>}
                  {zinsPct < MARKT_ZINS_RICHTWERT - 0.003 && <span style={{ color: "#4ade80" }}> · du liegst darunter</span>}
                </div>
              )}
              {financingOn && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(loan))}</strong> · Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(annuitaetJahr))}/Jahr</strong> ({eur(Math.round(annuitaetMonat))}/Monat)
                </div>
              )}
            </div>
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
              <ArrowLeft2 size={13} /> Zurück zu Miete & Kosten
            </button>
            </>)}

            {/* Erweiterte Projektionsparameter */}
            {mode === "erweitert" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Erweiterte Parameter</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 14 }}>Projektion & Bewertung</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <PercentField label="Mietsteigerung p.a." value={mietSteigerung} onChange={setMietSteigerung} step={0.001} />
                    <PercentField label="Kostensteigerung p.a." value={kostenSteigerung} onChange={setKostenSteigerung} step={0.001} />
                    <PercentField label="Cap Rate (Modellwert)" value={capRatePct} onChange={setCapRatePct} step={0.0005} />
                  </div>
                </div>
              </>
            )}

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
              projectionPreview={projectionPreview}
              projectionFull={etwPro?.projectionFull ?? null}
              proLoading={etwProLoading}
              scoreBreakdown={etwPro?.scoreBreakdown ?? null}
              etf={etwPro?.etf ?? null}
              eigenkapital={eigenkapital}
              plan={plan}
            />
          </div>

          {/* RECHTS: Ergebnis sticky */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Beispielobjekt-Hinweis (nur solange unverändertes Demo-Beispiel aktiv ist) */}
            {isExample && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.22)", fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}
              >
                <Sparkles size={14} style={{ color: "#FCDC45", flexShrink: 0 }} />
                <span>Das ist ein <strong style={{ color: "#FCDC45" }}>Beispielobjekt</strong> — trag oben deine eigene Adresse ein für dein echtes Ergebnis.</span>
              </motion.div>
            )}

            {/* Score & Entscheidung */}
            <StaggerItem index={0}>
            <motion.div
              ref={tourScoreRef}
              layout
              animate={{ scale: [1, 1.015, 1], rotateX: tilt.x, rotateY: tilt.y }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ position: "relative", borderRadius: 16, padding: 20, background: "linear-gradient(135deg, rgba(15,44,138,0.85) 0%, rgba(124,58,237,0.65) 100%)", border: "1px solid rgba(124,58,237,0.25)", transformPerspective: 700, transformStyle: "preserve-3d" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.25)" }} />
                  Dein Ergebnis (live)
                </div>
                <button
                  ref={tourShareRef}
                  onClick={shareResult}
                  disabled={sharing}
                  title="Ergebnis als Bild teilen"
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 7, padding: "5px 9px", cursor: sharing ? "default" : "pointer", fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: 600, opacity: sharing ? 0.6 : 1 }}
                >
                  <Share2 size={12} /> {sharing ? "..." : "Teilen"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={decisionColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * displayScorePct / 100)} 201`} strokeLinecap="round"
                      style={{ transition: "stroke 0.4s ease-out" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{Math.round(displayScorePct)}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Empfehlung</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: decisionLabel === "RENTABEL" ? "#4ade80" : decisionLabel === "GRENZWERTIG" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>
                    <AnimatedValue value={decisionLabel === "RENTABEL" ? "Kaufen" : decisionLabel === "GRENZWERTIG" ? "Weiter prüfen" : "Eher Nein"} />
                  </div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(monthlyCF)), good: monthlyCF >= 100, okay: monthlyCF >= 0 },
                  { label: "Rendite (NOI)", value: pct(noiYield), good: noiYield >= 0.05, okay: noiYield >= 0.035 },
                  { label: "Schuldendeckung", value: Number.isFinite(dscr) ? dscr.toFixed(2) : "–", good: Number.isFinite(dscr) && dscr >= 1.2, okay: Number.isFinite(dscr) && dscr >= 1.0 },
                ].map((kpi) => {
                  const statusColor = kpi.good ? "#4ade80" : kpi.okay ? "#FCDC45" : "#f87171";
                  return (
                    <motion.div
                      key={kpi.label}
                      layout
                      style={{
                        background: `linear-gradient(180deg, ${statusColor}14 0%, rgba(0,0,0,0.25) 55%)`,
                        border: `1px solid ${statusColor}33`,
                        borderTop: `2px solid ${statusColor}`,
                        borderRadius: 10,
                        padding: "9px 8px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{kpi.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}><AnimatedValue value={kpi.value} /></div>
                      <div style={{ marginTop: 6, display: "inline-block", padding: "2px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${statusColor}26`, color: statusColor }}>
                        {kpi.good ? "Gut" : kpi.okay ? "Okay" : "Niedrig"}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: decisionColor, borderRadius: 2, transition: "width 0.5s ease-out, background 0.4s ease-out" }} />
              </div>
            </motion.div>
            </StaggerItem>

            {/* Vollstaendige Analyse: mehrsaetziger Absatz statt nur Zahlen (template-basiert, kein LLM).
                PRO-Feature -- die echten Saetze kommen serverseitig aus etwPro und existieren fuer
                Free-User clientseitig gar nicht (siehe useEtwProAnalysis). Standardmaessig eingeklappt
                (nur die ersten 2 Saetze), damit die Spielwiese darunter nicht ausserhalb des sichtbaren
                Bereichs landet. */}
            <StaggerItem index={1}>
            <ProGate plan={plan} feature="Die ausführliche Handlungsempfehlung">
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>💬</span>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
                  {isPro(plan) && etwProLoading && !etwPro ? (
                    "Analyse wird berechnet …"
                  ) : (
                    <>
                      {(analysisSentences.length ? analysisSentences : PLACEHOLDER_ANALYSIS_SENTENCES).slice(0, 2).join(" ")}
                      {analysisExpanded && analysisSentences.length > 2 && " " + analysisSentences.slice(2).join(" ")}
                      {analysisSentences.length > 2 && (
                        <button
                          onClick={() => setAnalysisExpanded((v) => !v)}
                          style={{ display: "block", marginTop: 6, background: "none", border: "none", padding: 0, color: "#FCDC45", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          {analysisExpanded ? "Weniger anzeigen ↑" : "Mehr anzeigen ↓"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>📊</span>
                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.5)" }}>
                  {marketComparison || PLACEHOLDER_MARKET_COMPARISON}
                </div>
              </div>
            </div>
            </ProGate>
            </StaggerItem>

            {/* Versteckte Karte fuer den Bild-Export (Punkt 7: teilbare Ergebnis-Karte) */}
            <div style={{ position: "fixed", left: -9999, top: 0, width: 640, pointerEvents: "none" }} aria-hidden="true">
              <div ref={shareCardRef} style={{ width: 640, padding: 40, background: "linear-gradient(160deg, #0a1628 0%, #161b22 100%)", fontFamily: "inherit" }}>
                {/* Branding nur für Free -- PRO-Nutzer teilen ohne PROPORA-Wasserzeichen */}
                {!isPro(plan) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#FCDC45", letterSpacing: "-0.02em" }}>PROPORA</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Immo-Analyzer</span>
                  </div>
                )}
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                  {isExample ? "Beispielobjekt" : (adresse || "Wohnungs-Analyse")}
                </div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginBottom: 28 }}>
                  {eur(kaufpreis)} · {flaecheM2} m²
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
                  <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                    <svg width="110" height="110" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke={decisionColor} strokeWidth="7"
                        strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Empfehlung</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: decisionLabel === "RENTABEL" ? "#4ade80" : decisionLabel === "GRENZWERTIG" ? "#FCDC45" : "#f87171" }}>
                      {decisionLabel === "RENTABEL" ? "Kaufen" : decisionLabel === "GRENZWERTIG" ? "Weiter prüfen" : "Eher Nein"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                  {[
                    { label: "Cashflow/Monat", value: eur(Math.round(monthlyCF)) },
                    { label: "Rendite (NOI)", value: pct(noiYield) },
                    { label: "Schuldendeckung", value: Number.isFinite(dscr) ? dscr.toFixed(2) : "–" },
                  ].map((kpi) => (
                    <div key={kpi.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>{kpi.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                  Erstellt mit propora.de — Immobilien-Rendite in 60 Sekunden
                </div>
              </div>
            </div>

            {/* Spielwiese — direkt unter dem Ergebnis, für sofortiges Ausprobieren */}
            <StaggerItem index={2}>
            <div ref={tourSpielwieseRef} style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.15)", borderRadius: 16, padding: 18 }}>
              <style>{`.etw-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.etw-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.etw-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none;cursor:pointer}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 6 }}>
                  🎛️ Spielwiese
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>wirkt sofort oben</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {[
                  { label: "🤝 Verhandeln −10%", price: -0.1, rent: 0 },
                  { label: "📈 Miete +10%", price: 0, rent: 0.1 },
                  { label: "↩️ Zurücksetzen", price: 0, rent: 0 },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => { setPriceAdjPct(s.price); setRentAdjPct(s.rent); }}
                    style={{ fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", cursor: "pointer" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Kaufpreis anpassen</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: priceAdjPct < 0 ? "#4ade80" : priceAdjPct > 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}><AnimatedValue value={signedPct(priceAdjPct)} /></span>
                  </div>
                  <input type="range" min={-0.3} max={0.3} step={0.005} value={priceAdjPct} onChange={(e) => setPriceAdjPct(Number(e.target.value))} className="etw-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+30%</span></div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}><AnimatedValue value={signedPct(rentAdjPct)} /></span>
                  </div>
                  <input type="range" min={-0.3} max={0.5} step={0.005} value={rentAdjPct} onChange={(e) => setRentAdjPct(Number(e.target.value))} className="etw-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+50%</span></div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                  Anpassungen in Bewertung berücksichtigen
                </label>
              </div>
            </div>
            </StaggerItem>

            {/* Speichern-Nudge: sobald eine eigene Analyse gemacht wurde und noch nicht gespeichert ist */}
            {!isExample && !objectSaved && (
              <StaggerItem index={3}>
              <div style={{ background: "rgba(252,220,69,0.06)", border: "1px solid rgba(252,220,69,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>💾</span>
                  <span>Objekt speichern, um es später zu vergleichen?</span>
                </div>
                <SaveToPortfolioButton name={adresse || "ETW"} analyzerType="etw" adresse={adresse} kaufpreis={kaufpreis} data={{ scorePct, noi, dscr, monthlyCF }} onSaved={() => setObjectSaved(true)} />
              </div>
              </StaggerItem>
            )}

            {/* Weiteres Objekt analysieren */}
            {!isExample && (
              <StaggerItem index={4}>
              <a href="/vergleich" style={{ textDecoration: "none" }}>
                <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Mit einer anderen Immobilie vergleichen</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Bis zu 5 Objekte nebeneinander stellen</div>
                  </div>
                </div>
              </a>
              </StaggerItem>
            )}

            {/* Tipps */}
            {tips.length > 0 && (
              <StaggerItem index={5}>
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
            </StaggerItem>
            )}

            {/* Glossar */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Was bedeutet das?</div>
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

      {/* Sticky Footer -- nur Mobile: auf Desktop dupliziert er die immer sichtbare Sidebar */}
      <div className="lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
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

type EtwProjectionYear = { year: number; noi: number; cf: number };
type EtwScoreBreakdown = { noiYieldScore: number; dscrScore: number; weights: { noiYield: number; dscr: number } };
type EtwEtfComparison = { eigenkapital: number; etfWert10y: number; immoWert10y: number; etfDelta: number };

function DetailsSection({
  noiYield, dscr, annuitaetMonat, allIn, noi, annuitaetJahr,
  monthlyCF, monthlyEffRent, monthlyOpex, bePrice, beRentPerM2,
  capRatePct, noiCapValue, projectionPreview, projectionFull, proLoading,
  scoreBreakdown, etf, eigenkapital, plan,
}: {
  noiYield: number; dscr: number; annuitaetMonat: number; allIn: number;
  noi: number; annuitaetJahr: number; monthlyCF: number;
  monthlyEffRent: number; monthlyOpex: number;
  bePrice: number | null; beRentPerM2: number | null;
  capRatePct: number; noiCapValue: number;
  // Free: nur Jahr 1-2. PRO: volle 10-Jahres-Reihe, Score-Breakdown & ETF-Vergleich
  // -- projectionFull/scoreBreakdown/etf sind null, solange kein PRO-Account vorliegt
  // oder die Server-Antwort noch aussteht (siehe useEtwProAnalysis).
  projectionPreview: EtwProjectionYear[];
  projectionFull: EtwProjectionYear[] | null;
  proLoading: boolean;
  scoreBreakdown: EtwScoreBreakdown | null;
  etf: EtwEtfComparison | null;
  eigenkapital: number;
  plan: UserPlan;
}) {
  const C = {
    card: { background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 } as React.CSSProperties,
    sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" } as React.CSSProperties,
    divider: { flex: 1, height: 1, background: "rgba(255,255,255,0.06)" } as React.CSSProperties,
  };
  const annuitaetMonatCalc = annuitaetMonat;
  const showProLoading = isPro(plan) && proLoading && !projectionFull;
  const chartData = projectionFull ?? PLACEHOLDER_PROJECTION_10Y;
  const lastProj = chartData[chartData.length - 1];
  const breakdown = scoreBreakdown ?? PLACEHOLDER_SCORE_BREAKDOWN;
  const etfData = etf ?? PLACEHOLDER_ETF;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Detailberechnungen</span>
        <div style={C.divider} />
      </div>

      {/* Monatliche Aufschlüsselung */}
      <div style={C.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatliche Cashflow-Aufschlüsselung</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Wert (NOI/Cap) vs. Kaufpreis</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Break-even Szenarien</div>
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

      {/* Score-Breakdown (PRO) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Score-Breakdown</span>
        <div style={C.divider} />
      </div>
      <ProGate plan={plan} feature="Der Score-Breakdown">
        <div style={C.card}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: `Rendite-Score (Gewicht ${Math.round(breakdown.weights.noiYield * 100)}%)`, value: breakdown.noiYieldScore, color: "#FCDC45" },
              { label: `Schuldendeckung-Score (Gewicht ${Math.round(breakdown.weights.dscr * 100)}%)`, value: breakdown.dscrScore, color: "#60a5fa" },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{Math.round(row.value * 100)}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(row.value * 100)}%`, background: row.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ProGate>

      {/* 10J Projektion: Jahr 1-2 frei sichtbar, volle Reihe + Chart ist PRO */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>10-Jahres-Projektion</span>
        <div style={C.divider} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {projectionPreview.map((y) => (
          <div key={y.year} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cashflow Jahr {y.year}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: y.cf >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(y.cf))}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>NOI: {eur(Math.round(y.noi))}</div>
          </div>
        ))}
      </div>
      <ProGate plan={plan} feature="Die volle 10-Jahres-Projektion">
        <div style={C.card}>
          {showProLoading ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "40px 0", textAlign: "center" }}>Projektion wird berechnet …</div>
          ) : (
            <>
              <div style={{ height: 220, marginBottom: 18 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradNoi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCDC45" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#FCDC45" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={monthlyCF >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={monthlyCF >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="year" tickFormatter={(y) => `J${y}`} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => eur(Math.round(v))} />
                    <RTooltip
                      formatter={(v: any, name: string) => [eur(Math.round(Number(v))), name]}
                      labelFormatter={(y) => `Jahr ${y}`}
                      contentStyle={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                    />
                    <Area type="monotone" dataKey="noi" name="NOI p.a." stroke="#FCDC45" strokeWidth={2} fill="url(#gradNoi)" />
                    <Area type="monotone" dataKey="cf" name="Cashflow p.a." stroke={monthlyCF >= 0 ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#gradCf)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { label: "NOI Jahr 10", value: lastProj ? eur(Math.round(lastProj.noi)) : "–", color: "#FCDC45", sub: "p.a." },
                  { label: "Cashflow Jahr 10", value: lastProj ? eur(Math.round(lastProj.cf)) : "–", color: lastProj && lastProj.cf >= 0 ? "#4ade80" : "#f87171", sub: "p.a." },
                  { label: "CF-Entwicklung", value: lastProj ? `${lastProj.cf - (chartData[0]?.cf ?? 0) >= 0 ? "+" : ""}${eur(Math.round(lastProj.cf - (chartData[0]?.cf ?? 0)))}` : "–", color: lastProj && lastProj.cf >= (chartData[0]?.cf ?? 0) ? "#4ade80" : "#f87171", sub: "über 10 Jahre" },
                ].map((k) => (
                  <div key={k.label} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ProGate>

      {/* ETF-Vergleich: "Schlägt diese Wohnung eine ETF-Anlage?" (PRO) */}
      {eigenkapital > 0 && (
        <ProGate plan={plan} feature="Der ETF-Vergleich">
          <div style={C.card}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Schlägt diese Wohnung eine ETF-Anlage?</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
              Vereinfachter Vergleich über 10 Jahre — dein Eigenkapital ({eur(Math.round(etfData.eigenkapital))}) angelegt zu 7 % p.a. vs. die Immobilie (kumulierter Cashflow, ohne Wertsteigerung der Wohnung eingerechnet).
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>ETF (7 % p.a.)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{eur(Math.round(etfData.etfWert10y))}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>nach 10 Jahren</div>
              </div>
              <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Diese Wohnung</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#FCDC45" }}>{eur(Math.round(etfData.immoWert10y))}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>EK + Cashflow, 10J</div>
              </div>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 10, background: etfData.etfDelta >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${etfData.etfDelta >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, fontSize: 12.5, color: etfData.etfDelta >= 0 ? "#4ade80" : "#f87171", fontWeight: 600, textAlign: "center" }}>
              {etfData.etfDelta >= 0
                ? `Die Wohnung schlägt die ETF-Anlage um ${eur(Math.round(etfData.etfDelta))}`
                : `Die ETF-Anlage liegt um ${eur(Math.round(-etfData.etfDelta))} vorn`}
            </div>
          </div>
        </ProGate>
      )}
    </section>
  );
}

/* ======================= weitere Utils ======================= */

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scale(x: number, a: number, b: number) {
  if (b === a) return 0;
  return clamp01((x - a) / (b - a));
}
