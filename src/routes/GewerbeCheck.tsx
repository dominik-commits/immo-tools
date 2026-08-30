// src/routes/GewerbeCheck.tsx
// Gewerbe-Check (v4) – PRO
// Einheitliches UI: Intro, Zwischenstand, Spielwiese, Details, Sticky-Footer.

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Briefcase,
  Building2,
  RefreshCw,
  Upload,
  Chrome,
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import PlanGuard from "@/components/PlanGuard";
import { OnboardingWizard } from "../components/OnboardingWizard";
import { SaveToPortfolioButton } from "../components/SaveToPortfolioButton";
import { generateGewerbePdf } from "../utils/generateGewerbePdf";
import { useUserPlan } from "../hooks/useUserPlan";
import { useUser } from "@clerk/clerk-react";
import ImportFromImmoScout from "@/components/ImportFromImmoScout";
import html2canvas from "html2canvas";
import { Share2, MapPin } from "lucide-react";

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
  const [draft, setDraft] = React.useState<string | null>(null);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${focused ? "rgba(252,220,69,0.4)" : "rgba(255,255,255,0.08)"}`, color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type="text" inputMode="decimal"
          value={displayVal} placeholder={focused ? formattedValue : (placeholder ?? "")}
          onFocus={() => { setFocused(true); setDraft(""); }}
          onBlur={() => { setFocused(false); if (draft !== null && draft.trim() !== "") { const p = parseFloat(draft.replace(/\./g, "").replace(",", ".")); if (Number.isFinite(p)) onChange(p); } setDraft(null); }}
          onChange={(e) => { const r = e.target.value; setDraft(r); if (r.trim() !== "") { const p = parseFloat(r.replace(/\./g, "").replace(",", ".")); if (Number.isFinite(p)) onChange(p); } }}
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
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const percentStep = step ? step * 100 : 0.5;
  const decimals = percentStep < 1 ? Math.max(0, Math.ceil(-Math.log10(percentStep))) : 0;
  const rawValue = Number.isFinite(value) ? Number((value * 100).toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="flex items-center gap-2">
        <input
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
          className="w-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, flexShrink: 0 }}>%</span>
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
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const percentStep = step ? step * 100 : 0.5;
  const decimals = percentStep < 1 ? Math.max(0, Math.ceil(-Math.log10(percentStep))) : 0;
  const rawValue = Number.isFinite(value) ? Number((value * 100).toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <div className="text-xs ">{label}</div>
      <div className="flex items-center gap-2">
        <input
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
          className="w-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }}
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
  const { user: clerkUser } = useUser();
  const { plan } = useUserPlan();
  const investorName = clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || "Propora-Nutzer";
  const [adresse, setAdresse] = React.useState("");
  const [plz, setPlz] = React.useState("");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
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
  const [ltvPct, setLtvPct] = useState(0.3);
  const [zinsPct, setZinsPct] = useState(0.045);
  const [laufzeitYears, setLaufzeitYears] = useState(30);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // Toast
  const [toast, setToast] = useState<ToastState>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isBeispiel = !adresse && kaufpreis === 1_200_000;
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

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
    { ref: tourTabsRef, title: "Deine Eingaben", text: "Kaufpreis, Mietflächen und Betriebskosten sind Tabs — du kannst frei zwischen ihnen wechseln, ohne zu scrollen." },
    { ref: tourScoreRef, title: "Dein Ergebnis, live", text: "Score und Empfehlung aktualisieren sich sofort bei jeder Eingabe, egal in welchem Tab du gerade bist." },
    { ref: tourSpielwieseRef, title: "Spielwiese", text: "Zieh die Regler, um Was-wäre-wenn-Szenarien durchzuspielen — ohne deine echten Werte zu verändern." },
    { ref: tourShareRef, title: "Ergebnis teilen", text: "Ein Klick erstellt eine Bild-Karte deines Ergebnisses zum Teilen oder Speichern." },
  ] as const;

  // Adress-Autovervollständigung (OpenStreetMap Nominatim, kein API-Key nötig)
  type AddressSuggestion = { label: string; postcode: string; lat: string; lon: string };
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
              return { label: [street, city].filter(Boolean).join(", "), postcode: a.postcode as string, lat: d.lat, lon: d.lon };
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

  // Textliche Zusammenfassung statt nur Zahlen
  const eigenkapitalGewerbe = Math.max(0, KP + nkBetrag - loan);
  const narrative = useMemo(() => {
    if (scoreLabel === "BUY") {
      return `Dieses Objekt trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonatY1))}/Monat im Plus.`;
    }
    if (valueGap < 0) {
      return `Der Modellwert (${eur(Math.round(wertAusCap))}) liegt unter dem Kaufpreis — verhandle den Preis oder prüfe, ob Miete und Cap-Rate realistisch angesetzt sind.`;
    }
    if (cashflowMonatY1 < 0) {
      return "Mit den aktuellen Annahmen bleibt der Cashflow negativ — prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel.";
    }
    return "Die Kennzahlen liegen im mittleren Bereich — spiel mit der Spielwiese verschiedene Szenarien durch, um den Deal zu verbessern.";
  }, [scoreLabel, ltvPct, cashflowMonatY1, valueGap, wertAusCap]);

  // Ehrliche Markteinordnung (Richtwert, keine echten Vergleichsdaten pro PLZ)
  const marketComparison = useMemo(() => {
    if (noiYield >= 0.07) return "Deine Rendite liegt über dem für Gewerbeobjekte üblichen Richtwert von ca. 4,5–7 %.";
    if (noiYield >= 0.045) return "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Gewerbeobjekte (ca. 4,5–7 %).";
    return "Deine Rendite liegt unter dem üblichen Richtwert von ca. 4,5–7 % für Gewerbeobjekte.";
  }, [noiYield]);

  // "Schlägt dieses Objekt eine ETF-Anlage?" -- vereinfachter Vergleich (ohne Wertsteigerung)
  const cumulativeCF10y = useMemo(() => projection.reduce((s, y) => s + y.cashflowPA, 0), [projection]);
  const etfWert10y = eigenkapitalGewerbe * Math.pow(1.07, 10);
  const immoWert10y = eigenkapitalGewerbe + cumulativeCF10y;
  const etfDelta = immoWert10y - etfWert10y;

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
            <button onClick={() => setTourStep(0)} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", color: "#FCDC45", display: "inline-flex", alignItems: "center", gap: 6 }}>
              🗺️ Tour
            </button>
            <ExportDropdown onRun={(opts) => { if (opts.json || opts.pdf) handleExportJSON(); }} />
            <SaveToPortfolioButton analyzerType="gewerbe" name={adresse || "Gewerbe Objekt"} adresse={adresse} plz={plz} kaufpreis={kaufpreis} data={{ cashflowMonat: cashflowMonatY1, noiYield, noi: noiY1, dscr: dscr ?? 0 }} />
            {(plan === "pro") ? (
            <button
              onClick={() => generateGewerbePdf({
                investorName, adresse,
                objektBezeichnung: `${zonen.reduce((s,z) => s+z.areaM2,0)} m\u00b2, ${kaufpreis.toLocaleString("de-DE")} \u20ac`,
                kaufpreis, zonen, opexTotalPctBrutto, capexRuecklagePctBrutto,
                capRateAssumed, capEff, bonitaetTop3, indexiert, avgWALT,
                nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
                nkPct, nkBetrag, financingOn, ltvPct, zinsPct, laufzeitYears,
                loan, annuityYear, interestY1, principalY1,
                KP, grossRentYearY1, effRentYearY1, tiUpfront,
                totalOpexY1, recoveredY1, landlordOpexY1, capexY1, noiY1,
                noiYield, dscr, cashflowMonatY1, wertAusCap, valueGap, valueGapPct,
                scorePct, scoreLabel, projection, tilgungsplan,
              })}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#F5C842", border: "none", color: "#111", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Bankbericht
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
                { n: 2 as const, label: "Mietflächen" },
                { n: 3 as const, label: "Betriebskosten" },
                { n: 4 as const, label: "Finanzierung" },
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
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was kostet das Objekt insgesamt?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div ref={addressBoxRef} style={{ gridColumn: "1 / -1", position: "relative" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Objektbezeichnung / Adresse</div>
                  <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                    type="text" placeholder="z.B. Gewerbepark Musterstraße 1, 10115 Berlin"
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
                          onClick={() => { setAdresse(s.label); setPlz(s.postcode); setSelectedCoords({ lat: s.lat, lon: s.lon }); setShowSuggestions(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}
                        >
                          📍 {s.label} <span style={{ color: "rgba(255,255,255,0.35)" }}>· {s.postcode}</span>
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
                Nebenkosten: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(KP * (nkGrEStPct+nkNotarPct+nkGrundbuchPct+nkMaklerPct+nkSonstPct)))}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(KP * (1+nkGrEStPct+nkNotarPct+nkGrundbuchPct+nkMaklerPct+nkSonstPct)))}</strong>
              </div>
            </div>
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
              Weiter zu Mietflächen →
            </button>
            </>)}

            {/* Schritt 2: Mietflächen/Zonen */}
            {activeStep === 2 && (<>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(1)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                ← Zurück
              </button>
              <button onClick={() => setActiveStep(3)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Betriebskosten →
              </button>
            </div>
            </>)}

            {/* Schritt 3: Opex */}
            {activeStep === 3 && (<>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(2)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                ← Zurück
              </button>
              <button onClick={() => setActiveStep(4)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Finanzierung →
              </button>
            </div>
            </>)}

            {/* Schritt 4: Finanzierung */}
            {activeStep === 4 && (<>
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
            <button onClick={() => setActiveStep(3)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              ← Zurück zu Betriebskosten
            </button>
            </>)}

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

            {/* 10-Jahres-Projektion */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>10-Jahres-Projektion</div>
              <div style={{ height: 220, marginBottom: 18 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projection} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTilgGew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCDC45" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#FCDC45" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCfGew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cashflowMonatY1 >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={cashflowMonatY1 >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
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
                    <Area type="monotone" dataKey="tilgungPA" name="Tilgung p.a." stroke="#FCDC45" strokeWidth={2} fill="url(#gradTilgGew)" />
                    <Area type="monotone" dataKey="cashflowPA" name="Cashflow p.a." stroke={cashflowMonatY1 >= 0 ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#gradCfGew)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ETF-Vergleich */}
            {eigenkapitalGewerbe > 0 && (
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Schlägt dieses Objekt eine ETF-Anlage?</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
                  Vereinfachter Vergleich über 10 Jahre — dein Eigenkapital ({eur(Math.round(eigenkapitalGewerbe))}) angelegt zu 7 % p.a. vs. das Objekt (kumulierter Cashflow, ohne Wertsteigerung eingerechnet).
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>ETF (7 % p.a.)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{eur(Math.round(etfWert10y))}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>nach 10 Jahren</div>
                  </div>
                  <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dieses Objekt</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#FCDC45" }}>{eur(Math.round(immoWert10y))}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>EK + Cashflow, 10J</div>
                  </div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: etfDelta >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${etfDelta >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, fontSize: 12.5, color: etfDelta >= 0 ? "#4ade80" : "#f87171", fontWeight: 600, textAlign: "center" }}>
                  {etfDelta >= 0
                    ? `Das Objekt schlägt die ETF-Anlage um ${eur(Math.round(etfDelta))}`
                    : `Die ETF-Anlage liegt um ${eur(Math.round(-etfDelta))} vorn`}
                </div>
              </div>
            )}

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
                  { label: "Cashflow/Monat", value: eur(Math.round(cashflowMonatY1)), good: cashflowMonatY1 >= 500, okay: cashflowMonatY1 >= 0 },
                  { label: "NOI-Yield", value: pct(noiYield), good: noiYield >= 0.065, okay: noiYield >= 0.045 },
                  { label: "DSCR", value: dscr ? dscr.toFixed(2) : "–", good: !!dscr && dscr >= 1.3, okay: !!dscr && dscr >= 1.2 },
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

            {/* Textliche Einordnung */}
            <StaggerItem index={1}>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>💬</span>
                <AnimatedValue value={narrative} style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.8)", fontStyle: "italic" }} />
              </div>
              <div style={{ display: "flex", gap: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>📊</span>
                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.5)" }}>{marketComparison}</div>
              </div>
            </div>
            </StaggerItem>

            {/* Versteckte Karte fuer den Bild-Export */}
            <div style={{ position: "fixed", left: -9999, top: 0, width: 640, pointerEvents: "none" }} aria-hidden="true">
              <div ref={shareCardRef} style={{ width: 640, padding: 40, background: "linear-gradient(160deg, #0a1628 0%, #161b22 100%)", fontFamily: "inherit" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#FCDC45", letterSpacing: "-0.02em" }}>PROPORA</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Immo-Analyzer</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{isBeispiel ? "Beispielobjekt" : (adresse || "Gewerbe-Analyse")}</div>
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
                    { label: "Cashflow/Monat", value: eur(Math.round(cashflowMonatY1)) },
                    { label: "NOI-Yield", value: pct(noiYield) },
                    { label: "DSCR", value: dscr ? dscr.toFixed(2) : "–" },
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
              <style>{`.gew-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.gew-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.gew-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
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
                  <input type="number" min={-30} max={30} step={0.5} value={(priceAdjPct * 100).toFixed(1)} onChange={(e) => setPriceAdjPct(Number(e.target.value) / 100)} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}><AnimatedValue value={signedPct(rentAdjPct)} /></span>
                  </div>
                  <input type="number" min={-30} max={50} step={0.5} value={(rentAdjPct * 100).toFixed(1)} onChange={(e) => setRentAdjPct(Number(e.target.value) / 100)} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }} />
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

      <OnboardingWizard analyzer="gewerbe" />
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
        type="number"
        min={min * 100}
        max={max * 100}
        step={step * 100}
        value={(value * 100).toFixed(2).replace(/\.?0+$/, "")}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }}
      />
    </div>
  );
}
