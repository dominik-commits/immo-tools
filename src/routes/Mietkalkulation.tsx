// src/routes/Mietkalkulation.tsx
// v2 – UI/UX angelehnt an Mehrfamilienhaus-Check

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Calculator,
  Gauge,
  Info,
  RefreshCw,
  Sigma,
  TrendingUp,
  Download,
  Upload,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import PlanGuard from "@/components/PlanGuard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ----------------------------------------------------------------
 *  BRAND / SURFACE
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

function eur(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      })
    : "–";
}

function eur2(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      })
    : "–";
}

function pct(x: number) {
  return Number.isFinite(x)
    ? (x * 100).toFixed(1).replace(".0", "") + " %"
    : "–";
}

function signedPct(x: number) {
  const v = (x * 100).toFixed(1);
  return (x > 0 ? "+" : "") + v + " %";
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function num(x: any, fb: number) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}

/* ----------------------------------------------------------------
 *  GENERISCHE UI-BAUSTEINE
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
    <div className={`rounded-2xl border p-4 bg-card ${className}`}>
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
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
  suffix?: string;
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
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        {suffix && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  step = 0.001,
  min = 0,
  max = 0.95,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  help?: string;
}) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="flex items-center gap-3 mt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <span className="w-24 text-right tabular-nums text-foreground">
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
  return (
    <div
      className="relative"
      style={{ width: size * 2, height: size * 2 }}
      aria-label={`Score ${scorePct}%`}
    >
      <svg className="absolute inset-0" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gradScoreRent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={scoreColor} />
            <stop offset="100%" stopColor={CTA} />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="url(#gradScoreRent)"
          strokeWidth="12"
          strokeDasharray={`${scorePct * 2.513}, 251.3`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
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

/* ----------------------------------------------------------------
 *  HAUPTKOMPONENTE (BASIS-PLAN)
 * ---------------------------------------------------------------- */

export default function Mietkalkulation() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}

type ProjectionRow = {
  year: number;
  KaltmieteJahr: number;
  UmlageJahr: number;
  NOIJahr: number;
};

function PageInner() {
  const DRAFT_KEY = "mietkalkulation.v2";
  const printRef = useRef<HTMLDivElement>(null);

  // Eingaben
  const [flaecheM2, setFlaecheM2] = useState(68);
  const [mieteProM2Monat, setMieteProM2Monat] = useState(12.5);
  const [umlagefaehigProM2, setUmlagefaehigProM2] = useState(2.8);
  const [nichtUmlagefaehigPct, setNichtUmlagefaehigPct] = useState(0.05);
  const [leerstandPct, setLeerstandPct] = useState(0.06);
  const [mietsteigerungPct, setMietsteigerungPct] = useState(0.02);
  const [kostensteigerungPct, setKostensteigerungPct] = useState(0.02);

  // Draft laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      setFlaecheM2(num(d.flaecheM2, 68));
      setMieteProM2Monat(num(d.mieteProM2Monat, 12.5));
      setUmlagefaehigProM2(num(d.umlagefaehigProM2, 2.8));
      setNichtUmlagefaehigPct(num(d.nichtUmlagefaehigPct, 0.05));
      setLeerstandPct(num(d.leerstandPct, 0.06));
      setMietsteigerungPct(num(d.mietsteigerungPct, 0.02));
      setKostensteigerungPct(num(d.kostensteigerungPct, 0.02));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft speichern
  useEffect(() => {
    const data = {
      flaecheM2,
      mieteProM2Monat,
      umlagefaehigProM2,
      nichtUmlagefaehigPct,
      leerstandPct,
      mietsteigerungPct,
      kostensteigerungPct,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [
    flaecheM2,
    mieteProM2Monat,
    umlagefaehigProM2,
    nichtUmlagefaehigPct,
    leerstandPct,
    mietsteigerungPct,
    kostensteigerungPct,
  ]);

  /* ---------------- Ableitungen ---------------- */

  const kaltMonat = flaecheM2 * mieteProM2Monat; // €/Monat
  const umlageMonat = flaecheM2 * umlagefaehigProM2; // €/Monat
  const warmMonat = kaltMonat + umlageMonat;
  const leerstandEuroMonat = kaltMonat * leerstandPct;
  const nichtUmlageEuroMonat = kaltMonat * nichtUmlagefaehigPct;
  const noiMonat =
    kaltMonat * (1 - leerstandPct) - nichtUmlageEuroMonat; // vereinfacht
  const noiYield =
    kaltMonat > 0 ? clamp(noiMonat / kaltMonat, -5, 5) : 0; // NOI / Bruttokaltmiete

  // Score-Heuristik
  const scoreRaw = clamp(
    0.75 * (1 - leerstandPct) +
      0.25 * (1 - nichtUmlagefaehigPct) -
      0.05 * Math.max(0, umlagefaehigProM2 - 3),
    0,
    1
  );
  const scorePct = Math.round(scoreRaw * 100);
  const scoreColor =
    scoreRaw >= 0.7 ? "#16a34a" : scoreRaw >= 0.5 ? "#f59e0b" : "#ef4444";
  const scoreLabel: "BUY" | "CHECK" | "NO" =
    scoreRaw >= 0.7 ? "BUY" : scoreRaw >= 0.5 ? "CHECK" : "NO";

  const decisionLabelText =
    scoreLabel === "BUY"
      ? "Miete passt – eher grünes Licht"
      : scoreLabel === "CHECK"
      ? "Miete wirkt okay, genauer prüfen"
      : "Miete angespannt – eher Nein";

  let decisionText: string;
  if (scoreLabel === "BUY") {
    decisionText =
      "Leerstand und nicht umlagefähige Kosten liegen im Rahmen. Die Miete wirkt unter den aktuellen Annahmen solide – Feintuning bei Leerstand und Kosten kann die Rendite weiter verbessern.";
  } else if (scoreLabel === "CHECK") {
    decisionText =
      "Die Kennzahlen sind im Mittelfeld. Prüfe besonders Leerstand, nicht umlagefähige Kosten und ob sich eine leichte Mieterhöhung oder Anpassung der Nebenkostenstruktur darstellen lässt.";
  } else {
    decisionText =
      "Leerstand oder nicht umlagefähige Kosten drücken den Netto-Ertrag deutlich. Prüfe, ob die Miete marktgerecht ist und ob sich Kosten optimieren lassen – sonst lieber nach Alternativen schauen.";
  }

  // Tipps
  const tips = useMemo(() => {
    const arr: { label: string; detail: string }[] = [];

    if (leerstandPct > 0.08) {
      arr.push({
        label: "Leerstand verringern",
        detail:
          "Prüfe Vermarktung, Zielgruppe und Mietniveau. Schon wenige Prozentpunkte weniger Leerstand erhöhen NOI und Score merklich.",
      });
    }

    if (nichtUmlagefaehigPct > 0.1) {
      arr.push({
        label: "Nicht umlagefähige Kosten prüfen",
        detail:
          "Verwaltung, Instandhaltung & Rücklagen strukturieren: Was lässt sich langfristig optimieren oder teilweise umlegen?",
      });
    }

    if (umlagefaehigProM2 < 2) {
      arr.push({
        label: "Nebenkosten-Check",
        detail:
          "Liegt die umlagefähige Kostenpauschale im Marktvergleich eher niedrig? Ggf. Nachkalkulation bzw. Anpassung prüfen.",
      });
    }

    if (!arr.length) {
      arr.push({
        label: "Feintuning",
        detail:
          "Die Miete wirkt insgesamt solide. Spiele in der Mietkalkulation mit kleinen Änderungen bei Leerstand, Umlage und Miete/m².",
      });
    }

    return arr.slice(0, 3);
  }, [leerstandPct, nichtUmlagefaehigPct, umlagefaehigProM2]);

  // Projektion 10 Jahre
  const projection: ProjectionRow[] = useMemo(() => {
    const years = 10;
    const data: ProjectionRow[] = [];
    let cold = kaltMonat * 12;
    let opUml = umlageMonat * 12;
    let nonRec = nichtUmlageEuroMonat * 12;

    for (let t = 1; t <= years; t++) {
      if (t > 1) {
        cold *= 1 + mietsteigerungPct;
        opUml *= 1 + kostensteigerungPct;
        nonRec *= 1 + kostensteigerungPct;
      }

      const eff = cold * (1 - leerstandPct);
      const noi = eff - nonRec;

      data.push({
        year: t,
        KaltmieteJahr: Math.round(cold),
        UmlageJahr: Math.round(opUml),
        NOIJahr: Math.round(noi),
      });
    }

    return data;
  }, [
    kaltMonat,
    umlageMonat,
    nichtUmlageEuroMonat,
    mietsteigerungPct,
    kostensteigerungPct,
    leerstandPct,
  ]);

  // Monatsmix Chart
  const mixData = [
    {
      name: "Monat 1",
      Kalt: Math.round(kaltMonat),
      Umlage: Math.round(umlageMonat),
      NOI: Math.round(noiMonat),
    },
  ];

  /* ---------------- Export/Import ---------------- */

  function exportJson() {
    const payload = {
      input: {
        flaecheM2,
        mieteProM2Monat,
        umlagefaehigProM2,
        nichtUmlagefaehigPct,
        leerstandPct,
        mietsteigerungPct,
        kostensteigerungPct,
      },
      output: {
        kaltMonat,
        umlageMonat,
        warmMonat,
        leerstandEuroMonat,
        nichtUmlageEuroMonat,
        noiMonat,
        noiYield,
        score: scoreRaw,
      },
      projection,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mietkalkulation_${ts()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const header1 = ["Kennzahl", "Wert"];
    const kpi = [
      ["Wohnfläche (m²)", flaecheM2],
      ["Kaltmiete (€/m²/Monat)", mieteProM2Monat],
      ["Umlagefähige BK (€/m²/Monat)", umlagefaehigProM2],
      [
        "Nicht umlagefähig (%)",
        (nichtUmlagefaehigPct * 100).toFixed(1).replace(".", ",") + " %",
      ],
      [
        "Leerstand (%)",
        (leerstandPct * 100).toFixed(1).replace(".", ",") + " %",
      ],
      ["NOI (Monat 1)", Math.round(noiMonat)],
      ["Warmmiete (Monat 1)", Math.round(warmMonat)],
      [
        "NOI-Yield (Monat 1)",
        (noiYield * 100).toFixed(1).replace(".", ",") + " %",
      ],
    ];

    const header2 = ["Jahr", "Kaltmiete p.a.", "Umlagen p.a.", "NOI p.a."];
    const projRows = projection.map((r) => [
      r.year,
      r.KaltmieteJahr,
      r.UmlageJahr,
      r.NOIJahr,
    ]);

    const lines = [
      header1.join(";"),
      ...kpi.map((r) =>
        [String(r[0]).replace(/;/g, ","), String(r[1]).toString()].join(";")
      ),
      "",
      header2.join(";"),
      ...projRows.map((cols) => cols.join(";")),
    ];

    const csv = lines.join("\n") + "\n";
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mietkalkulation_${ts()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!printRef.current) return;
    const node = printRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = 595;
    const pageH = 842;
    const margin = 20;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, undefined, "FAST");
    } else {
      let srcY = 0;
      const sliceHeight = ((pageH - margin * 2) * canvas.width) / imgW;

      while (srcY < canvas.height) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(sliceHeight, canvas.height - srcY);
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(
          canvas,
          0,
          srcY,
          canvas.width,
          sliceCanvas.height,
          0,
          0,
          canvas.width,
          sliceCanvas.height
        );
        const part = sliceCanvas.toDataURL("image/png");

        if (srcY > 0) pdf.addPage();
        const partH = (sliceCanvas.height * imgW) / canvas.width;
        pdf.addImage(
          part,
          "PNG",
          margin,
          margin,
          imgW,
          partH,
          undefined,
          "FAST"
        );

        srcY += sliceHeight;
      }
    }

    pdf.save("mietkalkulation.pdf");
  }

  function runSelectedExports(opts: {
    json: boolean;
    csv: boolean;
    pdf: boolean;
  }) {
    if (opts.json) exportJson();
    if (opts.csv) exportCsv();
    if (opts.pdf) exportPdf();
  }

  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setFlaecheM2(num(d.flaecheM2, flaecheM2));
        setMieteProM2Monat(num(d.mieteProM2Monat, mieteProM2Monat));
        setUmlagefaehigProM2(num(d.umlagefaehigProM2, umlagefaehigProM2));
        setNichtUmlagefaehigPct(num(d.nichtUmlagefaehigPct, nichtUmlagefaehigPct));
        setLeerstandPct(num(d.leerstandPct, leerstandPct));
        setMietsteigerungPct(num(d.mietsteigerungPct, mietsteigerungPct));
        setKostensteigerungPct(num(d.kostensteigerungPct, kostensteigerungPct));
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  const cashflowText = `NOI (mtl., Jahr 1): ${eur(Math.round(noiMonat))}`;
  const noiYieldText = `NOI-Yield (Monat 1): ${pct(noiYield)}`;

  /* ---------------- Render ---------------- */

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: SURFACE }}
    >
      <div
        className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-40"
        ref={printRef}
      >
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
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Mietkalkulation
              </h1>
              <p className="text-muted-foreground text-sm">
                Warmmiete, Umlagen und Netto-Mietertrag (NOI) auf einen Blick –
                inklusive 10-Jahres-Projektion.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Mit diesem Tool kalkulierst du aus Fläche, Miete/m², Umlagen,
                Leerstand & nicht umlagefähigen Kosten deinen monatlichen NOI.
                Die Projektion zeigt dir, wie sich Miete und NOI über die Jahre
                unter deinen Annahmen entwickeln.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={() => {
                setFlaecheM2(68);
                setMieteProM2Monat(12.5);
                setUmlagefaehigProM2(2.8);
                setNichtUmlagefaehigPct(0.05);
                setLeerstandPct(0.06);
                setMietsteigerungPct(0.02);
                setKostensteigerungPct(0.02);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>

            <ExportDropdown onRun={runSelectedExports} />

            {/* Import */}
            <label className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input
                type="file"
                className="hidden"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                }}
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
                <h2 className="text-lg font-semibold text-foreground">
                  Eingaben
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  Starte mit Fläche, Miete/m² und Nebenkosten. Leerstand und
                  nicht umlagefähige Kosten bestimmen, wie viel von der
                  vereinbarten Miete bei dir als Netto-Mietertrag ankommt.
                </p>
              </div>

              <InputCard
                title="Grunddaten der Wohnung"
                subtitle="Fläche, Kaltmiete und umlagefähige Betriebskosten"
              >
                <NumberField
                  label="Wohnfläche"
                  value={flaecheM2}
                  onChange={setFlaecheM2}
                  suffix="m²"
                  help="Vermietbare Wohnfläche der Einheit."
                />
                <NumberField
                  label="Kaltmiete"
                  value={mieteProM2Monat}
                  onChange={setMieteProM2Monat}
                  step={0.1}
                  suffix="€/m²/Monat"
                  help="Vertragliche Nettokaltmiete je m² und Monat."
                />
                <NumberField
                  label="Umlagefähige Betriebskosten"
                  value={umlagefaehigProM2}
                  onChange={setUmlagefaehigProM2}
                  step={0.1}
                  suffix="€/m²/Monat"
                  help="Nebenkosten, die du laut Abrechnung auf den Mieter umlegen kannst."
                />
              </InputCard>

              <InputCard
                title="Leerstand & nicht umlagefähige Kosten"
                subtitle="Mietausfall und Kosten, die bei dir hängen bleiben"
              >
                <PercentField
                  label="Nicht umlagefähige Kosten (Quote)"
                  value={nichtUmlagefaehigPct}
                  onChange={setNichtUmlagefaehigPct}
                  step={0.001}
                  min={0}
                  max={0.2}
                  help="Verwaltung, Instandhaltungsanteil etc.; Anteil an der Kaltmiete, der nicht umlagefähig ist."
                />
                <PercentField
                  label="Leerstand / Mietausfall (Quote)"
                  value={leerstandPct}
                  onChange={setLeerstandPct}
                  step={0.001}
                  min={0}
                  max={0.3}
                  help="Anteil der Jahresmiete, der durch Leerstand oder Mietausfall ausfällt."
                />
              </InputCard>

              <InputCard
                title="Projektion (10 Jahre)"
                subtitle="Wachstumsannahmen für Mieten & Kosten"
              >
                <PercentField
                  label="Mietsteigerung p.a."
                  value={mietsteigerungPct}
                  onChange={setMietsteigerungPct}
                  step={0.001}
                  min={0}
                  max={0.06}
                  help="Annahme, wie stark die Kaltmiete pro Jahr wächst."
                />
                <PercentField
                  label="Kostensteigerung p.a."
                  value={kostensteigerungPct}
                  onChange={setKostensteigerungPct}
                  step={0.001}
                  min={0}
                  max={0.06}
                  help="Annahme, wie stark umlagefähige und nicht umlagefähige Kosten pro Jahr steigen."
                />
              </InputCard>
            </section>

            {/* Zwischenstand & Empfehlung */}
            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Zwischenstand & Empfehlung
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Hier siehst du auf einen Blick, wie attraktiv die Miete unter
                  deinen Annahmen ist. NOI, Leerstand und Kosten zeigen dir,
                  ob die Wohnung eher Richtung „halten/kaufen“, „genauer prüfen“
                  oder „eher lassen“ geht.
                </p>
              </div>

              <MietDecisionSummary
                scorePct={scorePct}
                scoreLabel={scoreLabel}
                scoreColor={scoreColor}
                decisionLabelText={decisionLabelText}
                decisionText={decisionText}
                cashflowText={cashflowText}
                noiYieldText={noiYieldText}
                warmMonat={warmMonat}
                leerstandEuroMonat={leerstandEuroMonat}
                nichtUmlageEuroMonat={nichtUmlageEuroMonat}
                tips={tips}
              />
            </section>

            {/* Ergebnisse & Details */}
            <section className="space-y-6 pt-4">
              <h2 className="text-sm font-semibold text-foreground">
                Ergebnisse & Details
              </h2>

              {/* Monatsmix-Chart */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-foreground">
                    Monatsmix im ersten Jahr
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Kaltmiete, Umlagen und NOI (Monat 1)
                  </span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mixData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis
                        tickFormatter={(v: any) =>
                          Number(v).toLocaleString("de-DE")
                        }
                      />
                      <RTooltip formatter={(v: any) => eur2(Number(v))} />
                      <Legend />
                      <Bar
                        dataKey="Kalt"
                        name="Kaltmiete"
                        fill={BRAND}
                        radius={[10, 10, 0, 0]}
                      >
                        <LabelList
                          dataKey="Kalt"
                          position="top"
                          formatter={(v: any) => eur(Number(v))}
                        />
                      </Bar>
                      <Bar
                        dataKey="Umlage"
                        name="Umlagen"
                        fill={CTA}
                        radius={[10, 10, 0, 0]}
                      >
                        <LabelList
                          dataKey="Umlage"
                          position="top"
                          formatter={(v: any) => eur(Number(v))}
                        />
                      </Bar>
                      <Bar
                        dataKey="NOI"
                        name="NOI"
                        fill="#16a34a"
                        radius={[10, 10, 0, 0]}
                      >
                        <LabelList
                          dataKey="NOI"
                          position="top"
                          formatter={(v: any) => eur(Number(v))}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Projektion */}
              <Card className="overflow-hidden">
                <div className="text-sm font-medium mb-2 text-foreground">
                  Projektion über 10 Jahre
                </div>
                <p className="text-xs text-muted-foreground mb-2 max-w-xl">
                  Die Linien zeigen, wie sich Kaltmiete, Umlagen und NOI unter
                  deinen Wachstumsannahmen entwickeln – jeweils auf Jahresbasis.
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={projection}
                      margin={{ top: 20, right: 20, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis
                        tickFormatter={(v: any) =>
                          Number(v).toLocaleString("de-DE")
                        }
                      />
                      <RTooltip formatter={(v: any) => eur2(Number(v))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="KaltmieteJahr"
                        name="Kaltmiete p.a."
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="UmlageJahr"
                        name="Umlagen p.a."
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="NOIJahr"
                        name="NOI p.a."
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Monatsrechnung */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">
                  Monatsrechnung (Jahr 1)
                </div>
                <ul className="text-sm text-foreground space-y-1">
                  <li>
                    Kaltmiete (mtl.): <b>{eur(Math.round(kaltMonat))}</b>
                  </li>
                  <li>
                    Umlagefähige BK (mtl.): <b>{eur(Math.round(umlageMonat))}</b>
                  </li>
                  <li>
                    Warmmiete (mtl.): <b>{eur(Math.round(warmMonat))}</b>
                  </li>
                  <li>
                    Leerstand (Abzug, mtl.):{" "}
                    <b>-{eur(Math.round(leerstandEuroMonat))}</b>
                  </li>
                  <li>
                    Nicht umlagefähig (mtl.):{" "}
                    <b>-{eur(Math.round(nichtUmlageEuroMonat))}</b>
                  </li>
                  <li>
                    = NOI (mtl., vereinfacht):{" "}
                    <b>{eur(Math.round(noiMonat))}</b>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Hinweis: Vereinfachtes Modell zur Mieteinnahmen-Kalkulation,
                  ohne Steuern und Finanzierung. Dient als Orientierung, ersetzt
                  keine steuerliche oder rechtliche Beratung.
                </p>
              </Card>
            </section>
          </div>

          {/* SIDEBAR / GLOSSAR */}
          <aside className="hidden xl:block space-y-4 sticky top-6 h-fit">
            <Card>
              <h3 className="text-sm font-semibold">Glossar – kurz erklärt</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <b>Kaltmiete</b> – Miete ohne Heiz- und Warmwasserkosten.
                </li>
                <li>
                  <b>Umlagefähige Betriebskosten</b> – Kosten, die du laut
                  Betriebskostenverordnung auf Mieter umlegen kannst.
                </li>
                <li>
                  <b>Bruttokaltmiete</b> – Kaltmiete inklusive kalter
                  Betriebskosten; Basis vieler Renditekennzahlen.
                </li>
                <li>
                  <b>Leerstand / Mietausfall</b> – Anteil der Jahresmiete, der
                  durch Leerstand oder nicht zahlende Mieter entfällt.
                </li>
                <li>
                  <b>Nicht umlagefähige Kosten</b> – Kosten, die bei dir als
                  Eigentümer verbleiben (z. B. Verwaltung, Instandhaltung).
                </li>
                <li>
                  <b>NOI (Net Operating Income)</b> – Netto-Mietertrag nach
                  Leerstand und nicht umlagefähigen Kosten, vor Finanzierung und
                  Steuern.
                </li>
                <li>
                  <b>NOI-Yield</b> – Verhältnis von NOI zur Bruttokaltmiete; je
                  höher, desto effizienter wird die Miete in Netto-Ertrag
                  umgewandelt.
                </li>
              </ul>
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
                  <span className="text-[11px] text-gray-400">(live)</span>
                </div>
                <div className="text-sm font-semibold truncate text-foreground">
                  Entscheidung: {decisionLabelText}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    text={eur(Math.round(noiMonat)) + " NOI mtl."}
                    hint="NOI (Monat 1)"
                  />
                  <Badge
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    text={pct(noiYield) + " NOI-Yield"}
                    hint="NOI / Bruttokaltmiete"
                  />
                  <Badge
                    icon={<Sigma className="h-3.5 w-3.5" />}
                    text={`Leerstand ${pct(leerstandPct)}`}
                    hint="Mietausfallquote"
                  />
                </div>
              </div>

              {/* Rechts: Score-Donut */}
              <ScoreDonut
                scorePct={scorePct}
                scoreColor={scoreColor}
                label={scoreLabel}
                size={62}
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
}

/* ----------------------------------------------------------------
 *  Entscheidungs-Box
 * ---------------------------------------------------------------- */

function MietDecisionSummary({
  scorePct,
  scoreLabel,
  scoreColor,
  decisionLabelText,
  decisionText,
  cashflowText,
  noiYieldText,
  warmMonat,
  leerstandEuroMonat,
  nichtUmlageEuroMonat,
  tips,
}: {
  scorePct: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
  scoreColor: string;
  decisionLabelText: string;
  decisionText: string;
  cashflowText: string;
  noiYieldText: string;
  warmMonat: number;
  leerstandEuroMonat: number;
  nichtUmlageEuroMonat: number;
  tips: { label: string; detail: string }[];
}) {
  return (
    <div
      className="rounded-2xl p-4 text-white"
      style={{ background: "#0F2C8A" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs opacity-80">
            Zwischenstand (auf Basis deiner Eingaben)
          </div>
          <div className="text-lg font-semibold">{decisionLabelText}</div>

          <div className="text-sm opacity-90 max-w-xl">{decisionText}</div>

          <div className="mt-3 space-y-1 text-sm">
            <div>{cashflowText}</div>
            <div>{noiYieldText}</div>
            <div>
              Warmmiete (Monat 1): <b>{eur(Math.round(warmMonat))}</b>
            </div>
            <div>
              Abzug Leerstand (Monat 1):{" "}
              <b>-{eur(Math.round(leerstandEuroMonat))}</b>
            </div>
            <div>
              Nicht umlagefähige Kosten (Monat 1):{" "}
              <b>-{eur(Math.round(nichtUmlageEuroMonat))}</b>
            </div>
            <div className="text-xs opacity-80 pt-1">
              NOI = effektiver Mietertrag nach Leerstand und nicht
              umlagefähigen Kosten, vor Finanzierung und Steuern.
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

      <div className="mt-4">
        <div className="text-xs opacity-80 mb-1">
          Schnelle Hebel für diese Wohnung
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
