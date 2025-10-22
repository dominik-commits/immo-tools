// src/routes/Eigentumswohnung.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Gauge, Banknote, Sigma, TrendingUp, Info, RefreshCw, Download, Upload
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  LineChart, Line, CartesianGrid, Legend, LabelList, PieChart, Pie, Cell
} from "recharts";
import { calcWohn, eur, pct, type WohnInput, type WohnOutput } from "../core/calcs";
import PlanGuard from "@/components/PlanGuard";
import { Link } from "react-router-dom";

/* ---------------- Kleine UI-Atoms ---------------- */

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <Info className="h-4 w-4 text-gray-400" />
    </span>
  );
}

function InfoBubble({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center ml-2 align-middle" title={text} aria-label={text}>
      <Info className="h-4 w-4 text-gray-400" />
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>;
}

function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card shadow-sm"
      title={hint}
    >
      {icon} {text}
    </span>
  );
}

function NumberField({
  label, value, onChange, step = 1
}: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <input
        className="w-full rounded-xl border px-3 py-2"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

function PercentField({
  label, value, onChange, step = 0.001, min = 0, max = 0.95
}: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
        <span className="w-24 text-right tabular-nums">{pct(value)}</span>
      </div>
    </label>
  );
}

function ScoreDonut({
  scorePct, scoreColor, label, size = 56
}: { scorePct: number; scoreColor: string; label: "BUY" | "CHECK" | "NO"; size?: number }) {
  const rest = Math.max(0, 100 - scorePct);
  const inner = Math.round(size * 0.65);
  const outer = Math.round(size * 0.9);
  return (
    <div className="relative" style={{ width: size * 2, height: size * 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScoreWohn" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scoreColor} />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <Pie
            data={[{ name: "Score", value: scorePct }, { name: "Rest", value: rest }]}
            startAngle={90} endAngle={-270}
            innerRadius={inner} outerRadius={outer} dataKey="value" stroke="none"
          >
            <Cell fill="url(#gradScoreWohn)" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xl font-bold leading-5" style={{ color: scoreColor }}>{scorePct}%</div>
          <div className="text-[10px] text-muted-foreground">"{label}"</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- (Optional) Upgrade-Banner für Basis-User ---------------- */

function UpgradeBanner() {
  return (
    <div className="rounded-xl border p-3 bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
      <span>Mehr Module & Funktionen in <b>IMMO Analyzer Pro</b>.</span>
      <Link to="/preise" className="px-3 py-1 rounded-lg border bg-white hover:bg-amber-100 transition">Jetzt upgraden</Link>
    </div>
  );
}

/* ---------------- Break-even Solver ---------------- */

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
  let low = 0, high = Math.max(1, base.kaufpreis), cfH = cfAt(high), safe = 0;
  while (cfH > 0 && high < base.kaufpreis * 100 && safe < 40) { high *= 1.5; cfH = cfAt(high); safe++; }
  if (cfH > 0) return Math.round(high);
  for (let k = 0; k < 40; k++) { const mid = (low + high) / 2, cf = cfAt(mid); if (cf >= 0) low = mid; else high = mid; }
  return Math.round((low + high) / 2);
}

function breakEvenRentPerM2ForCashflowZero(base: WohnInput): number {
  if (!base.financingOn || base.ltvPct <= 0 || base.zinsPct + base.tilgungPct <= 0) return 0;
  const cfAt = (rent: number) => {
    const gross = base.flaecheM2 * rent * 12;
    const eff = gross * (1 - base.leerstandPct);
    const opex = (base.flaecheM2 * base.mieteProM2Monat * 12) * base.opexPctBrutto; // vereinfachend auf Ausgangsmiete
    const loan = base.kaufpreis * base.ltvPct;
    const annu = loan * (base.zinsPct + base.tilgungPct);
    return (eff - opex - annu) / 12;
  };
  let low = 0, high = Math.max(0.1, base.mieteProM2Monat), cfH = cfAt(high), safe = 0;
  while (cfH < 0 && high < 200 && safe < 60) { high *= 1.2; cfH = cfAt(high); safe++; }
  for (let k = 0; k < 40; k++) { const mid = (low + high) / 2, cf = cfAt(mid); if (cf >= 0) high = mid; else low = mid; }
  return Math.round(((low + high) / 2) * 100) / 100;
}

/* ---------------- Hauptkomponente (Basic erlaubt, Pro inklusive) ---------------- */

export default function Eigentumswohnung() {
  // Plan-Gating: Seite ist im BASIC enthalten ⇒ required="basic" (Pro sieht es ebenfalls).
  return (
    <PlanGuard required="basic">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  // Persistenz
  const DRAFT_KEY = "eigentumswohnung.v3";

  // Eingaben
  const [kaufpreis, setKaufpreis] = React.useState(320_000);
  const [flaecheM2, setFlaecheM2] = React.useState(68);
  const [mieteProM2Monat, setMieteProM2Monat] = React.useState(12.5);
  const [leerstandPct, setLeerstandPct] = React.useState(0.06);
  const [opexPctBrutto, setOpexPctBrutto] = React.useState(0.24);

  // NK (Split)
  const [nkGrEStPct, setNkGrEStPct] = React.useState(0.065);
  const [nkNotarPct, setNkNotarPct] = React.useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = React.useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = React.useState(0.0357);
  const [nkSonstPct, setNkSonstPct] = React.useState(0);
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // Finanzierung (vereinfachte Annuität)
  const [financingOn, setFinancingOn] = React.useState(true);
  const [ltvPct, setLtvPct] = React.useState(0.8);
  const [zinsPct, setZinsPct] = React.useState(0.039);
  const [tilgungPct, setTilgungPct] = React.useState(0.02);

  // Bewertung
  const [capRatePct, setCapRatePct] = React.useState(0.055);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = React.useState(0);
  const [rentAdjPct, setRentAdjPct] = React.useState(0);
  const [applyAdjustments, setApplyAdjustments] = React.useState(true);

  // Laden
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      setKaufpreis(d.kaufpreis ?? 320000);
      setFlaecheM2(d.flaecheM2 ?? 68);
      setMieteProM2Monat(d.mieteProM2Monat ?? 12.5);
      setLeerstandPct(d.leerstandPct ?? 0.06);
      setOpexPctBrutto(d.opexPctBrutto ?? 0.24);
      setNkGrEStPct(d.nkGrEStPct ?? 0.065);
      setNkNotarPct(d.nkNotarPct ?? 0.015);
      setNkGrundbuchPct(d.nkGrundbuchPct ?? 0.005);
      setNkMaklerPct(d.nkMaklerPct ?? 0.0357);
      setNkSonstPct(d.nkSonstPct ?? 0);
      setFinancingOn(d.financingOn ?? true);
      setLtvPct(d.ltvPct ?? 0.8);
      setZinsPct(d.zinsPct ?? 0.039);
      setTilgungPct(d.tilgungPct ?? 0.02);
      setCapRatePct(d.capRatePct ?? 0.055);
      setPriceAdjPct(d.priceAdjPct ?? 0);
      setRentAdjPct(d.rentAdjPct ?? 0);
      setApplyAdjustments(d.applyAdjustments ?? true);
    } catch {}
  }, []);

  // Speichern
  React.useEffect(() => {
    const data = {
      kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto,
      nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
      financingOn, ltvPct, zinsPct, tilgungPct, capRatePct,
      priceAdjPct, rentAdjPct, applyAdjustments
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
  }, [
    kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto,
    nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
    financingOn, ltvPct, zinsPct, tilgungPct, capRatePct, priceAdjPct, rentAdjPct, applyAdjustments
  ]);

  // Input/Output
  const baseInput: WohnInput = {
    kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto, nkPct,
    financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed: capRatePct
  };
  const outBase: WohnOutput = React.useMemo(() => calcWohn(baseInput), [JSON.stringify(baseInput)]);

  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const adjustedRent = mieteProM2Monat * (1 + rentAdjPct);
  const adjInput: WohnInput = { ...baseInput, kaufpreis: adjustedPrice, mieteProM2Monat: adjustedRent };
  const outAdj: WohnOutput = React.useMemo(() => calcWohn(adjInput), [JSON.stringify(adjInput)]);

  const viewIn = applyAdjustments ? adjInput : baseInput;
  const view = applyAdjustments ? outAdj : outBase;
  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";

  // Ableitungen
  const grossRentYear = viewIn.flaecheM2 * viewIn.mieteProM2Monat * 12;
  const effRentYear = grossRentYear * (1 - viewIn.leerstandPct);
  const opexYear = grossRentYear * viewIn.opexPctBrutto;

  const loan = viewIn.financingOn ? viewIn.kaufpreis * viewIn.ltvPct : 0;
  const annuityYear = viewIn.financingOn ? loan * (viewIn.zinsPct + viewIn.tilgungPct) : 0;
  const interestYear = viewIn.financingOn ? loan * viewIn.zinsPct : 0;
  const principalYear = viewIn.financingOn ? loan * viewIn.tilgungPct : 0;

  const monthlyEffRent = effRentYear / 12;
  const monthlyOpex = opexYear / 12;
  const monthlyInterest = interestYear / 12;
  const monthlyPrincipal = principalYear / 12;
  const monthlyAnnuity = annuityYear / 12;

  // Score & Delta
  const scorePct = Math.round(view.score * 100);
  const scoreColor = view.score >= 0.7 ? "#16a34a" : view.score >= 0.5 ? "#f59e0b" : "#ef4444";

  const priceForChart = viewIn.kaufpreis;
  const wertForChart = view.wertAusCap;
  const valueGap = Math.round(wertForChart - priceForChart);
  const valueGapPct = priceForChart > 0 ? (wertForChart - priceForChart) / priceForChart : 0;
  const gapPositive = valueGap >= 0;

  // Projektion (10J, einfach)
  const projection = React.useMemo(() => {
    const years = 10;
    const data: { year: number; Cashflow: number; Tilgung: number; Vermögen: number }[] = [];
    let outstanding = loan;
    const baseGross0 = grossRentYear;
    const baseOpex0 = opexYear;
    const rentGrowthPct = 0.02;
    const costGrowthPct = 0.02;
    const valueGrowthPct = 0.02;
    for (let t = 1; t <= years; t++) {
      const gross = baseGross0 * Math.pow(1 + rentGrowthPct, t - 1);
      const eff = gross * (1 - viewIn.leerstandPct);
      const opex = baseOpex0 * Math.pow(1 + costGrowthPct, t - 1);
      const interest = viewIn.financingOn ? outstanding * viewIn.zinsPct : 0;
      const annuity = viewIn.financingOn ? (loan * (viewIn.zinsPct + viewIn.tilgungPct)) : 0;
      const tilgung = Math.max(0, annuity - interest);
      outstanding = Math.max(0, outstanding - tilgung);
      const cf = eff - opex - annuity;
      const verm = tilgung + (viewIn.kaufpreis * valueGrowthPct);
      data.push({ year: t, Cashflow: Math.round(cf), Tilgung: Math.round(tilgung), Vermögen: Math.round(verm) });
    }
    return data;
  }, [JSON.stringify({ loan, grossRentYear, opexYear, viewIn })]);

  // NK-Beträge
  const nkSum = Math.round(viewIn.kaufpreis * nkPct);
  const nkSplits = {
    grESt: Math.round(viewIn.kaufpreis * nkGrEStPct),
    notar: Math.round(viewIn.kaufpreis * nkNotarPct),
    gb: Math.round(viewIn.kaufpreis * nkGrundbuchPct),
    makler: Math.round(viewIn.kaufpreis * nkMaklerPct),
    sonst: Math.round(viewIn.kaufpreis * nkSonstPct),
  };

  // Hilfen
  function scoreLabelText(s: "BUY" | "CHECK" | "NO") {
    if (s === "BUY") return "Kaufen (unter Vorbehalt)";
    if (s === "CHECK") return "Weiter prüfen";
    return "Eher Nein";
  }
  function signedPct(x: number) { const v = Math.round(x * 100); return (x > 0 ? "+" : "") + v + "%"; }

  // Export/Import
  function exportJson() {
    const payload = {
      kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto,
      nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
      financingOn, ltvPct, zinsPct, tilgungPct, capRatePct,
      priceAdjPct, rentAdjPct, applyAdjustments
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "eigentumswohnung-check.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setKaufpreis(num(d.kaufpreis, 320000));
        setFlaecheM2(num(d.flaecheM2, 68));
        setMieteProM2Monat(num(d.mieteProM2Monat, 12.5));
        setLeerstandPct(num(d.leerstandPct, 0.06));
        setOpexPctBrutto(num(d.opexPctBrutto, 0.24));
        setNkGrEStPct(num(d.nkGrEStPct, 0.065));
        setNkNotarPct(num(d.nkNotarPct, 0.015));
        setNkGrundbuchPct(num(d.nkGrundbuchPct, 0.005));
        setNkMaklerPct(num(d.nkMaklerPct, 0.0357));
        setNkSonstPct(num(d.nkSonstPct, 0));
        setFinancingOn(Boolean(d.financingOn));
        setLtvPct(num(d.ltvPct, 0.8));
        setZinsPct(num(d.zinsPct, 0.039));
        setTilgungPct(num(d.tilgungPct, 0.02));
        setCapRatePct(num(d.capRatePct, 0.055));
        setPriceAdjPct(num(d.priceAdjPct, 0));
        setRentAdjPct(num(d.rentAdjPct, 0));
        setApplyAdjustments(Boolean(d.applyAdjustments));
      } catch { alert("Ungültige Datei"); }
    };
    r.readAsText(file);
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Inhalt mit zusätzlichem padding-bottom damit der sticky Footer nichts überdeckt */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-40">

        {/* Optionales Upgrade (lassen wir auf Basic-Seiten sichtbar) */}
        <UpgradeBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-400 text-white grid place-items-center shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Eigentumswohnung – Check</h2>
              <p className="text-muted-foreground text-sm">Einfach, visuell, spielerisch – mit Live-Score, Break-even & sticky Ergebnis.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition"
              onClick={() => {
                setKaufpreis(320000); setFlaecheM2(68); setMieteProM2Monat(12.5);
                setLeerstandPct(0.06); setOpexPctBrutto(0.24);
                setNkGrEStPct(0.065); setNkNotarPct(0.015); setNkGrundbuchPct(0.005); setNkMaklerPct(0.0357); setNkSonstPct(0);
                setFinancingOn(true); setLtvPct(0.8); setZinsPct(0.039); setTilgungPct(0.02); setCapRatePct(0.055);
                setPriceAdjPct(0); setRentAdjPct(0); setApplyAdjustments(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>
            <button className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition" onClick={exportJson}>
              <Download className="h-4 w-4" /> Export
            </button>
            <label className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card/80 border shadow-sm hover:shadow transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input type="file" className="hidden" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
            </label>
          </div>
        </div>

        {/* Eingaben */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Eingaben</h2>
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
              <div className="grid grid-cols-1 gap-3">
                <NumberField label="Wohnfläche (m²)" value={flaecheM2} onChange={setFlaecheM2} />
                <NumberField label="Kaltmiete (€/m²/Monat)" value={mieteProM2Monat} onChange={setMieteProM2Monat} step={0.1} />
              </div>

              {/* Leerstand & Opex */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leerstand (Quote)</span>
                <InfoBubble text="Prozentualer Mietausfall, z. B. durch Fluktuation/Neuvermietung." />
              </div>
              <PercentField label="Leerstand (%)" value={leerstandPct} onChange={setLeerstandPct} min={0} max={0.95} />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bewirtschaftungskosten (% auf Bruttokaltmiete)</span>
                <InfoBubble text="Nicht umlagefähige Kosten (WEG/Verwaltung, Instandhaltung etc.). Wirken auf NOI/CF." />
              </div>
              <PercentField label="Betriebskosten (Brutto)" value={opexPctBrutto} onChange={setOpexPctBrutto} />

              {/* NK-Split */}
              <div className="text-sm font-medium mt-2">Kaufnebenkosten (Split)</div>
              <PercentField label="Grunderwerbsteuer (%)" value={nkGrEStPct} onChange={setNkGrEStPct} step={0.0005} />
              <PercentField label="Notar (%)" value={nkNotarPct} onChange={setNkNotarPct} step={0.0005} />
              <PercentField label="Grundbuch (%)" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} step={0.0005} />
              <PercentField label="Makler (%)" value={nkMaklerPct} onChange={setNkMaklerPct} step={0.0005} />
              <PercentField label="Sonstiges/Puffer (%)" value={nkSonstPct} onChange={setNkSonstPct} step={0.0005} />

              <div className="text-xs text-muted-foreground">
                Summe NK: <b>{pct(nkPct)}</b> = {eur(nkSum)}.
              </div>
            </div>
          </Card>

          {/* Finanzierung */}
          <Card>
            <div className="flex items-center justify-between">
              <label className="text-sm inline-flex items-center gap-2">
                <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} />
                Finanzierung berücksichtigen
              </label>
              <div className="text-xs text-muted-foreground">Annuität ≈ (Zins + Tilgung) · Darlehen</div>
            </div>
            {financingOn && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct} />
                <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct} step={0.001} />
                <PercentField label="Tilgung p.a. (%)" value={tilgungPct} onChange={setTilgungPct} step={0.001} />
                <div className="text-xs text-muted-foreground">
                  Darlehen: <b>{eur(Math.round(loan))}</b> · Annuität p.a.: <b>{eur(Math.round(annuityYear))}</b>
                </div>
              </div>
            )}
          </Card>

          {/* Bewertung & Profit-Spielplatz */}
          <Card>
            <div className="grid grid-cols-1 gap-3">
              {/* Cap Rate */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Cap Rate
                  <InfoBubble text="Wert ≈ NOI / Cap. Höhere Cap ⇒ niedrigerer Wert (c.p.)." />
                </span>
                <span className="text-xs text-muted-foreground">steigt ⇒ Wert sinkt</span>
              </div>
              <PercentField label="Cap Rate (%)" value={capRatePct} onChange={setCapRatePct} step={0.0005} min={0.02} max={0.12} />

              {/* Playground */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Profit-Spielplatz</div>
                <label className="text-xs inline-flex items-center gap-2">
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} /> in Bewertung verwenden
                </label>
              </div>

              <PercentField
                label={`Kaufpreis ±% · aktuell: ${eur(Math.round(viewIn.kaufpreis))}`}
                value={priceAdjPct}
                onChange={setPriceAdjPct}
                step={0.005}
                min={-0.3}
                max={0.3}
              />
              <div className="text-xs text-muted-foreground -mt-2">{signedPct(priceAdjPct)} = {eur(Math.round(kaufpreis * (1 + priceAdjPct)))}</div>

              <PercentField
                label={`Miete/m² ±% · jetzt: ${mieteProM2Monat.toFixed(2)} €/m²`}
                value={rentAdjPct}
                onChange={setRentAdjPct}
                step={0.005}
                min={-0.2}
                max={0.4}
              />
              <div className="text-xs text-muted-foreground -mt-2">{signedPct(rentAdjPct)} = {(mieteProM2Monat * (1 + rentAdjPct)).toFixed(2)} €/m²</div>
            </div>
          </Card>
        </section>

        {/* Wert vs. Kaufpreis */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Wert (NOI/Cap) vs. Kaufpreis</h2>
          <div className="relative">
            <Card className="overflow-hidden">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Deal", Preis: Math.round(priceForChart), Wert: Math.round(wertForChart) }]} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111827" /><stop offset="100%" stopColor="#374151" /></linearGradient>
                      <linearGradient id="gradWert"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v: any) => v.toLocaleString("de-DE")} />
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
            </Card>
            <motion.span
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className={
                "absolute -top-3 right-3 px-2 py-1 rounded-full text-xs border " +
                (gapPositive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")
              }
            >
              {gapPositive ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(Math.round(valueGap)))} ({signedPct(valueGapPct)})
            </motion.span>
          </div>
        </section>

        {/* Projektion */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Projektion (10 Jahre)</h2>
          <Card className="overflow-hidden">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v: any) => v.toLocaleString("de-DE")} />
                  <RTooltip formatter={(v: any) => eur(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Cashflow" name="Cashflow p.a." stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Tilgung"  name="Tilgung p.a."  stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Vermögen" name="Vermögenszuwachs p.a." stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Monatsrechnung */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Monatsrechnung (Jahr 1)</h2>
          <Card>
            <ul className="text-sm text-foreground space-y-1">
              <li>Eff. Nettokaltmiete (mtl.): <b>{eur(Math.round(monthlyEffRent))}</b></li>
              <li>Bewirtschaftungskosten (mtl.): <b>{eur(Math.round(monthlyOpex))}</b></li>
              {financingOn && (
                <>
                  <li>Zinsen (mtl.): <b>{eur(Math.round(monthlyInterest))}</b></li>
                  <li>Tilgung (mtl.): <b>{eur(Math.round(monthlyPrincipal))}</b></li>
                </>
              )}
              <li>= Cashflow operativ (mtl.): <b>{eur(Math.round(monthlyEffRent - monthlyOpex - monthlyAnnuity))}</b></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Hinweis: NOI = Eff. Nettokaltmiete – nicht umlagefähige BK (vereinfacht). Ohne Steuern.</p>
          </Card>
        </section>

        {/* Break-even & NK */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Break-even</h2>
          <Card>
            <div className="text-sm text-foreground mb-2">
              <p><b>Was bedeutet Break-even?</b> Ab dieser Grenze ist der monatliche Cashflow (vor Steuern) nicht negativ. Oberhalb des Preises bzw. unterhalb der Miete wird CF &lt; 0.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Max. Kaufpreis für CF = 0</span>
                <b>{breakEvenPriceForCashflowZero(viewIn) != null ? eur(breakEvenPriceForCashflowZero(viewIn)!) : "– (nur mit Finanzierung berechenbar)"}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>Benötigte Miete je m²</span>
                <b>{breakEvenRentPerM2ForCashflowZero(viewIn).toFixed(2)} €/m²</b>
              </div>
            </div>
          </Card>

          <h2 className="text-lg font-semibold">Kaufnebenkosten im Detail</h2>
          <Card>
            <ul className="text-sm text-foreground space-y-1">
              <li>Grunderwerbsteuer: {pct(nkGrEStPct)} = {eur(nkSplits.grESt)}</li>
              <li>Notar: {pct(nkNotarPct)} = {eur(nkSplits.notar)}</li>
              <li>Grundbuch: {pct(nkGrundbuchPct)} = {eur(nkSplits.gb)}</li>
              <li>Makler: {pct(nkMaklerPct)} = {eur(nkSplits.makler)}</li>
              {nkSonstPct > 0 && <li>Sonstiges/Puffer: {pct(nkSonstPct)} = {eur(nkSplits.sonst)}</li>}
              <li className="mt-2"><b>Summe NK</b>: {pct(nkPct)} = <b>{eur(nkSum)}</b></li>
              <li>All-in = Kaufpreis + NK = <b>{eur(viewIn.kaufpreis + nkSum)}</b></li>
            </ul>
          </Card>
        </section>

        {/* Glossar – einheitlich unten */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Glossar</h2>
          <Card>
            <dl className="text-sm text-foreground space-y-1.5">
              <div><span className="font-medium">NOI (Net Operating Income):</span> Eff. Kaltmiete – nicht umlagefähige Kosten (vereinfacht, ohne Steuern).</div>
              <div><span className="font-medium">DSCR:</span> NOI / Schuldienst (Zins+Tilgung). ≥ 1,2 ist oft solide.</div>
              <div><span className="font-medium">Cap Rate:</span> Marktrendite-Annahme; Wert ≈ NOI / Cap.</div>
              <div><span className="font-medium">LTV:</span> Loan-to-Value, Darlehen / Kaufpreis.</div>
            </dl>
          </Card>
        </section>
      </div>

      {/* ---------- Sticky Ergebnis-Footer ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="p-3 flex items-center justify-between gap-3">
              {/* Links: Entscheidung + Badges */}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Ergebnis <span className="text-[11px] text-gray-400">({viewTag})</span></div>
                <div className="text-sm font-semibold truncate">
                  Entscheidung: {scoreLabelText(view.scoreLabel)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={`${eur(Math.round(view.cashflowMonat))} mtl.`} hint="Cashflow (Y1)" />
                  <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={`NOI-Yield ${pct(view.noiYield)}`} hint="NOI / Kaufpreis" />
                  <Badge icon={<Sigma className="h-3.5 w-3.5" />} text={`DSCR ${view.dscr ? view.dscr.toFixed(2) : "–"}`} hint="NOI / Schuldienst" />
                </div>
              </div>

              {/* Rechts: Score-Donut */}
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={view.scoreLabel} size={42} />
            </div>

            {/* kleine Progress-Bar farbig (Spiel-Element) */}
            <div className="h-1.5 w-full rounded-b-2xl overflow-hidden bg-surface">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.max(4, Math.min(100, scorePct))}%`,
                  background: `linear-gradient(90deg, ${scoreColor}, #60a5fa)`
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

/* ---------------- Utils ---------------- */
function num(x: any, fb: number) { const v = Number(x); return Number.isFinite(v) ? v : fb; }
