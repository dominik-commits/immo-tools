// src/routes/EinfamilienhausCheck.tsx
// Einfamilienhaus-Check (PRO)
// Fokus: einfaches, verständliches Tool für Buy-to-let EFH

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home,
  RefreshCw,
  Upload,
  Chrome,
  Download,
  Gauge,
  Banknote,
  TrendingUp,
  Info,
  ChevronDown,
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
import PlanGuard from "@/components/PlanGuard";
import { downloadPdfExport } from "../utils/downloadPdfExport";
import { useUserPlan, isPro } from "../hooks/useUserPlan";
import { useEfhProAnalysis } from "../hooks/useEfhProAnalysis";
import { buildProjection10y, buildNarrativeTeaser, buildProjectionTeaserContinuation, type EfhProInput } from "../core/efhCalc";
import { ProGate } from "../components/ProGate";
import { NarrativeTeaser } from "../components/NarrativeTeaser";
import { useUser, useAuth } from "@clerk/clerk-react";
import { OnboardingWizard } from "../components/OnboardingWizard";
import { useUrlPrefill } from "../hooks/useUrlPrefill";
import html2canvas from "html2canvas";
import { Share2, MapPin } from "lucide-react";

/* ----------------------------------------------------------------
 *  BRAND COLORS
 * ---------------------------------------------------------------- */

const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#ff914d";
const SURFACE = "#0d1117";
const SURFACE_ALT = "#EAEAEE";

// Generische Beispieltexte/-daten für die geblurrten Platzhalter (Free-User).
// Bewusst ohne Bezug zu den echten Eingaben des Nutzers -- nur Illustration/Fülltext.
const PLACEHOLDER_NARRATIVE_FILLER =
  "und die Kennzahlen verbessern sich spürbar, sobald du diese Stellschraube anpasst — Details dazu in der vollständigen Analyse.";
const PLACEHOLDER_MARKET_COMPARISON =
  "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Einfamilienhäuser (ca. 3–5 %).";
// Nur der Immobilien-Wert ist erfunden -- der ETF-Wert wird aus dem echten,
// bereits freien Eigenkapital berechnet (siehe realEtfWert10y weiter unten).
const PLACEHOLDER_ETF = { immoWert10y: 108_000 };
const PLACEHOLDER_SCORE_BREAKDOWN = { noiYieldScore: 0.55, dscrScore: 0.62, cashflowScore: 0.48, weights: { noiYield: 0.45, dscr: 0.35, cashflow: 0.2 } };

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

/* ----------------------------------------------------------------
 *  SMALL UI HELPERS
 * ---------------------------------------------------------------- */

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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4  ${className}`}>{children}</div>
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
          max={0.5}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <span className="w-24 text-right tabular-nums ">
          {pct(value)}
        </span>
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
  const r = size * 0.9;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(scorePct, 100)) * circ / 100;
  const cx = size;
  const cy = size;
  return (
    <div style={{ position: "relative", width: size * 2, height: size * 2 }}>
      <svg width={size * 2} height={size * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={Math.round(size * 0.18)} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={scoreColor} strokeWidth={Math.round(size * 0.18)}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: size * 0.45, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{scorePct}%</div>
        <div style={{ fontSize: size * 0.22, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{label}</div>
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

/* ----------------------------------------------------------------
 *  HAUPTKOMPONENTE (mit PlanGuard)
 * ---------------------------------------------------------------- */

/** Animiert einen sich ändernden Wert mit einem kurzen Pop-In. */
function AnimatedValue({ value, style }: { value: string; style?: React.CSSProperties }) {
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
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return display;
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  const dots = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 55 + Math.random() * 35;
        const colors = ["#4ade80", "#FCDC45", "#60a5fa", "#f472b6"];
        return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: colors[i % colors.length], size: 4 + Math.random() * 4 };
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
          style={{ position: "absolute", left: "50%", top: "50%", width: d.size, height: d.size, borderRadius: "50%", background: d.color, marginLeft: -d.size / 2, marginTop: -d.size / 2 }}
        />
      ))}
    </div>
  );
}

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.09, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

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
      <div style={{ position: "fixed", top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 14, border: "2px solid #FCDC45", boxShadow: "0 0 0 9999px rgba(5,8,14,0.8)", pointerEvents: "none", transition: "all 0.25s ease-out" }} />
      <div style={{ position: "fixed", top: Math.min(tooltipTop, window.innerHeight - 160), left: Math.max(16, Math.min(rect.left, window.innerWidth - 316)), width: 300, background: "#161b22", border: "1px solid rgba(252,220,69,0.3)", borderRadius: 14, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
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

type ViewMode = "einfach" | "erweitert";

export default function EinfamilienhausCheck() {
  return (
    <PlanGuard required="any">
      <PageInner />
    </PlanGuard>
  );
}

/* ----------------------------------------------------------------
 *  PAGE INNER – kompletter Tool-Content
 * ---------------------------------------------------------------- */

function PageInner() {
  const { user: clerkUser } = useUser();
  const { plan } = useUserPlan();
  const prefill = useUrlPrefill();
  const investorName = clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || "Propora-Nutzer";
  const [adresse, setAdresse] = useState(() => prefill.adresse ?? "");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const MODE_KEY = "efh.mode.v1";
  const [mode, setMode] = useState<ViewMode>(() => {
    try { const raw = localStorage.getItem(MODE_KEY); return raw === "erweitert" ? "erweitert" : "einfach"; }
    catch { return "einfach"; }
  });
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);

  // Prefill aus URL-Parametern (Chrome Extension Import)
  useEffect(() => {
    if (!prefill.hasPrefill) return;
    if (prefill.kaufpreis)   setKaufpreis(prefill.kaufpreis);
    if (prefill.kaltmiete)   setJahreskaltmiete(prefill.kaltmiete * 12);
    if (prefill.plz)         setAdresse(a => a || (prefill.plz ?? ""));
    if (prefill.adresse)     setAdresse(prefill.adresse);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Basis-Eingaben
  const [kaufpreis, setKaufpreis] = useState(() => prefill.kaufpreis ?? 550_000);
  const [jahreskaltmiete, setJahreskaltmiete] = useState(() => prefill.kaltmiete ? prefill.kaltmiete * 12 : 30_500);
  const [mietausfallPct, setMietausfallPct] = useState(0.05);
  const [nichtUmlagefaehigJahr, setNichtUmlagefaehigJahr] = useState(2_000);
  const [instandhaltungJahr, setInstandhaltungJahr] = useState(3_000);

  const [nkGrEStPct, setNkGrEStPct] = useState(0.065);
  const [nkNotarPct, setNkNotarPct] = useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = useState(0.03);
  const [nkSonstPct, setNkSonstPct] = useState(0);

  // Finanzierung
  const [financingOn, setFinancingOn] = useState(true);
  const [ltvPct, setLtvPct] = useState(0.4);
  const [zinsPct, setZinsPct] = useState(0.042);
  const [laufzeitYears, setLaufzeitYears] = useState(30);

  // Spielwiese
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const { getToken } = useAuth();

  const isBeispiel = !adresse && kaufpreis === 550_000;
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Echte Projektions-Annahmen (ersetzt die zuvor rein dekorativen, wirkungslosen Felder)
  const [mietSteigerung, setMietSteigerung] = useState(0.01);
  const [kostenSteigerung, setKostenSteigerung] = useState(0.015);

  // 3D-Tilt auf der Ergebnis-Karte
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
      // Export ist Nice-to-have, kein kritischer Pfad
    } finally {
      setSharing(false);
    }
  }

  // Geführte Kurz-Tour
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

  // Adress-Autovervollständigung (OpenStreetMap Nominatim, kein API-Key nötig)
  type AddressSuggestion = { label: string; lat: string; lon: string };
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: string; lon: string } | null>(null);
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
              return { label: [street, `${a.postcode} ${city}`].filter(Boolean).join(", "), lat: d.lat, lon: d.lon };
            });
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


  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const KP = applyAdjustments ? adjustedPrice : kaufpreis;
  const jahresmieteAdj = jahreskaltmiete * (1 + rentAdjPct);

  // Ableitungen
  const mietausfall = jahresmieteAdj * mietausfallPct;
  const mieteEffektiv = jahresmieteAdj - mietausfall;
  const laufendeKostenJahr = nichtUmlagefaehigJahr + instandhaltungJahr;
  const noiJahr = mieteEffektiv - laufendeKostenJahr;

  const loan = financingOn ? KP * ltvPct : 0;
  const annuityYear: number = financingOn ? (annuityExact(loan, zinsPct, laufzeitYears) ?? 0) : 0;
  const interestY1 = financingOn ? loan * zinsPct : 0;
  const principalY1 = financingOn ? Math.max(0, annuityYear - interestY1) : 0;

  const cashflowJahr = noiJahr - (financingOn ? annuityYear : 0);
  const cashflowMonat = cashflowJahr / 12;

  const noiYield = KP > 0 ? noiJahr / KP : 0;
  const dscr =
    financingOn && annuityYear > 0 ? noiJahr / annuityYear : null;

  const nkPct =
    nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;
  const nkBetrag = Math.round(KP * nkPct);
  const allIn = KP + nkBetrag;

  // Score (Ampel) – EFH eher konservativ
  const score =
    clamp01(scale(noiYield, 0.03, 0.06)) * 0.45 +
    clamp01(scale(dscr ?? 0, 1.1, 1.6)) * 0.35 +
    clamp01(scale(cashflowMonat, 0, 800)) * 0.2;

  const scorePct = Math.round(score * 100);
  const scoreLabel: "BUY" | "CHECK" | "NO" =
    score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";
  const scoreColor =
    score >= 0.7 ? "#16a34a" : score >= 0.5 ? "#f59e0b" : "#ef4444";

  const decisionLabelText =
    scoreLabel === "BUY"
      ? "Kaufen (unter Vorbehalt)"
      : scoreLabel === "CHECK"
      ? "Weiter prüfen"
      : "Eher Nein";

  let decisionText: string;
  if (scoreLabel === "BUY") {
    decisionText =
      "Miete, laufende Kosten und Finanzierung ergeben ein solides Chance-Risiko-Profil. Unter deinen Annahmen wirkt das Einfamilienhaus als Kapitalanlage tragfähig. Prüfe im Detail Lage, Objektzustand und Mieterbonität, bevor du final zusagst.";
  } else if (scoreLabel === "CHECK") {
    decisionText =
      "Die Kennzahlen liegen im mittleren Bereich. Der Deal kann funktionieren, hängt aber stark von deinen Annahmen zu Miete, Kosten und Instandhaltung ab. Spiele mehrere Szenarien durch und verhandle Preis oder Konditionen nach.";
  } else {
    decisionText =
      "Unter den aktuellen Annahmen ist die Rendite eher schwach oder der Cashflow angespannt. Du solltest hart verhandeln, Alternativen prüfen oder an deinen Annahmen drehen (Miete, Instandhaltung, Tilgung), bevor du dich bindest.";
  }

  const cashflowText =
    cashflowMonat >= 0
      ? `Cashflow mtl. nach Finanzierung: ${eur(
          Math.round(cashflowMonat)
        )} (positiv)`
      : `Cashflow mtl. nach Finanzierung: ${eur(
          Math.round(cashflowMonat)
        )} (negativ)`;

  // Score-Ring zaehlt sanft zum Zielwert hoch
  const displayScorePct = useCountUp(scorePct);

  // Konfetti, wenn das Ergebnis frisch auf "BUY" kippt
  const [showConfetti, setShowConfetti] = useState(false);
  const prevLabelRef = useRef<"BUY" | "CHECK" | "NO" | null>(null);
  useEffect(() => {
    if (prevLabelRef.current !== null && prevLabelRef.current !== "BUY" && scoreLabel === "BUY") {
      setShowConfetti(true);
    }
    prevLabelRef.current = scoreLabel;
  }, [scoreLabel]);

  // Break-even-Kaufpreis (nur sinnvoll, wenn finanziert wird)
  const bePriceEFH = useMemo(() => {
    if (!financingOn || ltvPct <= 0 || zinsPct <= 0 || noiJahr <= 0) return null;
    const annuityFactor = zinsPct / (1 - Math.pow(1 + zinsPct, -Math.round(laufzeitYears)));
    if (annuityFactor <= 0) return null;
    const loanAtBreakeven = noiJahr / annuityFactor;
    return loanAtBreakeven / ltvPct;
  }, [financingOn, ltvPct, zinsPct, laufzeitYears, noiJahr]);

  // "Schlägt dieses Haus eine ETF-Anlage?" -- Basis für PRO-Input unten
  const eigenkapitalEFH = Math.max(0, allIn - loan);

  // Free: nur Jahr 1-2 lokal sichtbar. PRO: Score-Breakdown, Handlungsempfehlung
  // (narrative), volle 10J-Projektion und ETF-Vergleich kommen ausschließlich
  // vom Server (siehe /api/analyze/pro, type: "efh"). Für Free-User wird der Call gar
  // nicht erst ausgelöst.
  const projectionPreview = useMemo(
    () =>
      buildProjection10y({
        years: 2,
        mieteEffektiv,
        laufendeKostenJahr,
        rentGrowth: mietSteigerung,
        costGrowth: kostenSteigerung,
        financingOn,
        annuityYear,
      }),
    [mieteEffektiv, laufendeKostenJahr, mietSteigerung, kostenSteigerung, financingOn, annuityYear]
  );
  const efhProInput: EfhProInput = useMemo(
    () => ({
      noiYield,
      dscr,
      cashflowMonat,
      scoreLabel,
      ltvPct,
      bePriceEFH: bePriceEFH ?? null,
      kaufpreis: KP,
      mieteEffektiv,
      laufendeKostenJahr,
      mietSteigerung,
      kostenSteigerung,
      financingOn,
      annuityYear,
      eigenkapitalEFH,
    }),
    [noiYield, dscr, cashflowMonat, scoreLabel, ltvPct, bePriceEFH, KP, mieteEffektiv, laufendeKostenJahr, mietSteigerung, kostenSteigerung, financingOn, annuityYear, eigenkapitalEFH]
  );
  const { data: efhPro, loading: efhProLoading } = useEfhProAnalysis(efhProInput, plan);
  const narrative = efhPro?.narrative ?? "";
  const marketComparison = efhPro?.marketComparison ?? "";
  const showEfhProLoading = isPro(plan) && efhProLoading && !efhPro;
  // Geblurrter Chart-Teaser: schreibt die ECHTEN Jahr-1/2-Werte dekorativ fort
  // (keine echte Prognose), statt eine beliebige Fantasiekurve zu zeigen.
  const chartData = efhPro?.projectionFull ?? buildProjectionTeaserContinuation(projectionPreview);
  const lastProj = chartData[chartData.length - 1];
  const scoreBreakdownData = efhPro?.scoreBreakdown ?? PLACEHOLDER_SCORE_BREAKDOWN;
  // ETF-Wert ist aus dem bereits freien Eigenkapital exakt berechenbar -- keine
  // Fantasiezahl nötig. Nur der Immobilien-Wert (hängt vom PRO-Cashflow ab)
  // bleibt erfunden+geblurrt.
  const realEtfWert10y = Math.max(0, eigenkapitalEFH) * Math.pow(1.07, 10);
  const etfData = efhPro?.etf ?? { eigenkapital: Math.max(0, eigenkapitalEFH), etfWert10y: realEtfWert10y, immoWert10y: PLACEHOLDER_ETF.immoWert10y, etfDelta: PLACEHOLDER_ETF.immoWert10y - realEtfWert10y };

  // Teaser-Halbsatz für die Handlungsempfehlung -- nutzt nur bereits freie Werte,
  // läuft für jeden Plan (kein PRO-Inhalt, siehe buildNarrativeTeaser).
  const narrativeTeaser = buildNarrativeTeaser({
    scoreLabel,
    ltvPct,
    cashflowMonat,
    bePriceEFH: bePriceEFH ?? null,
    kaufpreis: KP,
  });

  // Tipps
  const tips: { label: string; detail: string }[] = [];
  if (noiYield < 0.035) {
    tips.push({
      label: "Kaufpreis verhandeln",
      detail:
        "Die Nettomietrendite liegt eher niedrig. Schon 5–10 % weniger Kaufpreis können den Deal deutlich verbessern.",
    });
  }
  if (cashflowMonat < 0) {
    tips.push({
      label: "Tilgung & Zinsstruktur prüfen",
      detail:
        "Ein geringerer Tilgungssatz oder längere Zinsbindung kann deinen monatlichen Cashflow entlasten. Sprich mit der Bank mehrere Varianten durch.",
    });
  }
  if (instandhaltungJahr < 2_000) {
    tips.push({
      label: "Realistische Instandhaltung ansetzen",
      detail:
        "Gerade bei älteren Einfamilienhäusern solltest du genug Puffer für Dach, Heizung und Fassade einplanen. Lieber konservativ kalkulieren.",
    });
  }
  if (!tips.length) {
    tips.push({
      label: "Feintuning",
      detail:
        "Die Kennzahlen wirken insgesamt rund. Über die Spielwiese kannst du gezielt testen, wie sich Kaufpreisnachlass oder höhere Mieten auswirken.",
    });
  }

  // Export-Handler
  function handleExportJSON() {
    const payload = {
      generatedAt: new Date().toISOString(),
      input: {
        kaufpreis: KP,
        jahreskaltmiete,
        mietausfallPct,
        nichtUmlagefaehigJahr,
        instandhaltungJahr,
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
        jahresmieteAdj,
        mietausfall,
        mieteEffektiv,
        laufendeKostenJahr,
        noiJahr,
        noiYield,
        dscr,
        loan,
        annuityYear,
        interestY1,
        principalY1,
        cashflowJahr,
        cashflowMonat,
        nkPct,
        nkBetrag,
        allIn,
        score,
        scorePct,
        scoreLabel,
      },
    };
    downloadBlob(
      `einfamilienhaus_export_${ts()}.json`,
      "application/json;charset=utf-8",
      JSON.stringify(payload, null, 2)
    );
  }

  function handleExportCSV() {
    const rows: (string | number)[][] = [
      ["Abschnitt", "Feld", "Wert"],
      ["Eingaben", "Kaufpreis (€)", KP],
      ["Eingaben", "Jahreskaltmiete (€)", jahreskaltmiete],
      ["Eingaben", "Mietausfallwagnis", pct(mietausfallPct)],
      ["Eingaben", "Nicht umlagefähige Kosten/Jahr", nichtUmlagefaehigJahr],
      ["Eingaben", "Instandhaltung/Jahr", instandhaltungJahr],
      [],
      ["Nebenkosten", "Grunderwerbsteuer", pct(nkGrEStPct)],
      ["Nebenkosten", "Notar", pct(nkNotarPct)],
      ["Nebenkosten", "Grundbuch", pct(nkGrundbuchPct)],
      ["Nebenkosten", "Makler", pct(nkMaklerPct)],
      ["Nebenkosten", "Sonstiges", pct(nkSonstPct)],
      ["Nebenkosten", "Summe NK (%)", pct(nkPct)],
      ["Nebenkosten", "Summe NK (€)", nkBetrag],
      ["Nebenkosten", "All-in-Kaufpreis", allIn],
      [],
      ["Finanzierung", "Aktiv", financingOn ? "Ja" : "Nein"],
      ["Finanzierung", "LTV", financingOn ? pct(ltvPct) : "-"],
      ["Finanzierung", "Zins p.a.", financingOn ? pct(zinsPct) : "-"],
      ["Finanzierung", "Laufzeit (J)", financingOn ? laufzeitYears : "-"],
      ["Finanzierung", "Darlehen (€)", Math.round(loan)],
      ["Finanzierung", "Annuität/Jahr", Math.round(annuityYear)],
      [],
      ["Ergebnis", "Effektive Jahresmiete", Math.round(mieteEffektiv)],
      ["Ergebnis", "Laufende Kosten/Jahr", laufendeKostenJahr],
      ["Ergebnis", "NOI/Jahr", Math.round(noiJahr)],
      ["Ergebnis", "NOI-Yield", pct(noiYield)],
      ["Ergebnis", "DSCR", dscr ? dscr.toFixed(2) : "-"],
      ["Ergebnis", "Cashflow/Jahr", Math.round(cashflowJahr)],
      ["Ergebnis", "Cashflow/Monat", Math.round(cashflowMonat)],
      ["Ergebnis", "Score (%)", scorePct],
      ["Ergebnis", "Ampel", scoreLabel],
    ];

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
      `einfamilienhaus_export_${ts()}.csv`,
      "text/csv;charset=utf-8",
      csvWithBom
    );
  }

  function handleExportPDF() {
    const html = `
<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Einfamilienhaus-Rendite – Export</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica Neue,Arial,Noto Sans;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:16px 0 8px}
table{width:100%;border-collapse:collapse} th,td{padding:6px 8px} th{text-align:left}
tr+tr td{border-top:1px solid #eee} .meta{color:#555;font-size:12px;margin-bottom:12px} .right{text-align:right}
.badge{display:inline-block;border:1px solid #ddd;border-radius:9999px;padding:2px 8px;font-size:12px;margin-left:8px}
@media print { a[href]:after{content:""} }
</style></head><body>
<h1>Einfamilienhaus-Rendite – Export</h1>
<div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>

<h2>Eingaben</h2>
<table>
<tr><th>Kaufpreis (bewertet)</th><td class="right">${eur(KP)}</td></tr>
<tr><th>Jahreskaltmiete</th><td class="right">${eur(jahreskaltmiete)}</td></tr>
<tr><th>Mietausfallwagnis</th><td class="right">${pct(mietausfallPct)}</td></tr>
<tr><th>Nicht umlagefähige Kosten/Jahr</th><td class="right">${eur(
      nichtUmlagefaehigJahr
    )}</td></tr>
<tr><th>Instandhaltung/Jahr</th><td class="right">${eur(
      instandhaltungJahr
    )}</td></tr>
<tr><th>Kaufnebenkosten gesamt</th><td class="right">${pct(
      nkPct
    )} (${eur(nkBetrag)})</td></tr>
<tr><th>All-in-Kaufpreis</th><td class="right">${eur(allIn)}</td></tr>
<tr><th>Finanzierung</th><td class="right">${
      financingOn
        ? `Ja – LTV ${pct(ltvPct)}, Zins ${pct(zinsPct)}, Laufzeit ${laufzeitYears} J.`
        : "Nein"
    }</td></tr>
</table>

<h2>Ergebnis (Jahr 1)</h2>
<table>
<tr><th>Effektive Jahresmiete</th><td class="right">${eur(
      Math.round(mieteEffektiv)
    )}</td></tr>
<tr><th>Laufende Kosten/Jahr</th><td class="right">${eur(
      laufendeKostenJahr
    )}</td></tr>
<tr><th>NOI/Jahr</th><td class="right">${eur(Math.round(noiJahr))}</td></tr>
<tr><th>NOI-Yield</th><td class="right">${pct(noiYield)}</td></tr>
<tr><th>DSCR</th><td class="right">${dscr ? dscr.toFixed(2) : "–"}</td></tr>
<tr><th>Cashflow/Jahr</th><td class="right">${eur(
      Math.round(cashflowJahr)
    )}</td></tr>
<tr><th>Cashflow/Monat</th><td class="right">${eur(
      Math.round(cashflowMonat)
    )}</td></tr>
<tr><th>Score</th><td class="right">${scorePct} % (${scoreLabel})</td></tr>
</table>
</body></html>
    `.trim();

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        try {
          w.print();
        } catch {
          // ignore
        }
      }, 200);
    }
  }

  function runSelectedExports(opts: {
    json: boolean;
    csv: boolean;
    pdf: boolean;
  }) {
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
      if (inp.kaltmieteJahr) setJahreskaltmiete(num(inp.kaltmieteJahr, jahreskaltmiete));
      if (inp.leerstandPct) setMietausfallPct(num(inp.leerstandPct, mietausfallPct));
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

  if (isJson) {
    importJson(f);
    return;
  }

  alert("Dieses Dateiformat wird nicht unterstützt. Bitte JSON oder PDF hochladen.");
}

  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setKaufpreis(num(d.kaufpreis, kaufpreis));
        setJahreskaltmiete(num(d.jahreskaltmiete, jahreskaltmiete));
        setMietausfallPct(num(d.mietausfallPct, mietausfallPct));
        setNichtUmlagefaehigJahr(
          num(d.nichtUmlagefaehigJahr, nichtUmlagefaehigJahr)
        );
        setInstandhaltungJahr(
          num(d.instandhaltungJahr, instandhaltungJahr)
        );
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
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  /* ---------------- Render ---------------- */

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <OnboardingWizard analyzer="efh" />
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
              <a href={prefill.exposeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#FCDC45", textDecoration: "underline" }}>Exposé ansehen</a>
            )}
          </span>
        </div>
      )}
      {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M2 9L10 2L18 9V18H13.5V13.5H6.5V18H2V9Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="8" y="14.5" width="4" height="3.5" fill="#FCDC45" rx="0.5"/>
                <path d="M13 5V3H15V7" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Einfamilienhaus-Rendite</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>Kaufpreis, Miete & Finanzierung eingeben – sofort sehen ob sich das EFH lohnt</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setMode("einfach")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "einfach" ? "#FCDC45" : "transparent", color: mode === "einfach" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Einfach</button>
              <button onClick={() => setMode("erweitert")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "erweitert" ? "#FCDC45" : "transparent", color: mode === "erweitert" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Erweitert</button>
            </div>
            <button onClick={() => setTourStep(0)} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", color: "#FCDC45", display: "inline-flex", alignItems: "center", gap: 6 }}>
              🗺️ Tour
            </button>
            <ExportDropdown onRun={(opts) => { if (opts.json) handleExportJSON(); if (opts.csv) handleExportCSV(); }} />
            {isPro(plan) ? (
            <button
              disabled={pdfExporting}
              onClick={async () => {
                setPdfExporting(true);
                try {
                  await downloadPdfExport("efh", {
                    investorName, adresse,
                    kaufpreis, KP, jahreskaltmiete, jahresmieteAdj, mietausfallPct,
                    mietausfall, mieteEffektiv, nichtUmlagefaehigJahr, instandhaltungJahr,
                    laufendeKostenJahr, nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct,
                    nkSonstPct, nkPct, nkBetrag, allIn, financingOn, ltvPct, zinsPct,
                    laufzeitYears, loan, annuityYear, interestY1, principalY1,
                    noiJahr, noiYield, dscr, cashflowJahr, cashflowMonat,
                    scorePct, scoreLabel, decisionText,
                    projection: (() => {
                      const data: { year: number; Cashflow: number; Tilgung: number }[] = [];
                      let outstanding = loan;
                      for (let t = 1; t <= 10; t++) {
                        const miete = mieteEffektiv * Math.pow(1.02, t-1);
                        const kosten = laufendeKostenJahr * Math.pow(1.02, t-1);
                        const noi = miete - kosten;
                        const interest = financingOn ? outstanding * (zinsPct ?? 0) : 0;
                        const tilg = Math.max(0, (annuityYear ?? 0) - interest);
                        outstanding = Math.max(0, (outstanding ?? 0) - tilg);
                        data.push({ year: t, Cashflow: Math.round(noi - (financingOn ? (annuityYear ?? 0) : 0)), Tilgung: Math.round(tilg) });
                      }
                      return data;
                    })(),
                  }, getToken);
                } catch {
                  alert("PDF-Export fehlgeschlagen. Bitte später erneut versuchen.");
                } finally {
                  setPdfExporting(false);
                }
              }}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: pdfExporting ? "wait" : "pointer", background: "#F5C842", border: "none", color: "#111", display: "inline-flex", alignItems: "center", gap: 6, opacity: pdfExporting ? 0.6 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              {pdfExporting ? "Wird erstellt…" : "Bankbericht"}
            </button>
            ) : (
            <button onClick={() => setShowUpgradeModal(true)}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "not-allowed", background: "rgba(245,200,66,0.15)", border: "1px solid rgba(245,200,66,0.25)", color: "rgba(245,200,66,0.35)", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Bankbericht <span style={{fontSize:10}}>PRO</span>
            </button>
            )}
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
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", fontSize: 10.5, fontWeight: 700, flexShrink: 0, background: activeStep === s.n ? "rgba(13,17,23,0.15)" : "rgba(255,255,255,0.08)" }}>{s.n}</span>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Schritt 1 */}
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
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div ref={addressBoxRef} style={{ gridColumn: "1 / -1", position: "relative" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Objektbezeichnung / Adresse</div>
                  <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                    type="text" placeholder="z.B. Musterstraße 12, 10115 Berlin"
                    value={adresse}
                    onChange={(e) => { setAdresse(e.target.value); setShowSuggestions(true); setSelectedCoords(null); }}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                  />
                  {showSuggestions && (suggestLoading || addressSuggestions.length > 0) && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                      {suggestLoading && <div style={{ padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Suche…</div>}
                      {!suggestLoading && addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setAdresse(s.label); setSelectedCoords({ lat: s.lat, lon: s.lon }); setShowSuggestions(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}
                        >
                          📍 {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCoords && (
                  <div style={{ gridColumn: "1 / -1", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
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
                <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
                {mode === "erweitert" && <PercentField label="Sonstiges/Puffer" value={nkSonstPct} onChange={setNkSonstPct} />}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Nebenkosten: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(nkBetrag)}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(allIn)}</strong>
              </div>
            </div>
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
              Weiter zu Miete & Kosten →
            </button>
            </>)}

            {/* Schritt 2 */}
            {activeStep === 2 && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 2 — Miete & laufende Kosten</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Miete & laufende Kosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was bringt das EFH an Einnahmen?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Jahreskaltmiete (€)" value={jahreskaltmiete} onChange={setJahreskaltmiete} step={100} />
                <PercentField label="Mietausfallwagnis" value={mietausfallPct} onChange={setMietausfallPct} help="Puffer für Leerstand und Zahlungsausfälle" />
                <NumberField label="Nicht-umlagef. Kosten p.a. (€)" value={nichtUmlagefaehigJahr} onChange={setNichtUmlagefaehigJahr} step={100} />
                <NumberField label="Instandhaltung p.a. (€)" value={instandhaltungJahr} onChange={setInstandhaltungJahr} step={100} />
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Effektivmiete: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(mieteEffektiv))}/Jahr</strong> · NOI: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(noiJahr))}/Jahr</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(1)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                ← Zurück
              </button>
              <button onClick={() => setActiveStep(3)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Finanzierung →
              </button>
            </div>
            </>)}

            {/* Schritt 3 */}
            {activeStep === 3 && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 3 — Finanzierung</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Finanzierung</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Optional — wie finanzierst du?</div>
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
                  Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(loan))}</strong> · Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(annuityYear))}/Jahr</strong> ({eur(Math.round(annuityYear/12))}/Monat)
                </div>
              )}
            </div>
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              ← Zurück zu Miete & Kosten
            </button>
            </>)}

            {/* Erweiterte Parameter */}
            {mode === "erweitert" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Erweiterte Parameter</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 14 }}>Projektion & Bewertung</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <NumberField label="Mietsteigerung p.a. (%)" value={Math.round(mietSteigerung * 1000) / 10} onChange={(v) => setMietSteigerung(v / 100)} step={0.1} />
                    <NumberField label="Kostensteigerung p.a. (%)" value={Math.round(kostenSteigerung * 1000) / 10} onChange={(v) => setKostenSteigerung(v / 100)} step={0.1} />
                  </div>
                </div>
              </>
            )}

            {/* Detailberechnungen */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Detailberechnungen</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Cashflow */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatliche Cashflow-Aufschlüsselung</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Effektive Nettokaltmiete", value: Math.round(mieteEffektiv / 12), positive: true },
                  { label: "Nicht-umlagef. Kosten", value: -Math.round(nichtUmlagefaehigJahr / 12), positive: false },
                  { label: "Instandhaltung", value: -Math.round(instandhaltungJahr / 12), positive: false },
                  ...(financingOn ? [{ label: "Zins + Tilgung", value: -Math.round(annuityYear / 12), positive: false }] : []),
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.positive ? "#4ade80" : "#f87171" }}>{row.positive ? "+" : ""}{eur(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: cashflowMonat >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, border: `1px solid ${cashflowMonat >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>= Cashflow pro Monat</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: cashflowMonat >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(cashflowMonat))}</span>
                </div>
              </div>
            </div>

            {/* Score-Breakdown (PRO) */}
            <ProGate plan={plan} feature="Der Score-Breakdown" message={`Sieh genau, warum dein Score bei ${scorePct}% liegt — und was ihn verbessert`}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Score-Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: `Rendite-Score (Gewicht ${Math.round(scoreBreakdownData.weights.noiYield * 100)}%)`, value: scoreBreakdownData.noiYieldScore, color: "#FCDC45" },
                    { label: `Schuldendeckung-Score (Gewicht ${Math.round(scoreBreakdownData.weights.dscr * 100)}%)`, value: scoreBreakdownData.dscrScore, color: "#60a5fa" },
                    { label: `Cashflow-Score (Gewicht ${Math.round(scoreBreakdownData.weights.cashflow * 100)}%)`, value: scoreBreakdownData.cashflowScore, color: "#a78bfa" },
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

            {/* 10-Jahres-Projektion: Jahr 1-2 frei sichtbar, volle Reihe + Chart ist PRO */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {projectionPreview.map((y) => (
                <div key={y.year} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cashflow Jahr {y.year}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: y.cf >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(y.cf))}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>NOI: {eur(Math.round(y.noi))}</div>
                </div>
              ))}
            </div>
            <ProGate plan={plan} feature="Die volle 10-Jahres-Projektion" message="Sieh die komplette 10-Jahres-Entwicklung deines Cashflows">
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>10-Jahres-Projektion</div>
                {showEfhProLoading ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "40px 0", textAlign: "center" }}>Projektion wird berechnet …</div>
                ) : (
                  <>
                    <div style={{ height: 220, marginBottom: 18 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradNoiEfh" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FCDC45" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#FCDC45" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradCfEfh" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={cashflowMonat >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={cashflowMonat >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="year" tickFormatter={(y) => `J${y}`} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => eur(Math.round(v))} />
                          <RTooltip
                            formatter={(v: any, name: string) => [eur(Math.round(Number(v))), name]}
                            labelFormatter={(y) => `Jahr ${y}`}
                            contentStyle={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                          />
                          <Area type="monotone" dataKey="noi" name="NOI p.a." stroke="#FCDC45" strokeWidth={2} fill="url(#gradNoiEfh)" />
                          <Area type="monotone" dataKey="cf" name="Cashflow p.a." stroke={cashflowMonat >= 0 ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#gradCfEfh)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      {[
                        { label: "NOI Jahr 10", value: lastProj ? eur(Math.round(lastProj.noi)) : "–", color: "#FCDC45", sub: "p.a." },
                        { label: "Cashflow Jahr 10", value: lastProj ? eur(Math.round(lastProj.cf)) : "–", color: lastProj && lastProj.cf >= 0 ? "#4ade80" : "#f87171", sub: "p.a." },
                        { label: "CF-Entwicklung", value: lastProj ? `${lastProj.cf - (chartData[0]?.cf ?? 0) >= 0 ? "+" : ""}${eur(Math.round(lastProj.cf - (chartData[0]?.cf ?? 0)))}` : "–", color: lastProj && lastProj.cf >= (chartData[0]?.cf ?? 0) ? "#4ade80" : "#f87171", sub: "über 10 Jahre" },
                        { label: "Cashflow-Summe (10J)", value: eur(Math.round(chartData.reduce((s, y) => s + y.cf, 0))), color: chartData.reduce((s, y) => s + y.cf, 0) >= 0 ? "#4ade80" : "#f87171", sub: "kumuliert, Jahr 1-10" },
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

            {/* ETF-Vergleich: der ETF-Wert ist aus dem echten, bereits freien
                Eigenkapital berechnet und deshalb immer sichtbar; nur der
                Hauswert (hängt vom PRO-Cashflow ab) ist PRO. */}
            {eigenkapitalEFH > 0 && (
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Schlägt dieses Haus eine ETF-Anlage?</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
                  Vereinfachter Vergleich über 10 Jahre — dein Eigenkapital ({eur(Math.round(Math.max(0, eigenkapitalEFH)))}) angelegt zu 7 % p.a. vs. das Haus (kumulierter Cashflow, ohne Wertsteigerung eingerechnet).
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>ETF (7 % p.a.)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{eur(Math.round(realEtfWert10y))}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>nach 10 Jahren</div>
                  </div>
                  <ProGate plan={plan} feature="Der ETF-Vergleich" compact>
                    <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dieses Haus</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#FCDC45" }}>{eur(Math.round(etfData.immoWert10y))}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>EK + Cashflow, 10J</div>
                    </div>
                  </ProGate>
                </div>
                <ProGate plan={plan} feature="Der ETF-Vergleich" message="Ist diese Immobilie besser als ein ETF-Investment? Jetzt vergleichen.">
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: etfData.etfDelta >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${etfData.etfDelta >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, fontSize: 12.5, color: etfData.etfDelta >= 0 ? "#4ade80" : "#f87171", fontWeight: 600, textAlign: "center" }}>
                    {etfData.etfDelta >= 0
                      ? `Das Haus schlägt die ETF-Anlage um ${eur(Math.round(etfData.etfDelta))}`
                      : `Die ETF-Anlage liegt um ${eur(Math.round(-etfData.etfDelta))} vorn`}
                  </div>
                </ProGate>
              </div>
            )}

            {/* Break-even & NK */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Kennzahlen</div>
                {[
                  { label: "Nettomietrendite", value: pct(noiYield), color: noiYield >= 0.05 ? "#4ade80" : noiYield >= 0.03 ? "#FCDC45" : "#f87171" },
                  { label: "DSCR", value: dscr ? dscr.toFixed(2) : "–", color: dscr && dscr >= 1.2 ? "#4ade80" : dscr && dscr >= 1.0 ? "#FCDC45" : "#f87171" },
                  { label: "NOI p.a.", value: eur(Math.round(noiJahr)), color: "rgba(255,255,255,0.75)" },
                  { label: "All-in Kaufpreis", value: eur(allIn), color: "rgba(255,255,255,0.75)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Kaufnebenkosten</div>
                {[
                  { label: "Grunderwerbsteuer", value: Math.round(KP * nkGrEStPct) },
                  { label: "Notar", value: Math.round(KP * nkNotarPct) },
                  { label: "Grundbuch", value: Math.round(KP * nkGrundbuchPct) },
                  { label: "Makler", value: Math.round(KP * nkMaklerPct) },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{eur(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, background: "rgba(252,220,69,0.05)", borderRadius: 8, border: "1px solid rgba(252,220,69,0.12)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Summe NK</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#FCDC45" }}>{eur(nkBetrag)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RECHTS: Ergebnis sticky */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Beispielobjekt-Hinweis */}
            {isBeispiel && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.22)", fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}
              >
                <span>✨ Das ist ein <strong style={{ color: "#FCDC45" }}>Beispielobjekt</strong> — trag oben deine eigenen Daten ein für dein echtes Ergebnis.</span>
              </motion.div>
            )}

            {/* Score & Entscheidung */}
            <StaggerItem index={0}>
            <motion.div
              ref={tourScoreRef}
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
                    <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * displayScorePct / 100)} 201`} strokeLinecap="round" style={{ transition: "stroke 0.4s ease-out" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{Math.round(displayScorePct)}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Empfehlung</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: scoreLabel === "BUY" ? "#4ade80" : scoreLabel === "CHECK" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>
                    <AnimatedValue value={decisionLabelText} />
                  </div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(cashflowMonat)), good: cashflowMonat >= 200, okay: cashflowMonat >= 0 },
                  { label: "Rendite (NOI)", value: pct(noiYield), good: noiYield >= 0.05, okay: noiYield >= 0.03 },
                  { label: "Schuldendeckung", value: dscr ? dscr.toFixed(2) : "–", good: !!dscr && dscr >= 1.2, okay: !!dscr && dscr >= 1.0 },
                ].map((kpi) => {
                  const statusColor = kpi.good ? "#4ade80" : kpi.okay ? "#FCDC45" : "#f87171";
                  return (
                    <div key={kpi.label} style={{ background: `linear-gradient(180deg, ${statusColor}14 0%, rgba(0,0,0,0.25) 55%)`, border: `1px solid ${statusColor}33`, borderTop: `2px solid ${statusColor}`, borderRadius: 10, padding: "9px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{kpi.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}><AnimatedValue value={kpi.value} /></div>
                      <div style={{ marginTop: 6, display: "inline-block", padding: "2px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${statusColor}26`, color: statusColor }}>
                        {kpi.good ? "Gut" : kpi.okay ? "Okay" : "Niedrig"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: scoreColor, borderRadius: 2, transition: "width 0.6s ease, background 0.4s ease-out" }} />
              </div>
            </motion.div>
            </StaggerItem>

            {/* Textliche Einordnung -- PRO: narrative/marketComparison existieren
                clientseitig für Free-User gar nicht (siehe useEfhProAnalysis).
                NarrativeTeaser zeigt Free-Usern einen echten Halbsatz aus bereits
                freien Werten, gefolgt von geblurrtem Fülltext. */}
            <StaggerItem index={1}>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>💬</span>
                <div style={{ flex: 1 }}>
                  <NarrativeTeaser
                    plan={plan}
                    feature="Die ausführliche Handlungsempfehlung"
                    teaser={narrativeTeaser}
                    filler={PLACEHOLDER_NARRATIVE_FILLER}
                    fullContent={
                      showEfhProLoading ? (
                        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>Analyse wird berechnet …</span>
                      ) : (
                        <AnimatedValue value={narrative} style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.8)", fontStyle: "italic" }} />
                      )
                    }
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>📊</span>
                <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.5)", filter: isPro(plan) ? "none" : "blur(4px)", userSelect: isPro(plan) ? "auto" : "none" }}>
                  {marketComparison || PLACEHOLDER_MARKET_COMPARISON}
                </div>
              </div>
            </div>
            </StaggerItem>

            {/* Versteckte Karte fuer den Bild-Export */}
            <div style={{ position: "fixed", left: -9999, top: 0, width: 640, pointerEvents: "none" }} aria-hidden="true">
              <div ref={shareCardRef} style={{ width: 640, padding: 40, background: "linear-gradient(160deg, #0a1628 0%, #161b22 100%)", fontFamily: "inherit" }}>
                {/* Branding nur für Free -- PRO-Nutzer teilen ohne PROPORA-Wasserzeichen */}
                {!isPro(plan) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#FCDC45", letterSpacing: "-0.02em" }}>PROPORA</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Immo-Analyzer</span>
                  </div>
                )}
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{isBeispiel ? "Beispielobjekt" : (adresse || "Einfamilienhaus")}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginBottom: 28 }}>{eur(kaufpreis)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
                  <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                    <svg width="110" height="110" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7" strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Empfehlung</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: scoreLabel === "BUY" ? "#4ade80" : scoreLabel === "CHECK" ? "#FCDC45" : "#f87171" }}>{decisionLabelText}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                  {[
                    { label: "Cashflow/Monat", value: eur(Math.round(cashflowMonat)) },
                    { label: "Rendite (NOI)", value: pct(noiYield) },
                    { label: "Schuldendeckung", value: dscr ? dscr.toFixed(2) : "–" },
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

            {/* Spielwiese — direkt unter dem Ergebnis */}
            <StaggerItem index={2}>
            <div ref={tourSpielwieseRef} style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <style>{`.efh-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.efh-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.efh-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>🎛️ Spielwiese</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>wirkt sofort oben</span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Kaufpreis anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: priceAdjPct < 0 ? "#4ade80" : priceAdjPct > 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}><AnimatedValue value={signedPct(priceAdjPct)} /></span>
                  </div>
                  <input type="range" min={-0.3} max={0.3} step={0.005} value={priceAdjPct} onChange={(e) => setPriceAdjPct(Number(e.target.value))} className="efh-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+30%</span></div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}><AnimatedValue value={signedPct(rentAdjPct)} /></span>
                  </div>
                  <input type="range" min={-0.3} max={0.5} step={0.005} value={rentAdjPct} onChange={(e) => setRentAdjPct(Number(e.target.value))} className="efh-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+50%</span></div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                  Anpassungen in Bewertung berücksichtigen
                </label>
              </div>
            </div>
            </StaggerItem>

            {/* Tipps */}
            {tips.length > 0 && (
              <StaggerItem index={3}>
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
                { term: "DSCR", def: "Wie gut die Mieteinnahmen die Kreditrate decken. Über 1,2 ist solide." },
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
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>{decisionLabelText}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  {[
                    { label: `${eur(Math.round(cashflowMonat))} mtl.` },
                    { label: `Rendite ${pct(noiYield)}` },
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
}

/* ----------------------------------------------------------------
 *  Entscheidungs-Komponente
 * ---------------------------------------------------------------- */

function EinfamilienhausDecisionSummary({
  scorePct,
  scoreLabel,
  scoreColor,
  decisionLabelText,
  decisionText,
  cashflowText,
  noiJahr,
  annuityYear,
  allIn,
  tips,
}: any) {
  return (
    <div
      className="rounded-2xl p-4 text-white"
      style={{ background: "linear-gradient(135deg, rgba(15,44,138,0.9) 0%, rgba(124,58,237,0.7) 100%)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "16px" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs opacity-80">
            Zwischenstand (auf Basis deiner Eingaben)
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            {decisionLabelText}
          </div>

          <div className="text-sm opacity-90 max-w-xl">
            {decisionText}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div>{cashflowText}</div>
            <div>
              Jährlicher Netto-Mietertrag (NOI): {eur(Math.round(noiJahr))}
            </div>
            {annuityYear > 0 && (
              <div>
                Jährliche Kreditrate (inkl. Zins & Tilgung):{" "}
                {eur(Math.round(annuityYear))}
              </div>
            )}
            <div>
              All-in-Kaufpreis (inkl. NK): {eur(Math.round(allIn))}
            </div>
            <div className="text-xs opacity-80 pt-1">
              NOI = Netto-Mietertrag nach laufenden Kosten und
              Instandhaltung, vor Finanzierung.
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
          {tips.map((t: any, i: number) => (
            <li key={i}>
              <b>{t.label}:</b> {t.detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  SliderRow
 * ---------------------------------------------------------------- */

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

/* ----------------------------------------------------------------
 *  ANNUNITY HELPER
 * ---------------------------------------------------------------- */

function annuityExact(loan: number, r: number, years: number) {
  if (loan <= 0 || r <= 0 || years <= 0) return 0;
  const n = Math.round(years);
  const ann = (loan * r) / (1 - Math.pow(1 + r, -n));
  return ann;
}
