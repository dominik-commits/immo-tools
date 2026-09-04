// src/routes/MFHCheck.tsx
// Mehrfamilienhaus-Check – v3.8 (UX-Refresh + Erklärtexte)
// - Fokus auf klare Entscheidungsempfehlung & schnelle Hebel
// - Zwischenstand: Ampel + Begründung + Tipps, optisch hervorgehoben
// - Spielwiese direkt unter dem Zwischenstand
// - Mehr Erklärtexte für Eingaben, Projektion, Monatsrechnung, NK-Details
// - Sidebar schlank (Glossar), etwas weiter nach unten versetzt

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Home as HomeIcon,
  RefreshCw,
  Upload,
  Chrome,
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
import { OnboardingWizard } from "../components/OnboardingWizard";
import { SaveToPortfolioButton } from "../components/SaveToPortfolioButton";
import { ProGate } from "../components/ProGate";
import { NarrativeTeaser } from "../components/NarrativeTeaser";
import { downloadPdfExport } from "../utils/downloadPdfExport";
import { StandortPanel } from "../components/StandortPanel";
import { useUserPlan, isPro, type UserPlan } from "../hooks/useUserPlan";
import { useMfhProAnalysis } from "../hooks/useMfhProAnalysis";
import { buildProjection10y, buildNarrativeTeaser, buildProjectionTeaserContinuation, type MfhProInput } from "../core/mfhCalc";
import { useUser, useAuth } from "@clerk/clerk-react";
import html2canvas from "html2canvas";
import { Share2, MapPin } from "lucide-react";

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

// Generische Beispieltexte/-daten für den geblurrten ProGate-Platzhalter (Free-User).
// Bewusst ohne Bezug zu den echten Eingaben des Nutzers -- nur Illustration.
const PLACEHOLDER_NARRATIVE_FILLER =
  "und die Kennzahlen verbessern sich spürbar, sobald du diese Stellschraube anpasst — Details dazu in der vollständigen Analyse.";
const PLACEHOLDER_MARKET_COMPARISON =
  "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Mehrfamilienhäuser (ca. 4–6 %).";
// Nur der Immobilien-Wert ist erfunden -- der ETF-Wert wird aus dem echten,
// bereits freien Eigenkapital berechnet (siehe DetailsSection).
const PLACEHOLDER_ETF = { immoWert10y: 178_000 };
const PLACEHOLDER_SCORE_BREAKDOWN = { noiYieldScore: 0.58, dscrScore: 0.66, weights: { noiYield: 0.55, dscr: 0.45 } };

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
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
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

/** Animiert einen sich ändernden Wert mit einem kurzen Pop-In — macht "live" spürbar. */
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

/** Kurzer Partikel-Ausbruch, wenn das Ergebnis auf "Rentabel" kippt. Entfernt sich selbst. */
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

/** Gestaffelte Eingangsanimation fuer Sidebar-Karten. */
function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.09, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

/** Geführte Kurz-Tour: Spotlight auf ein Element + Tooltip. Nutzergesteuert, kein Auto-Popup. */
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

export default function MFHCheck() {
  return (
    <PlanGuard required="any">
      <PageInner />
    </PlanGuard>
  );
}
function PageInner() {
  const { user: clerkUser } = useUser();
  const { plan } = useUserPlan();
  const investorName = clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || "Propora-Nutzer";
  const [adresse, setAdresse] = React.useState("");
  const [plz, setPlz] = React.useState("");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
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
  const [pdfExporting, setPdfExporting] = useState(false);
  const { getToken } = useAuth();

  // Kaufpreis & NK
  const [kaufpreis, setKaufpreis] = useState(650_000);
  const isBeispiel = !adresse && kaufpreis === 650_000;
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

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

  // Projektion (10 Jahre). Free: nur Jahr 1-2 lokal sichtbar -- die volle Reihe
  // ist PRO und kommt ausschließlich vom Server (siehe useMfhProAnalysis unten).
  const [mietSteigerung, setMietSteigerung] = useState(0.01);
  const [kostenSteigerung, setKostenSteigerung] = useState(0.015);
  const projectionPreview = useMemo(
    () =>
      buildProjection10y({
        years: 2,
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

  // Score-Ring zaehlt sanft zum Zielwert hoch
  const displayScorePct = useCountUp(scorePct);

  // Konfetti, wenn das Ergebnis frisch auf "Rentabel" kippt
  const [showConfetti, setShowConfetti] = useState(false);
  const prevDecisionRef = useRef<DecisionLabel | null>(null);
  useEffect(() => {
    if (prevDecisionRef.current !== null && prevDecisionRef.current !== "RENTABEL" && decisionLabel === "RENTABEL") {
      setShowConfetti(true);
    }
    prevDecisionRef.current = decisionLabel;
  }, [decisionLabel]);

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
      // kein Alert -- Export ist ein Nice-to-have, kein kritischer Pfad
    } finally {
      setSharing(false);
    }
  }

  // Geführte Kurz-Tour (nutzergesteuert)
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourTabsRef = useRef<HTMLDivElement>(null);
  const tourScoreRef = useRef<HTMLDivElement>(null);
  const tourSpielwieseRef = useRef<HTMLDivElement>(null);
  const tourShareRef = useRef<HTMLButtonElement>(null);
  const tourSteps = [
    { ref: tourTabsRef, title: "Deine Eingaben", text: "Kaufpreis, Einnahmen und Finanzierung sind Tabs — du kannst frei zwischen ihnen wechseln, ohne zu scrollen." },
    { ref: tourScoreRef, title: "Dein Ergebnis, live", text: "Score und Empfehlung aktualisieren sich sofort bei jeder Eingabe, egal in welchem Tab du gerade bist." },
    { ref: tourSpielwieseRef, title: "Spielwiese", text: "Zieh die Regler oder klick eine Schnellauswahl, um Was-wäre-wenn-Szenarien durchzuspielen — ohne deine echten Werte zu verändern." },
    { ref: tourShareRef, title: "Ergebnis teilen", text: "Ein Klick erstellt eine Bild-Karte deines Ergebnisses zum Teilen oder Speichern." },
  ] as const;

  // PRO: Score-Breakdown, Handlungsempfehlung (narrative), volle 10J-Projektion
  // und ETF-Vergleich kommen ausschließlich vom Server (siehe /api/analyze/pro, type: "mfh").
  // Für Free-User wird dieser Call gar nicht erst ausgelöst.
  const mfhProInput: MfhProInput = useMemo(
    () => ({
      noiYield,
      dscr,
      eigenkapital,
      monthlyCF,
      decisionLabel,
      bePrice: bePrice ?? null,
      beRentPerM2: beRentPerM2 ?? null,
      kaufpreisView,
      avgRentPerM2: totals.avgRentPerM2,
      effRentYear,
      nichtUmlagefaehigeKosten,
      capexPct0: capexRuecklagePctBrutto,
      mietSteigerung,
      kostenSteigerung,
      annuitaetJahr,
    }),
    [noiYield, dscr, eigenkapital, monthlyCF, decisionLabel, bePrice, beRentPerM2, kaufpreisView, totals.avgRentPerM2, effRentYear, nichtUmlagefaehigeKosten, capexRuecklagePctBrutto, mietSteigerung, kostenSteigerung, annuitaetJahr]
  );
  const { data: mfhPro, loading: mfhProLoading } = useMfhProAnalysis(mfhProInput, plan);
  const narrative = mfhPro?.narrative ?? "";
  const marketComparison = mfhPro?.marketComparison ?? "";

  // Teaser-Halbsatz für die Handlungsempfehlung -- nutzt nur bereits freie Werte,
  // läuft für jeden Plan (kein PRO-Inhalt, siehe buildNarrativeTeaser).
  const narrativeTeaser = buildNarrativeTeaser({
    decisionLabel,
    eigenkapital,
    monthlyCF,
    bePrice: bePrice ?? null,
    beRentPerM2: beRentPerM2 ?? null,
    kaufpreisView,
    avgRentPerM2: totals.avgRentPerM2,
  });

  /* -------- Layout / Render -------- */

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <OnboardingWizard analyzer="mfh" />
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
            <button onClick={() => setTourStep(0)} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(252,220,69,0.08)", border: "1px solid rgba(252,220,69,0.25)", color: "#FCDC45", display: "inline-flex", alignItems: "center", gap: 6 }}>
              🗺️ Tour
            </button>
            <ExportDropdown onRun={runExport} />
            <SaveToPortfolioButton analyzerType="mfh" name={adresse || "MFH Objekt"} adresse={adresse} plz={plz} kaufpreis={kaufpreis} data={{ cashflowMonat: monthlyCF, noiYield, noi, dscr }} />
            {isPro(plan) ? (
            <button
              disabled={pdfExporting}
              onClick={async () => {
                setPdfExporting(true);
                try {
                  await downloadPdfExport("mfh", {
                    investorName, adresse,
                    objektBezeichnung: `${totals.area.toFixed(0)} m\u00b2, ${kaufpreis.toLocaleString("de-DE")} \u20ac`,
                    kaufpreis, bundesland, gesamtFlaecheM2, kaltmieteJahr, leerstandPct,
                    nichtUmlagefaehigeKosten, capexRuecklagePctBrutto, units, mgmtMode,
                    nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
                    nkRenovierung, nkSanierung, eigenkapital, loan, zins, tilgung, manualLoan,
                    allIn, nkSum, nkPct, noi, noiYield, dscr,
                    annuitaetJahr, annuitaetMonat, zinsMonat, tilgungMonat,
                    monthlyEffRent, monthlyOpex, monthlyCapex, monthlyCF,
                    grossRentAdj, effRentYear,
                    scorePct, decisionLabel, decisionText, bePrice, beRentPerM2,
                    avgRentPerM2: totals.avgRentPerM2,
                    projection: (mfhPro?.projectionFull ?? []).map(p => ({ ...p, effRent: 0 })),
                    amort: amort.rows.map(r => ({ year: r.year, restschuld: r.outstanding, zinsen: r.interest, tilgungsBetrag: r.principal })),
                  }, getToken);
                } catch {
                  alert("PDF-Export fehlgeschlagen. Bitte sp\u00e4ter erneut versuchen.");
                } finally {
                  setPdfExporting(false);
                }
              }}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: pdfExporting ? "wait" : "pointer", background: "#F5C842", border: "none", color: "#111", display: "inline-flex", alignItems: "center", gap: 6, opacity: pdfExporting ? 0.6 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              {pdfExporting ? "Wird erstellt\u2026" : "Bankbericht"}
            </button>
            ) : (
            <button onClick={() => setShowUpgradeModal(true)}
              style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "not-allowed", background: "rgba(245,200,66,0.15)", border: "1px solid rgba(245,200,66,0.25)", color: "rgba(245,200,66,0.35)", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Bankbericht <span style={{fontSize:10}}>BASIS+</span>
            </button>
            )}
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

            {/* Schritt-Tabs: frei wechselbar, Ergebnis rechts bleibt immer live */}
            <div ref={tourTabsRef} style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 5 }}>
              {[
                { n: 1 as const, label: "Kaufpreis & Kosten" },
                { n: 2 as const, label: "Einnahmen & Fläche" },
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

            {/* Sektion-Label */}
            {activeStep === 1 && (<>
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
                <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
                  <div ref={addressBoxRef} style={{ position: "relative" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Objektbezeichnung / Adresse</div>
                    <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                      type="text" placeholder="z.B. Musterstraße 12, Berlin"
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
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>PLZ</div>
                    <input className="w-full rounded-xl px-3 text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" as const, width: "100%" }}
                      type="text" inputMode="numeric" maxLength={5} placeholder="10115"
                      value={plz} onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <StandortPanel plz={plz} />
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
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
              Weiter zu Einnahmen & Fläche →
            </button>
            </>)}

            {/* Sektion-Label */}
            {activeStep === 2 && (<>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setActiveStep(1)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                ← Zurück
              </button>
              <button onClick={() => setActiveStep(3)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FCDC45", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13.5, color: "#0d1117", fontWeight: 700, boxShadow: "0 2px 12px rgba(252,220,69,0.25)" }}>
                Weiter zu Finanzierung →
              </button>
            </div>
            </>)}

            {/* Sektion-Label */}
            {activeStep === 3 && (<>
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
            <button onClick={() => setActiveStep(2)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              ← Zurück zu Einnahmen & Fläche
            </button>
            </>)}

            {/* Details */}
            <DetailsSection
              noiYield={noiYield} dscr={dscr} annuitaetMonat={annuitaetMonat} allIn={allIn}
              noi={noi} annuitaetJahr={annuitaetJahr} bePrice={bePrice} beRentPerM2={beRentPerM2}
              projectionPreview={projectionPreview} projectionFull={mfhPro?.projectionFull ?? null}
              proLoading={mfhProLoading} scoreBreakdown={mfhPro?.scoreBreakdown ?? null}
              etf={mfhPro?.etf ?? null} plan={plan} scorePct={scorePct}
              monthlyEffRent={monthlyEffRent} monthlyOpex={monthlyOpex}
              monthlyCapex={monthlyCapex} monthlyCF={monthlyCF} zinsMonat={zinsMonat}
              tilgungMonat={tilgungMonat} amort={amort}
              nkBreakdown={{ bundesland, nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct, nkRenovierung, nkSanierung, kaufpreisView, nkSum }}
              eigenkapital={eigenkapital}
            />
          </div>

          {/* ── RECHTE SPALTE: Ergebnis (sticky) ─────────── */}
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

              {/* Score-Ring + Entscheidung */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={decisionColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * displayScorePct / 100)} 201`} strokeLinecap="round" style={{ transition: "stroke 0.4s ease-out" }}/>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{Math.round(displayScorePct)}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Score</span>
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

              {/* 3 KPI-Kacheln */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(monthlyCF)), good: monthlyCF >= 100, okay: monthlyCF >= 0 },
                  { label: "Rendite (NOI)", value: pct(noiYield), good: noiYield >= 0.05, okay: noiYield >= 0.035 },
                  { label: "Schuldendeckung", value: annuitaetJahr > 0 ? dscr.toFixed(2) : "–", good: dscr >= 1.2, okay: dscr >= 1.0 },
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

              {/* Progress bar */}
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: decisionColor, borderRadius: 2, transition: "width 0.6s ease, background 0.4s ease-out" }} />
              </div>
            </motion.div>
            </StaggerItem>

            {/* Textliche Einordnung -- PRO: narrative/marketComparison existieren
                clientseitig für Free-User gar nicht (siehe useMfhProAnalysis).
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
                      isPro(plan) && mfhProLoading && !mfhPro ? (
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
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{isBeispiel ? "Beispielobjekt" : (adresse || "Mehrfamilienhaus")}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginBottom: 28 }}>{eur(kaufpreis)} · {totals.area.toFixed(0)} m²</div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
                  <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                    <svg width="110" height="110" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke={decisionColor} strokeWidth="7" strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round" />
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
                    { label: "Schuldendeckung", value: annuitaetJahr > 0 ? dscr.toFixed(2) : "–" },
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
            <div ref={tourSpielwieseRef}>
              <PlaygroundCard priceAdjPct={priceAdjPct} setPriceAdjPct={setPriceAdjPct} rentAdjPct={rentAdjPct} setRentAdjPct={setRentAdjPct} applyAdjustments={applyAdjustments} setApplyAdjustments={setApplyAdjustments} />
            </div>
            </StaggerItem>

            {/* Hebel / Tipps */}
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
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <div>
              <span style={labelStyle}>Fläche (m²)</span>
              <input
                type="number" style={inputStyle}
                value={u.areaM2}
                onChange={(e) => updateUnit({ id: u.id, patch: { areaM2: num(e.target.value, u.areaM2) } })}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <div>
              <span style={labelStyle}>€/m²/Monat</span>
              <input
                type="number" step={0.1} style={inputStyle}
                value={u.rentPerM2}
                onChange={(e) => updateUnit({ id: u.id, patch: { rentPerM2: num(e.target.value, u.rentPerM2) } })}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
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

type MfhProjectionYear = { year: number; noi: number; cf: number };
type MfhScoreBreakdown = { noiYieldScore: number; dscrScore: number; weights: { noiYield: number; dscr: number } };
type MfhEtfComparison = { eigenkapital: number; etfWert10y: number; immoWert10y: number; etfDelta: number };

function DetailsSection(props: {
  noiYield: number;
  dscr: number;
  annuitaetMonat: number;
  allIn: number;
  noi: number;
  annuitaetJahr: number;
  bePrice: number | null;
  beRentPerM2: number | null;
  // Free: nur Jahr 1-2. PRO: volle 10-Jahres-Reihe, Score-Breakdown & ETF-Vergleich
  // -- projectionFull/scoreBreakdown/etf sind null ohne PRO-Account bzw. solange
  // die Server-Antwort noch aussteht (siehe useMfhProAnalysis).
  projectionPreview: MfhProjectionYear[];
  projectionFull: MfhProjectionYear[] | null;
  proLoading: boolean;
  scoreBreakdown: MfhScoreBreakdown | null;
  etf: MfhEtfComparison | null;
  plan: UserPlan;
  scorePct: number;
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
  eigenkapital: number;
}) {
  const {
    noiYield, dscr, annuitaetMonat, allIn, noi, annuitaetJahr,
    bePrice, beRentPerM2, projectionPreview, projectionFull, proLoading,
    scoreBreakdown, etf, plan, scorePct,
    monthlyEffRent, monthlyOpex, monthlyCapex, monthlyCF,
    zinsMonat, tilgungMonat, amort, nkBreakdown, eigenkapital,
  } = props;
  const ekPositive = Math.max(0, eigenkapital);
  const showProLoading = isPro(plan) && proLoading && !projectionFull;
  // Geblurrter Chart-Teaser: schreibt die ECHTEN Jahr-1/2-Werte dekorativ fort
  // (keine echte Prognose), statt eine beliebige Fantasiekurve zu zeigen.
  const chartData = projectionFull ?? buildProjectionTeaserContinuation(projectionPreview);
  const breakdown = scoreBreakdown ?? PLACEHOLDER_SCORE_BREAKDOWN;
  // ETF-Wert ist aus dem bereits freien Eigenkapital exakt berechenbar -- keine
  // Fantasiezahl nötig. Nur der Immobilien-Wert (hängt vom PRO-Cashflow ab)
  // bleibt erfunden+geblurrt.
  const realEtfWert10y = ekPositive * Math.pow(1.07, 10);
  const etfData = etf ?? { eigenkapital: ekPositive, etfWert10y: realEtfWert10y, immoWert10y: PLACEHOLDER_ETF.immoWert10y, etfDelta: PLACEHOLDER_ETF.immoWert10y - realEtfWert10y };

  const C = {
    card: { background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 } as React.CSSProperties,
    sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" } as React.CSSProperties,
    divider: { flex: 1, height: 1, background: "rgba(255,255,255,0.06)" } as React.CSSProperties,
  };

  const lastProj = chartData[chartData.length - 1];
  const cfTrend = lastProj ? lastProj.cf - (chartData[0]?.cf ?? 0) : 0;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <span style={C.sectionLabel}>Detailberechnungen</span>
        <div style={C.divider} />
      </div>

      {/* Monatsrechnung */}
      <div style={C.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatliche Cashflow-Aufschlüsselung</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Betriebsergebnis vs. Kreditrate</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Break-even Szenarien</div>
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

      {/* Score-Breakdown (PRO) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Score-Breakdown</span>
        <div style={C.divider} />
      </div>
      <ProGate plan={plan} feature="Der Score-Breakdown" message={`Sieh genau, warum dein Score bei ${scorePct}% liegt — und was ihn verbessert`}>
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
            <div style={{ fontSize: 18, fontWeight: 700, color: y.cf >= 0 ? "#4ade80" : "#f87171", fontVariantNumeric: "tabular-nums" }}>{eur(Math.round(y.cf))}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>NOI: {eur(Math.round(y.noi))}</div>
          </div>
        ))}
      </div>
      <ProGate plan={plan} feature="Die volle 10-Jahres-Projektion" message="Sieh die komplette 10-Jahres-Entwicklung deines Cashflows">
        <div style={C.card}>
          {showProLoading ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "40px 0", textAlign: "center" }}>Projektion wird berechnet …</div>
          ) : (
            <>
              <div style={{ height: 220, marginBottom: 18 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradNoiMfh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCDC45" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#FCDC45" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCfMfh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={monthlyCF >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={monthlyCF >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
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
                    <Area type="monotone" dataKey="noi" name="NOI p.a." stroke="#FCDC45" strokeWidth={2} fill="url(#gradNoiMfh)" />
                    <Area type="monotone" dataKey="cf" name="Cashflow p.a." stroke={monthlyCF >= 0 ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#gradCfMfh)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  { label: "Betriebsergebnis Jahr 10", value: lastProj ? eur(Math.round(lastProj.noi)) : "–", color: "#FCDC45", sub: "p.a." },
                  { label: "Cashflow Jahr 10", value: lastProj ? eur(Math.round(lastProj.cf)) : "–", color: lastProj && lastProj.cf >= 0 ? "#4ade80" : "#f87171", sub: "p.a." },
                  { label: "CF-Entwicklung", value: `${cfTrend >= 0 ? "+" : ""}${eur(Math.round(cfTrend))}`, color: cfTrend >= 0 ? "#4ade80" : "#f87171", sub: "über 10 Jahre" },
                  { label: "Cashflow-Summe (10J)", value: eur(Math.round(chartData.reduce((s, y) => s + y.cf, 0))), color: chartData.reduce((s, y) => s + y.cf, 0) >= 0 ? "#4ade80" : "#f87171", sub: "kumuliert, Jahr 1-10" },
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
            </>
          )}
        </div>
      </ProGate>

      {/* ETF-Vergleich: der ETF-Wert ist aus dem echten, bereits freien Eigenkapital
          berechnet und deshalb immer sichtbar; nur der Immobilien-Wert (hängt vom
          PRO-Cashflow ab) ist PRO. */}
      {ekPositive > 0 && (
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Schlägt diese Immobilie eine ETF-Anlage?</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
            Vereinfachter Vergleich über 10 Jahre — dein Eigenkapital ({eur(Math.round(ekPositive))}) angelegt zu 7 % p.a. vs. die Immobilie (kumulierter Cashflow, ohne Wertsteigerung eingerechnet).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>ETF (7 % p.a.)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{eur(Math.round(realEtfWert10y))}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>nach 10 Jahren</div>
            </div>
            <ProGate plan={plan} feature="Der ETF-Vergleich" compact>
              <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Diese Immobilie</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#FCDC45" }}>{eur(Math.round(etfData.immoWert10y))}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>EK + Cashflow, 10J</div>
              </div>
            </ProGate>
          </div>
          <ProGate plan={plan} feature="Der ETF-Vergleich" message="Ist diese Immobilie besser als ein ETF-Investment? Jetzt vergleichen.">
            <div style={{ padding: "10px 14px", borderRadius: 10, background: etfData.etfDelta >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${etfData.etfDelta >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, fontSize: 12.5, color: etfData.etfDelta >= 0 ? "#4ade80" : "#f87171", fontWeight: 600, textAlign: "center" }}>
              {etfData.etfDelta >= 0
                ? `Die Immobilie schlägt die ETF-Anlage um ${eur(Math.round(etfData.etfDelta))}`
                : `Die ETF-Anlage liegt um ${eur(Math.round(-etfData.etfDelta))} vorn`}
            </div>
          </ProGate>
        </div>
      )}

      {/* Nebenkosten + Tilgung */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={C.sectionLabel}>Kapitaleinsatz & Schuldenabbau</span>
        <div style={C.divider} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={C.card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Kaufnebenkosten</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Zins & Tilgung (10 Jahre)</div>
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
