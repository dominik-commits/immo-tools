// src/routes/Mietkalkulation.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, RefreshCw, Download, Upload, Gauge, Banknote, TrendingUp, Info } from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  LabelList,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";

/* ===========================
   Mietkalkulation (Wohnung)
   – Sticky Ergebnis-Footer (Score + Entscheidung + KPIs)
   – Farbiges Waterfall + Sensitivitätsanalyse (±10%)
   =========================== */

// ---------- Utils ----------
function eur(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
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
function num(x: any, fb: number) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}
function scale(x: number, a: number, b: number) {
  if (b === a) return 0;
  return clamp01((x - a) / (b - a));
}

// ---------- Kleine UI Helfer ----------
function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm text-gray-700 flex items-center gap-1">
      <span>{label}</span>
      {help && <Help title={help} />}
    </div>
  );
}
function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <Info className="h-4 w-4 text-gray-400" />
    </span>
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
        className="mt-1 w-full border rounded-lg p-2"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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
  min = 0,
  max = 0.95,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <span className="w-24 text-right tabular-nums">{pct(value)}</span>
      </div>
    </div>
  );
}
function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-gray-700 bg-white shadow-sm" title={hint}>
      {icon} {text}
    </span>
  );
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-4 bg-white shadow-sm ${className}`}>{children}</div>;
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
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        {right && <span>{right}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
// Score Donut (kompakt)
function ScoreDonut({ scorePct, scoreColor, label }: { scorePct: number; scoreColor: string; label: "BUY" | "CHECK" | "NO" }) {
  const rest = Math.max(0, 100 - scorePct);
  return (
    <div className="h-24 w-24 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScore" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scoreColor} />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <Pie
            data={[
              { name: "Score", value: scorePct },
              { name: "Rest", value: rest },
            ]}
            startAngle={90}
            endAngle={-270}
            innerRadius={36}
            outerRadius={48}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="url(#gradScore)" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-base font-bold leading-none" style={{ color: scoreColor }}>
            {scorePct}%
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">„{label}“</div>
        </div>
      </div>
    </div>
  );
}
function scoreLabelText(s: "BUY" | "CHECK" | "NO") {
  if (s === "BUY") return "Kaufen (unter Vorbehalt)";
  if (s === "CHECK") return "Weiter prüfen";
  return "Eher Nein";
}

// ---------- Hauptkomponente ----------
export default function Mietkalkulation() {
  // Basis-Eingaben
  const [flaecheM2, setFlaecheM2] = useState(70);
  const [mieteProM2Monat, setMieteProM2Monat] = useState(12);

  // NK & Kosten
  const [umlagefaehigeNKProM2, setUmlagefaehigeNKProM2] = useState(2.5); // €/m²/Monat – gehen auf den Mieter
  const [nichtUmlagefaehigPctBrutto, setNichtUmlagefaehigPctBrutto] = useState(0.1); // % auf Bruttokalt (Eigentümer)
  const [capexReserveProM2, setCapexReserveProM2] = useState(0.5); // €/m²/Monat Rücklage (Eigentümer)
  const [leerstandPct, setLeerstandPct] = useState(0.05); // strukt./friktional

  // Finanzierung (optional)
  const [financingOn, setFinancingOn] = useState(true);
  const [kaufpreis, setKaufpreis] = useState(320_000);
  const [ltvPct, setLtvPct] = useState(0.8);
  const [zinsPct, setZinsPct] = useState(0.039);
  const [tilgungPct, setTilgungPct] = useState(0.02);

  // Bewertung/Projektion
  const [capRateAssumed, setCapRateAssumed] = useState(0.055);
  const [rentGrowthPct, setRentGrowthPct] = useState(0.02);
  const [costGrowthPct, setCostGrowthPct] = useState(0.02);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // Persistenz
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mietkalk.v1");
      if (!raw) return;
      const d = JSON.parse(raw);
      setFlaecheM2(d.flaecheM2 ?? 70);
      setMieteProM2Monat(d.mieteProM2Monat ?? 12);
      setUmlagefaehigeNKProM2(d.umlagefaehigeNKProM2 ?? 2.5);
      setNichtUmlagefaehigPctBrutto(d.nichtUmlagefaehigPctBrutto ?? 0.1);
      setCapexReserveProM2(d.capexReserveProM2 ?? 0.5);
      setLeerstandPct(d.leerstandPct ?? 0.05);
      setFinancingOn(d.financingOn ?? true);
      setKaufpreis(d.kaufpreis ?? 320000);
      setLtvPct(d.ltvPct ?? 0.8);
      setZinsPct(d.zinsPct ?? 0.039);
      setTilgungPct(d.tilgungPct ?? 0.02);
      setCapRateAssumed(d.capRateAssumed ?? 0.055);
      setRentGrowthPct(d.rentGrowthPct ?? 0.02);
      setCostGrowthPct(d.costGrowthPct ?? 0.02);
      setPriceAdjPct(d.priceAdjPct ?? 0);
      setRentAdjPct(d.rentAdjPct ?? 0);
      setApplyAdjustments(d.applyAdjustments ?? true);
    } catch {}
  }, []);
  useEffect(() => {
    const d = {
      flaecheM2,
      mieteProM2Monat,
      umlagefaehigeNKProM2,
      nichtUmlagefaehigPctBrutto,
      capexReserveProM2,
      leerstandPct,
      financingOn,
      kaufpreis,
      ltvPct,
      zinsPct,
      tilgungPct,
      capRateAssumed,
      rentGrowthPct,
      costGrowthPct,
      priceAdjPct,
      rentAdjPct,
      applyAdjustments,
    };
    try {
      localStorage.setItem("mietkalk.v1", JSON.stringify(d));
    } catch {}
  }, [
    flaecheM2,
    mieteProM2Monat,
    umlagefaehigeNKProM2,
    nichtUmlagefaehigPctBrutto,
    capexReserveProM2,
    leerstandPct,
    financingOn,
    kaufpreis,
    ltvPct,
    zinsPct,
    tilgungPct,
    capRateAssumed,
    rentGrowthPct,
    costGrowthPct,
    priceAdjPct,
    rentAdjPct,
    applyAdjustments,
  ]);

  // Playground angewendet?
  const adjPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const adjRent = mieteProM2Monat * (1 + rentAdjPct);
  const priceForCalc = applyAdjustments ? adjPrice : kaufpreis;
  const rentForCalc = applyAdjustments ? adjRent : mieteProM2Monat;

  // Ableitungen (Jahr)
  const A = flaecheM2 * 12; // Fläche * 12 Monate
  const grossRentYear = A * rentForCalc; // Bruttokalt p.a.
  const effRentYear = grossRentYear * (1 - clamp01(leerstandPct)); // nach Leerstand
  const opexOwnerYear = grossRentYear * clamp01(nichtUmlagefaehigPctBrutto); // nicht umlagefähig (Eigentümer)
  const capexYear = flaecheM2 * capexReserveProM2 * 12; // Rücklage (Eigentümer)
  const umlagefaehigeNKYear = flaecheM2 * umlagefaehigeNKProM2 * 12; // trägt der Mieter
  const noiYear = effRentYear - opexOwnerYear - capexYear;

  const loan = financingOn ? priceForCalc * clamp01(ltvPct) : 0;
  const annuityYear = financingOn ? loan * (zinsPct + tilgungPct) : 0;
  const interestYear = financingOn ? loan * zinsPct : 0;
  const principalYear = financingOn ? loan * tilgungPct : 0;
  const dscr = financingOn && annuityYear > 0 ? noiYear / annuityYear : null;

  const cashflowYear = noiYear - annuityYear;
  const cashflowMonth = cashflowYear / 12;

  // Warmmiete (vertraglich, ohne Leerstandseffekt)
  const kaltMonatVertrag = flaecheM2 * rentForCalc;
  const nkUmlageMonat = flaecheM2 * umlagefaehigeNKProM2;
  const warmMonat = kaltMonatVertrag + nkUmlageMonat;

  // NOI-Yield & Modellwert
  const noiYield = priceForCalc > 0 ? noiYear / priceForCalc : 0;
  const wertAusCap = capRateAssumed > 0 ? noiYear / capRateAssumed : 0;
  const valueGap = Math.round(wertAusCap - priceForCalc);
  const valueGapPct = priceForCalc > 0 ? (wertAusCap - priceForCalc) / priceForCalc : 0;
  const gapPositive = valueGap >= 0;

  // Score
  const score = clamp01(
    0.5 * scale(noiYield, 0.04, 0.08) + 0.35 * scale(dscr ?? 0, 1.2, 1.7) + 0.15 * scale(cashflowMonth, 0, 600)
  );
  const scorePct = Math.round(score * 100);
  const scoreLabel: "BUY" | "CHECK" | "NO" = score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";
  const scoreColor = score >= 0.7 ? "#16a34a" : score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Break-even Miete/m² (CF = 0)
  const beRentPerM2 = breakEvenRentPerM2({
    flaecheM2,
    leerstandPct,
    opexPct: clamp01(nichtUmlagefaehigPctBrutto),
    capexYear,
    debtYear: annuityYear,
  });

  // Waterfall-Daten (farbig)
  const waterfall = [
    { name: "Bruttokalt", value: Math.round(grossRentYear) },
    { name: "Leerstand", value: -Math.round(grossRentYear - effRentYear) },
    { name: "Nicht umlagef. BK", value: -Math.round(opexOwnerYear) },
    { name: "CapEx-Reserve", value: -Math.round(capexYear) },
    ...(financingOn ? [{ name: "Schuldienst", value: -Math.round(annuityYear) }] : []),
    { name: "CF p.a.", value: Math.round(cashflowYear) },
  ];
  const waterfallColors = waterfall.map((d) => {
    if (d.name === "Bruttokalt") return "#3b82f6"; // blau
    if (d.name === "CF p.a.") return d.value >= 0 ? "#10b981" : "#ef4444"; // grün oder rot
    return d.value < 0 ? "#f97316" : "#10b981"; // negative = orange, positive = grün (falls je nach Konstellation)
  });

  // 10-J Projektion (einfach, mit Wachstum)
  const projection = useMemo(() => {
    const data: { year: number; cashflowPA: number; tilgungPA: number; loanOutstanding: number }[] = [];
    let outstanding = loan;
    const baseGross0 = A * rentForCalc;
    const baseOpexOwner0 = baseGross0 * clamp01(nichtUmlagefaehigPctBrutto);
    for (let t = 1; t <= 10; t++) {
      const gross = baseGross0 * Math.pow(1 + rentGrowthPct, t - 1);
      const eff = gross * (1 - clamp01(leerstandPct));
      const opexOwnerT = baseOpexOwner0 * Math.pow(1 + costGrowthPct, t - 1);
      const capexT = capexYear * Math.pow(1 + costGrowthPct, t - 1);
      const noiT = eff - opexOwnerT - capexT;
      const interest = financingOn ? outstanding * zinsPct : 0;
      const annuityT = financingOn ? loan * (zinsPct + tilgungPct) : 0;
      const tilgung = Math.max(0, annuityT - interest);
      outstanding = Math.max(0, outstanding - tilgung);
      const cf = noiT - annuityT;
      data.push({ year: t, cashflowPA: Math.round(cf), tilgungPA: Math.round(tilgung), loanOutstanding: Math.round(outstanding) });
    }
    return data;
  }, [
    loan,
    A,
    rentForCalc,
    nichtUmlagefaehigPctBrutto,
    capexYear,
    rentGrowthPct,
    costGrowthPct,
    financingOn,
    zinsPct,
    tilgungPct,
    leerstandPct,
  ]);

  // Sensitivität (±10%) → Delta zum aktuellen Cashflow mtl.
  const sensitivity = useMemo(() => {
    const baseCF = cashflowMonth;

    const computeCF = (over: {
      rentAdj?: number; // multiplikativ
      vacAdj?: number; // multiplikativ
      opexAdj?: number; // multiplikativ
      zinsAdj?: number; // multiplikativ
    }) => {
      const rent = rentForCalc * (over.rentAdj ?? 1);
      const vac = clamp01(leerstandPct * (over.vacAdj ?? 1));
      const opexPct = clamp01(nichtUmlagefaehigPctBrutto * (over.opexAdj ?? 1));
      const zins = zinsPct * (over.zinsAdj ?? 1);

      const gross = flaecheM2 * 12 * rent;
      const eff = gross * (1 - vac);
      const opexOwner = gross * opexPct;
      const capex = capexYear;
      const noi = eff - opexOwner - capex;

      const ann = financingOn ? (priceForCalc * ltvPct) * (zins + tilgungPct) : 0;
      const cfY = noi - ann;
      return cfY / 12;
    };

    const rows = [
      { name: "Miete +10%", value: computeCF({ rentAdj: 1.1 }) - baseCF },
      { name: "Miete -10%", value: computeCF({ rentAdj: 0.9 }) - baseCF },
      { name: "Leerstand +10%", value: computeCF({ vacAdj: 1.1 }) - baseCF },
      { name: "Leerstand -10%", value: computeCF({ vacAdj: 0.9 }) - baseCF },
      { name: "Nicht umlagef. BK +10%", value: computeCF({ opexAdj: 1.1 }) - baseCF },
      { name: "Nicht umlagef. BK -10%", value: computeCF({ opexAdj: 0.9 }) - baseCF },
      ...(financingOn
        ? [
            { name: "Zins +10%", value: computeCF({ zinsAdj: 1.1 }) - baseCF },
            { name: "Zins -10%", value: computeCF({ zinsAdj: 0.9 }) - baseCF },
          ]
        : []),
    ];

    // Nach Einfluss (Betrag) sortieren, stärkster Impact oben
    return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [
    cashflowMonth,
    rentForCalc,
    leerstandPct,
    nichtUmlagefaehigPctBrutto,
    zinsPct,
    financingOn,
    flaecheM2,
    capexYear,
    priceForCalc,
    ltvPct,
  ]);

  // Export / Import
  function exportJson() {
    const payload = {
      flaecheM2,
      mieteProM2Monat,
      umlagefaehigeNKProM2,
      nichtUmlagefaehigPctBrutto,
      capexReserveProM2,
      leerstandPct,
      financingOn,
      kaufpreis,
      ltvPct,
      zinsPct,
      tilgungPct,
      capRateAssumed,
      rentGrowthPct,
      costGrowthPct,
      priceAdjPct,
      rentAdjPct,
      applyAdjustments,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mietkalkulation.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setFlaecheM2(num(d.flaecheM2, flaecheM2));
        setMieteProM2Monat(num(d.mieteProM2Monat, mieteProM2Monat));
        setUmlagefaehigeNKProM2(num(d.umlagefaehigeNKProM2, umlagefaehigeNKProM2));
        setNichtUmlagefaehigPctBrutto(num(d.nichtUmlagefaehigPctBrutto, nichtUmlagefaehigPctBrutto));
        setCapexReserveProM2(num(d.capexReserveProM2, capexReserveProM2));
        setLeerstandPct(num(d.leerstandPct, leerstandPct));
        setFinancingOn(Boolean(d.financingOn));
        setKaufpreis(num(d.kaufpreis, kaufpreis));
        setLtvPct(num(d.ltvPct, ltvPct));
        setZinsPct(num(d.zinsPct, zinsPct));
        setTilgungPct(num(d.tilgungPct, tilgungPct));
        setCapRateAssumed(num(d.capRateAssumed, capRateAssumed));
        setRentGrowthPct(num(d.rentGrowthPct, rentGrowthPct));
        setCostGrowthPct(num(d.costGrowthPct, costGrowthPct));
        setPriceAdjPct(num(d.priceAdjPct, priceAdjPct));
        setRentAdjPct(num(d.rentAdjPct, rentAdjPct));
        setApplyAdjustments(Boolean(d.applyAdjustments));
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  // ---------- Render ----------
  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";

  return (
    <div className="bg-gradient-to-b from-sky-50 to-white min-h-screen pb-28">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white grid place-items-center shadow">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Mietkalkulation</h2>
              <p className="text-gray-600 text-sm">Ziel-Miete, Warmmiete, Break-even & Cashflow – klar, spielerisch, live.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-white/80 border shadow-sm hover:shadow transition"
              onClick={() => {
                setFlaecheM2(68);
                setMieteProM2Monat(12.5);
                setUmlagefaehigeNKProM2(2.6);
                setNichtUmlagefaehigPctBrutto(0.1);
                setCapexReserveProM2(0.5);
                setLeerstandPct(0.06);
                setFinancingOn(true);
                setKaufpreis(300000);
                setLtvPct(0.8);
                setZinsPct(0.039);
                setTilgungPct(0.02);
                setCapRateAssumed(0.055);
                setRentGrowthPct(0.02);
                setCostGrowthPct(0.02);
                setPriceAdjPct(0);
                setRentAdjPct(0);
                setApplyAdjustments(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-white/80 border shadow-sm hover:shadow transition"
              onClick={exportJson}
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <label className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-white/80 border shadow-sm hover:shadow transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input type="file" className="hidden" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
            </label>
          </div>
        </div>

        {/* Eingaben */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-br from-sky-300/50 via-indigo-200/50 to-emerald-200/50">
          <div className="rounded-2xl bg-white p-5 space-y-5">
            <div className="text-sm text-gray-700 font-medium">Eingaben</div>

            <div className="grid grid-cols-1 gap-4">
              <NumberField label="Wohnfläche (m²)" value={flaecheM2} onChange={setFlaecheM2} />
              <NumberField label="Ziel-Kaltmiete (€/m²/Monat)" value={mieteProM2Monat} onChange={setMieteProM2Monat} step={0.1} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <NumberField
                label="Umlagefähige NK (€/m²/Monat)"
                value={umlagefaehigeNKProM2}
                onChange={setUmlagefaehigeNKProM2}
                step={0.1}
                help="Gehen über die Nebenkosten an den Mieter (z. B. Heizung, Müll, Grundsteuer)."
              />
              <PercentField
                label="Nicht umlagefähige Kosten (% Bruttokalt)"
                value={nichtUmlagefaehigPctBrutto}
                onChange={setNichtUmlagefaehigPctBrutto}
                help="Trägt der Eigentümer (Verwaltung, Instandhaltung laufend, Versicherung)."
              />
              <NumberField
                label="CapEx-Reserve (€/m²/Monat)"
                value={capexReserveProM2}
                onChange={setCapexReserveProM2}
                step={0.1}
                help="Rücklage für größere Instandsetzungen (z. B. Dach, Heizung)."
              />
              <PercentField label="Leerstand (%)" value={leerstandPct} onChange={setLeerstandPct} help="Fluktuation, Neuvermietung – Abschlag auf Bruttokalt." />
            </div>

            <div className="border rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium inline-flex items-center gap-2">
                  <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} /> Finanzierung berücksichtigen
                </label>
                <span className="text-xs text-gray-500">Annuität ≈ (Zins + Tilgung) · Darlehen</span>
              </div>
              <AnimatePresence initial={false}>
                {financingOn && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="grid grid-cols-1 gap-3 mt-3">
                    <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
                    <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct} />
                    <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct} step={0.001} />
                    <PercentField label="Tilgung p.a. (%)" value={tilgungPct} onChange={setTilgungPct} step={0.001} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <details>
              <summary className="cursor-pointer text-sm text-gray-700">Projektion & Cap (optional)</summary>
              <div className="grid grid-cols-1 gap-3 mt-2">
                <PercentField label="Cap Rate (Bewertung) (%)" value={capRateAssumed} onChange={setCapRateAssumed} step={0.0005} />
                <PercentField label="Mietsteigerung p.a. (%)" value={rentGrowthPct} onChange={setRentGrowthPct} step={0.001} />
                <PercentField label="Kostensteigerung p.a. (%)" value={costGrowthPct} onChange={setCostGrowthPct} step={0.001} />
              </div>
            </details>
          </div>
        </div>

        {/* Profit-Spielplatz */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium">Profit-Spielplatz</div>
              <p className="text-xs text-gray-600 mb-3">Zieh an <b>Kaufpreis</b> & <b>Miete/m²</b> – Score & Ergebnis reagieren live.</p>
            </div>
            <label className="text-xs text-gray-700 inline-flex items-center gap-2">
              <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} /> in Bewertung verwenden
            </label>
          </div>
          <div className="space-y-4">
            <SliderRow label="Kaufpreis-Anpassung" value={priceAdjPct} min={-0.3} max={0.3} step={0.01} right={`${signedPct(priceAdjPct)} → ${eur(adjPrice)}`} onChange={setPriceAdjPct} />
            <SliderRow
              label="Miete/m²-Anpassung"
              value={rentAdjPct}
              min={-0.2}
              max={0.4}
              step={0.01}
              right={`${signedPct(rentAdjPct)} → ${adjRent.toFixed(2)} €/m²`}
              onChange={setRentAdjPct}
            />
          </div>
        </Card>

        {/* Ergebnis-Section */}
        <section className="space-y-6">
          <div className="text-sm text-gray-700 font-medium flex items-center gap-2">
            Ergebnis <span className="text-xs text-gray-500">({viewTag})</span>
          </div>

          {/* Warmmiete-Aufschlüsselung */}
          <Card>
            <div className="text-sm font-medium mb-2">Warmmiete (vertraglich, ohne Leerstand)</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Kaltmiete (monatlich)</span>
                <b>{eur(Math.round(kaltMonatVertrag))}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>umlagefähige NK (monatlich)</span>
                <b>{eur(Math.round(nkUmlageMonat))}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>Warmmiete (monatlich)</span>
                <b>{eur(Math.round(warmMonat))}</b>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Leerstand wirkt auf den Vermieter-Cashflow (effektive Mieten), nicht auf die vereinbarte Warmmiete.</p>
          </Card>

          {/* Waterfall (farbig) */}
          <Card className="overflow-hidden">
            <div className="text-sm font-medium mb-1">Kosten-Waterfall (Jahr 1)</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfall} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip formatter={(v: any) => eur(v)} />
                  <Legend />
                  <Bar dataKey="value" name="Betrag" radius={[8, 8, 0, 0]}>
                    {waterfall.map((_, i) => (
                      <Cell key={i} fill={waterfallColors[i]} />
                    ))}
                    <LabelList dataKey="value" position="top" formatter={(v: any) => eur(v)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Wert vs. Kaufpreis */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-sky-300/70 via-emerald-300/70 to-indigo-300/70">
            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">Wert (NOI/Cap) vs. Kaufpreis</div>
                  <div className="text-xs text-gray-500">Basis: {viewTag.toLowerCase()}</div>
                </div>
                <span
                  className={
                    "px-2 py-1 rounded-full text-xs border " +
                    (gapPositive ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")
                  }
                >
                  {gapPositive ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(valueGap))} ({signedPct(valueGapPct)})
                </span>
              </div>
              <div className="h-56 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Deal", Preis: Math.round(priceForCalc), Wert: Math.round(wertAusCap) }]} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111827" />
                        <stop offset="100%" stopColor="#374151" />
                      </linearGradient>
                      <linearGradient id="gradWert" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RTooltip formatter={(v: any) => eur(v)} />
                    <Legend />
                    <Bar dataKey="Preis" fill="url(#gradPreis)" radius={[10, 10, 0, 0]}>
                      <LabelList dataKey="Preis" position="top" formatter={(v: any) => eur(v)} />
                    </Bar>
                    <Bar dataKey="Wert" fill="url(#gradWert)" radius={[10, 10, 0, 0]}>
                      <LabelList dataKey="Wert" position="top" formatter={(v: any) => eur(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-600 mt-2">Cap = Marktannahme. Modell-Wert ist Orientierung – Lage/Zustand prüfen.</p>
            </div>
          </div>

          {/* Projektion */}
          <Card className="overflow-hidden">
            <div className="text-sm font-medium mb-1">Projektion (10 Jahre)</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <RTooltip formatter={(v: any) => eur(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="cashflowPA" name="Cashflow p.a." stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tilgungPA" name="Tilgung p.a." stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Break-even */}
          <Card>
            <div className="text-sm font-medium mb-1">Break-even (CF = 0)</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>benötigte Miete/m²</span>
                <b>{beRentPerM2.toFixed(2)} €/m²</b>
              </div>
              <div className="flex items-center justify-between">
                <span>aktuelle Miete/m²</span>
                <b>{rentForCalc.toFixed(2)} €/m²</b>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Regel: Miete erhöhen oder Kosten/Schuldienst senken → bis CF ≥ 0.</p>
          </Card>

          {/* Sensitivitäts-Mini-Analyse (±10%) */}
          <Card className="overflow-hidden">
            <div className="text-sm font-medium mb-1">Sensitivität (Δ Cashflow mtl., ±10%)</div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sensitivity}
                  layout="vertical"
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v: any) => eur(v)} />
                  <YAxis dataKey="name" type="category" width={160} />
                  <RTooltip formatter={(v: any) => eur(v)} />
                  <ReferenceLine x={0} stroke="#9ca3af" />
                  <Bar dataKey="value" name="Δ CF mtl." radius={[8, 8, 8, 8]}>
                    {sensitivity.map((d, i) => (
                      <Cell key={i} fill={d.value >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v: any) => eur(v)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Interpretation: Grüne Balken verbessern, rote verschlechtern den Cashflow. Je länger der Balken, desto sensibler ist der Deal auf diesen Hebel.
            </p>
          </Card>
        </section>
      </div>

      {/* Sticky Ergebnis-Footer */}
      <div className="fixed bottom-0 inset-x-0 z-30">
        <div className="max-w-3xl mx-auto px-3 pb-3">
          <div className="rounded-2xl shadow-lg ring-1 ring-gray-200 bg-white/95 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={scoreLabel} />
                <div className="text-sm">
                  <div className="font-medium">Entscheidung: {scoreLabelText(scoreLabel)}</div>
                  <div className="text-xs text-gray-600">
                    {scoreLabel === "BUY" && "Kennzahlen solide. Lage/Zustand prüfen, Alternativen vergleichen."}
                    {scoreLabel === "CHECK" && "Grenzfall – Preis/Miete/Kosten justieren & Due Diligence vertiefen."}
                    {scoreLabel === "NO" && "Aktuell unattraktiv – Preisnachlass/Optimierungen nötig."}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={eur(Math.round(cashflowMonth)) + " mtl."} hint="Cashflow (vor Steuern)" />
                <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={pct(noiYield)} hint="NOI-Rendite" />
                <Badge icon={<TrendingUp className="h-3.5 w-3.5" />} text={dscr ? dscr.toFixed(2) : "–"} hint="DSCR" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Hilfsfunktionen ---------- */
// Break-even: r = (capex + debt) / (A*(1 - L - opexPct))
function breakEvenRentPerM2(opts: { flaecheM2: number; leerstandPct: number; opexPct: number; capexYear: number; debtYear: number }) {
  const { flaecheM2, leerstandPct, opexPct, capexYear, debtYear } = opts;
  const A = Math.max(0.0001, flaecheM2 * 12);
  const denom = A * Math.max(0.0001, 1 - clamp01(leerstandPct) - clamp01(opexPct));
  return Math.max(0, (capexYear + debtYear) / denom);
}
