import React, { useEffect, useMemo, useState } from "react";
import { calcWohn, eur, pct, WohnInput, WohnOutput } from "../core/calcs";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, Upload, Sparkles, TrendingUp, Gauge, Banknote } from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LabelList,
  LineChart,
  Line,
} from "recharts";

/** Wohn-Check â€“ Propora Theme (Brand #1b2c47, Gelb #ffde59, Orange #ff914d)
 * - Einspaltiges Layout
 * - Brand Tokens aus propora-theme.css (bg-card, bg-surface, text-foreground, border-border, shadow-soft)
 * - Recharts-Farben auf Brand/CTA/Orange umgestellt
 */

const BRAND = "#1b2c47";
const CTA = "#ffde59";
const ORANGE = "#ff914d";
const WHITE = "#ffffff";

export function WohnCheck() {
  // --- Kerneingaben ---
  const [kaufpreis, setKaufpreis] = useState(350_000);
  const [flaecheM2, setFlaecheM2] = useState(70);
  const [mieteProM2Monat, setMieteProM2Monat] = useState(12);
  const [leerstandPct, setLeerstandPct] = useState(0.05);
  const [opexPctBrutto, setOpexPctBrutto] = useState(0.25);

  // --- Kaufnebenkosten (transparent) ---
  const [nkGrEStPct, setNkGrEStPct] = useState(0.065);
  const [nkNotarPct, setNkNotarPct] = useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = useState(0.0357);
  const [nkSonstPct, setNkSonstPct] = useState(0);

  // Optional: Finanzierung
  const [financingOn, setFinancingOn] = useState(false);
  const [ltvPct, setLtvPct] = useState(0.8);
  const [zinsPct, setZinsPct] = useState(0.04);
  const [tilgungPct, setTilgungPct] = useState(0.02);

  // Bewertung (Cap fÃ¼r Wert vs. Preis)
  const [capRateAssumed, setCapRateAssumed] = useState(0.055);

  // Projektion (einfach)
  const [rentGrowthPct, setRentGrowthPct] = useState(0.02);
  const [costGrowthPct, setCostGrowthPct] = useState(0.02);
  const [valueGrowthPct, setValueGrowthPct] = useState(0.02);

  // Persistenz
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wohncheck.draft.v1");
      if (!raw) return;
      const d = JSON.parse(raw);
      setKaufpreis(d.kaufpreis ?? 350000);
      setFlaecheM2(d.flaecheM2 ?? 70);
      setMieteProM2Monat(d.mieteProM2Monat ?? 12);
      setLeerstandPct(d.leerstandPct ?? 0.05);
      setOpexPctBrutto(d.opexPctBrutto ?? 0.25);
      setNkGrEStPct(d.nkGrEStPct ?? d.nkPct ?? 0.065);
      setNkNotarPct(d.nkNotarPct ?? 0.015);
      setNkGrundbuchPct(d.nkGrundbuchPct ?? 0.005);
      setNkMaklerPct(d.nkMaklerPct ?? 0.0357);
      setNkSonstPct(d.nkSonstPct ?? 0);
      setFinancingOn(d.financingOn ?? false);
      setLtvPct(d.ltvPct ?? 0.8);
      setZinsPct(d.zinsPct ?? 0.04);
      setTilgungPct(d.tilgungPct ?? 0.02);
      setCapRateAssumed(d.capRateAssumed ?? 0.055);
      setRentGrowthPct(d.rentGrowthPct ?? 0.02);
      setCostGrowthPct(d.costGrowthPct ?? 0.02);
      setValueGrowthPct(d.valueGrowthPct ?? 0.02);
    } catch {}
  }, []);
  useEffect(() => {
    const draft = {
      kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto,
      nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
      financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed,
      rentGrowthPct, costGrowthPct, valueGrowthPct
    };
    try { localStorage.setItem("wohncheck.draft.v1", JSON.stringify(draft)); } catch {}
  }, [
    kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto,
    nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
    financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed,
    rentGrowthPct, costGrowthPct, valueGrowthPct
  ]);

  // Aggregierte NK-Quote
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // --- Basiseingabe & -ergebnis ---
  const baseInput: WohnInput = {
    kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto, nkPct,
    financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed
  };
  const outBase: WohnOutput = useMemo(
    () => calcWohn(baseInput),
    [kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto, nkPct, financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed]
  );

  // --- Profit-Spielplatz ---
  const [priceAdjPct, setPriceAdjPct] = useState(0); // -30..+30%
  const [rentAdjPct, setRentAdjPct] = useState(0);   // -20..+40%
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const adjustedRentPerM2 = mieteProM2Monat * (1 + rentAdjPct);

  const adjInput: WohnInput = {
    ...baseInput,
    kaufpreis: adjustedPrice,
    mieteProM2Monat: adjustedRentPerM2
  };
  const outAdj: WohnOutput = useMemo(
    () => calcWohn(adjInput),
    [adjustedPrice, adjustedRentPerM2, flaecheM2, leerstandPct, opexPctBrutto, nkPct, financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed]
  );

  // Ansicht wÃ¤hlen
  const viewInput = applyAdjustments ? adjInput : baseInput;
  const viewOut = applyAdjustments ? outAdj : outBase;
  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";

  // NK-BetrÃ¤ge
  const nkGesamtBetrag = Math.round(viewInput.kaufpreis * nkPct);
  const nkGrEStBetrag = Math.round(viewInput.kaufpreis * nkGrEStPct);
  const nkNotarBetrag = Math.round(viewInput.kaufpreis * nkNotarPct);
  const nkGrundbuchBetrag = Math.round(viewInput.kaufpreis * nkGrundbuchPct);
  const nkMaklerBetrag = Math.round(viewInput.kaufpreis * nkMaklerPct);
  const nkSonstBetrag = Math.round(viewInput.kaufpreis * nkSonstPct);

  // Score-Anzeige
  const scorePct = Math.round(viewOut.score * 100);
  const scoreColor = viewOut.score >= 0.7 ? "#16a34a" : viewOut.score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Wert vs. Preis
  const priceForChart = viewInput.kaufpreis;
  const wertForChart = viewOut.wertAusCap;
  const valueGap = Math.round(wertForChart - priceForChart);
  const valueGapPct = priceForChart > 0 ? (wertForChart - priceForChart) / priceForChart : 0;
  const gapPositive = valueGap >= 0;

  // --- Excel-Ã¤hnliche Auswertung ---
  const grossRentYear = viewInput.flaecheM2 * viewInput.mieteProM2Monat * 12;
  const effectiveRentYear = grossRentYear * (1 - viewInput.leerstandPct);
  const opexYear = grossRentYear * viewInput.opexPctBrutto;
  const loan = viewInput.financingOn ? viewInput.kaufpreis * viewInput.ltvPct : 0;
  const annuityYear = viewInput.financingOn ? loan * (viewInput.zinsPct + viewInput.tilgungPct) : 0;
  const interestYear = viewInput.financingOn ? loan * viewInput.zinsPct : 0;
  const principalYear = viewInput.financingOn ? loan * viewInput.tilgungPct : 0;

  const monthlyEffRent = effectiveRentYear / 12;
  const monthlyOpex = opexYear / 12;
  const monthlyInterest = interestYear / 12;
  const monthlyPrincipal = principalYear / 12;
  const monthlyAnnuity = annuityYear / 12;

  const monthlyCFOperative = monthlyEffRent - monthlyOpex - monthlyAnnuity;
  const monthlyTaxes = 0; // Platzhalter
  const monthlyCFNet = monthlyCFOperative - monthlyTaxes;

  const grossYield = grossRentYear / viewInput.kaufpreis;
  const netYield = (effectiveRentYear - opexYear) / viewInput.kaufpreis;
  const faktor = viewInput.kaufpreis / effectiveRentYear;

  const equityGainNoApp = principalYear;
  const equityGainWithApp = principalYear + (viewInput.kaufpreis * valueGrowthPct);

  // --- 10-J-Projektion ---
  const projYears = 10;
  const projection = useMemo(() => {
    const data: { year: number; cashflowPA: number; tilgungPA: number; vermoegenPA: number; loanOutstanding: number }[] = [];
    let outstanding = loan;
    const baseGross0 = grossRentYear;
    const baseOpex0 = opexYear;
    for (let t = 1; t <= projYears; t++) {
      const gross = baseGross0 * Math.pow(1 + rentGrowthPct, t - 1);
      const eff = gross * (1 - viewInput.leerstandPct);
      const opex = baseOpex0 * Math.pow(1 + costGrowthPct, t - 1);
      const interest = viewInput.financingOn ? outstanding * viewInput.zinsPct : 0;
      const annuity = viewInput.financingOn ? (loan * (viewInput.zinsPct + viewInput.tilgungPct)) : 0;
      const tilgung = Math.max(0, annuity - interest);
      outstanding = Math.max(0, outstanding - tilgung);
      const cashflow = eff - opex - annuity;
      const vermoegen = tilgung + (viewInput.kaufpreis * valueGrowthPct);
      data.push({ year: t, cashflowPA: Math.round(cashflow), tilgungPA: Math.round(tilgung), vermoegenPA: Math.round(vermoegen), loanOutstanding: Math.round(outstanding) });
    }
    return data;
  }, [loan, grossRentYear, opexYear, rentGrowthPct, costGrowthPct, valueGrowthPct, viewInput.leerstandPct, viewInput.tilgungPct, viewInput.zinsPct, projYears]);

  function exportJson() {
    const blob = new Blob([JSON.stringify({ input: baseInput, output: outBase }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "wohn-check.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result));
        const i = obj.input as WohnInput;
        const iAny = i as any;
        setKaufpreis(i.kaufpreis); setFlaecheM2(i.flaecheM2); setMieteProM2Monat(i.mieteProM2Monat);
        setLeerstandPct(i.leerstandPct); setOpexPctBrutto(i.opexPctBrutto);
        const importNk = (iAny?.nkPct ?? nkPct) as number;
        setNkGrEStPct(iAny?.nkGrEStPct ?? Math.min(importNk, 0.065));
        setNkNotarPct(iAny?.nkNotarPct ?? 0.015);
        setNkGrundbuchPct(iAny?.nkGrundbuchPct ?? 0.005);
        setNkMaklerPct(iAny?.nkMaklerPct ?? Math.max(0, importNk - 0.065 - 0.015 - 0.005));
        setNkSonstPct(iAny?.nkSonstPct ?? 0);
        setFinancingOn(i.financingOn); setLtvPct(i.ltvPct); setZinsPct(i.zinsPct); setTilgungPct(i.tilgungPct);
        setCapRateAssumed(i.capRateAssumed);
        setPriceAdjPct(0); setRentAdjPct(0); setApplyAdjustments(true);
      } catch { alert("UngÃ¼ltige Datei"); }
    };
    r.readAsText(file);
  }

  function signedPct(x: number) {
    const v = Math.round(x * 100);
    return (x > 0 ? "+" : "") + v + "%";
  }

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-[var(--radius)] grid place-items-center shadow-soft border border-border"
              style={{
                background: `linear-gradient(135deg, ${CTA} 0%, ${ORANGE} 100%)`,
                color: "#1b2c47"
              }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-brand">Wohn-Check</h2>
              <p className="text-muted-foreground text-sm">Einfach, visuell, spielerisch â€“ mit Live-Score &amp; Break-even.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-[var(--radius)] text-sm inline-flex items-center gap-2 bg-card border border-border shadow-soft hover:shadow-medium transition"
              onClick={()=>{
                setKaufpreis(320000); setFlaecheM2(68); setMieteProM2Monat(12.5);
                setLeerstandPct(0.06); setOpexPctBrutto(0.24);
                setNkGrEStPct(0.065); setNkNotarPct(0.015); setNkGrundbuchPct(0.005); setNkMaklerPct(0.0357); setNkSonstPct(0);
                setFinancingOn(true); setLtvPct(0.8); setZinsPct(0.039); setTilgungPct(0.02); setCapRateAssumed(0.055);
                setRentGrowthPct(0.02); setCostGrowthPct(0.02); setValueGrowthPct(0.02);
                setPriceAdjPct(0); setRentAdjPct(0); setApplyAdjustments(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>
            <button className="px-3 py-2 rounded-[var(--radius)] text-sm inline-flex items-center gap-2 bg-card border border-border shadow-soft hover:shadow-medium transition" onClick={exportJson}>
              <Download className="h-4 w-4" /> Export
            </button>
            <label className="px-3 py-2 rounded-[var(--radius)] text-sm inline-flex items-center gap-2 bg-card border border-border shadow-soft hover:shadow-medium transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input type="file" className="hidden" accept="application/json" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importJson(f);}} />
            </label>
          </div>
        </div>

        {/* Eingaben */}
        <div
          className="rounded-[calc(var(--radius)+2px)] p-[1px] shadow-soft"
          style={{ background: `linear-gradient(135deg, ${CTA} 0%, ${ORANGE} 100%)` }}
        >
          <div className="rounded-[var(--radius)] bg-card p-5 space-y-4 border border-border">
            <div className="text-sm text-foreground font-medium">Eingaben</div>

            <div className="grid grid-cols-1 gap-4">
              <NumberField label="Kaufpreis (â‚¬)" value={kaufpreis} onChange={setKaufpreis} help="Kaufpreis (ohne NK)." />
              <div className="grid grid-cols-1 gap-4">
                <NumberField label="FlÃ¤che (mÂ²)" value={flaecheM2} onChange={setFlaecheM2} />
                <NumberField label="Kaltmiete (â‚¬/mÂ²/Monat)" value={mieteProM2Monat} step={0.1} onChange={setMieteProM2Monat} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <PercentField label="Leerstand (%)" value={leerstandPct} onChange={setLeerstandPct} />
                <PercentField label="Betriebskosten auf Brutto (%)" value={opexPctBrutto} onChange={setOpexPctBrutto} />
              </div>

              {/* Kaufnebenkosten */}
              <fieldset className="border rounded-[var(--radius)] p-3 bg-surface">
                <legend className="text-sm font-medium text-foreground">Kaufnebenkosten (transparent)</legend>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <PercentField label="Grunderwerbsteuer (%)" value={nkGrEStPct} onChange={setNkGrEStPct} step={0.0005}/>
                  <PercentField label="Notar (%)" value={nkNotarPct} onChange={setNkNotarPct} step={0.0005}/>
                  <PercentField label="Grundbuch (%)" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} step={0.0005}/>
                  <PercentField label="Makler (%)" value={nkMaklerPct} onChange={setNkMaklerPct} step={0.0005}/>
                  <PercentField label="Sonstiges/Puffer (%)" value={nkSonstPct} onChange={setNkSonstPct} step={0.0005}/>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Summe NK: <b>{pct(nkPct)}</b> â€ ' {eur(nkGesamtBetrag)}.
                </div>
              </fieldset>

              {/* Finanzierung */}
              <div className="border rounded-[var(--radius)] p-3 bg-surface">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <input type="checkbox" checked={financingOn} onChange={(e)=>setFinancingOn(e.target.checked)} />
                    Finanzierung berÃ¼cksichtigen
                  </label>
                  <span className="text-xs text-muted-foreground">AnnuitÃ¤t â‰ˆ (Zins+Tilgung)Â·Darlehen</span>
                </div>
                <AnimatePresence initial={false}>
                  {financingOn && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="grid grid-cols-1 gap-3 mt-3"
                    >
                      <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct}/>
                      <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct} step={0.001}/>
                      <PercentField label="Tilgung p.a. (%)" value={tilgungPct} onChange={setTilgungPct} step={0.001}/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Projektion */}
              <details>
                <summary className="cursor-pointer text-sm text-foreground">Projektion (optional)</summary>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <PercentField label="Mietsteigerung p.a. (%)" value={rentGrowthPct} onChange={setRentGrowthPct} step={0.001}/>
                  <PercentField label="Kostensteigerung p.a. (%)" value={costGrowthPct} onChange={setCostGrowthPct} step={0.001}/>
                  <PercentField label="Wertsteigerung p.a. (%)" value={valueGrowthPct} onChange={setValueGrowthPct} step={0.001}/>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Ergebnis */}
        <section className="space-y-6">
          <div className="text-sm text-foreground font-medium flex items-center gap-2">
            Ergebnis <span className="text-xs text-muted-foreground">({viewTag})</span>
          </div>

          {/* Score Donut â€“ Brand/CTA-Glow */}
          <div
            className="rounded-[calc(var(--radius)+2px)] p-[1px] shadow-soft"
            style={{ background: `linear-gradient(135deg, ${CTA} 0%, ${ORANGE} 100%)` }}
          >
            <div className="rounded-[var(--radius)] bg-card p-4 border border-border">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                Deal-Score <Help title="Ampel: NOI-Rendite, DSCR, Cashflow & Leerstand." />
              </div>
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={viewOut.scoreLabel} />
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
                <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={pct(viewOut.noiYield)} hint="NOI-Rendite" />
                <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={eur(viewOut.cashflowMonat)} hint="CF mtl." />
                <Badge icon={<TrendingUp className="h-3.5 w-3.5" />} text={viewOut.dscr ? viewOut.dscr.toFixed(2) : "â€“"} hint="DSCR" />
              </div>
            </div>
          </div>

          {/* KPI-Kacheln */}
          <div className="grid grid-cols-1 gap-3">
            <Metric label="Cashflow mtl. (Y1)" value={eur(viewOut.cashflowMonat)} hint="Nach Schuldienst (falls Finanzierung)." />
            <Metric label="NOI-Rendite" value={pct(viewOut.noiYield)} hint="NOI / Kaufpreis." />
            <Metric label="DSCR" value={viewOut.dscr ? viewOut.dscr.toFixed(2) : "â€“"} hint="NOI / Schuldienst (â‰¥1,2 Ã¼blich)." />
          </div>

          {/* Profit-Spielplatz */}
          <div className="rounded-[var(--radius)] border p-4 bg-card shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Profit-Spielplatz</div>
                <p className="text-xs text-muted-foreground mb-3">Zieh an <b>Kaufpreis</b> &amp; <b>Miete/mÂ²</b> â€“ Score &amp; Ergebnis reagieren live.</p>
              </div>
              <label className="text-xs text-foreground inline-flex items-center gap-2">
                <input type="checkbox" checked={applyAdjustments} onChange={(e)=>setApplyAdjustments(e.target.checked)} />
                in Bewertung verwenden
              </label>
            </div>

            <div className="space-y-4">
              <SliderRow
                label="Kaufpreis-Anpassung"
                value={priceAdjPct}
                min={-0.3} max={0.3} step={0.01}
                right={`${signedPct(priceAdjPct)} â€ ' ${eur(adjustedPrice)}`}
                onChange={(v)=>setPriceAdjPct(v)}
              />
              <SliderRow
                label="Miete/mÂ²-Anpassung"
                value={rentAdjPct}
                min={-0.2} max={0.4} step={0.01}
                right={`${signedPct(rentAdjPct)} â€ ' ${adjustedRentPerM2.toFixed(2)} â‚¬/mÂ²`}
                onChange={(v)=>setRentAdjPct(v)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 mt-4">
              <InfoTile title="Cashflow (aktuell)" value={eur(outBase.cashflowMonat)} />
              <InfoTile title="Cashflow (angepasst)" value={<span className={(outAdj.cashflowMonat >= 0 ? "text-green-600" : "text-red-600")}>{eur(outAdj.cashflowMonat)}</span>} />
              <div className="rounded-[var(--radius)] border p-3 bg-card">
                <div className="text-xs text-muted-foreground">Profitabel?</div>
                <div className="mt-1">
                  <span
                    className={
                      "inline-flex items-center px-2 py-1 rounded-full text-xs border " +
                      (outAdj.cashflowMonat >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")
                    }
                  >
                    {outAdj.cashflowMonat >= 0 ? "Ja (CF â‰¥ 0)" : "Nein (CF < 0)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Break-even */}
            <BreakEvenCard input={baseInput} kaufpreis={kaufpreis} mieteProM2Monat={mieteProM2Monat}/>
          </div>

          {/* Wert vs. Kaufpreis */}
          <div
            className="rounded-[calc(var(--radius)+2px)] p-[1px] shadow-soft"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${CTA} 100%)` }}
          >
            <div className="rounded-[var(--radius)] bg-card p-4 border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Wert (NOI/Cap) vs. Kaufpreis</div>
                  <div className="text-xs text-muted-foreground">Basis: {viewTag.toLowerCase()}</div>
                </div>
                <span
                  className={
                    "px-2 py-1 rounded-full text-xs border " +
                    (gapPositive ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")
                  }
                  title="Differenz zwischen Modell-Wert (NOI/Cap) und Kaufpreis"
                >
                  {gapPositive ? "Unter Wert" : "Ãœber Wert"} Â· {eur(Math.abs(valueGap))} ({signedPct(valueGapPct)})
                </span>
              </div>

              <div className="h-56 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Deal", Preis: Math.round(priceForChart), Wert: Math.round(wertForChart) }]} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#2a446e" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="gradWert" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CTA} stopOpacity={1} />
                        <stop offset="100%" stopColor={ORANGE} stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RTooltip formatter={(v:any)=>eur(v)} />
                    <Legend />
                    <Bar dataKey="Preis" fill="url(#gradPreis)" radius={[10,10,0,0]}>
                      <LabelList dataKey="Preis" position="top" formatter={(v:any)=>eur(v)} />
                    </Bar>
                    <Bar dataKey="Wert" fill="url(#gradWert)" radius={[10,10,0,0]}>
                      <LabelList dataKey="Wert" position="top" formatter={(v:any)=>eur(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Hinweis: Cap Rate ist eine Annahme. Modell-Wert ist Orientierung â€“ Lage/Zustand prÃ¼fen.</p>
            </div>
          </div>

          {/* Auswertung / Tabellen */}
          <div className="rounded-[var(--radius)] border p-4 bg-card shadow-soft space-y-6">
            <div>
              <div className="text-sm font-medium text-foreground">Auswertung (Excel-Stil)</div>
              <div className="grid grid-cols-1 gap-3 mt-3">
                <Metric label="Nettokaltmiete p.a." value={eur(Math.round(effectiveRentYear))}/>
                <Metric label="Bruttomietrendite" value={pct(grossYield)} />
                <Metric label="Nettomietrendite" value={pct(netYield)} />
                <Metric label="Faktor" value={faktor.toFixed(2)} />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1 text-foreground">Monatsrechnung</div>
              <ul className="text-sm text-foreground space-y-1">
                <li>Eff. Nettokaltmiete (mtl.): <b>{eur(Math.round(monthlyEffRent))}</b></li>
                <li>Bewirtschaftungskosten (mtl.): <b>{eur(Math.round(monthlyOpex))}</b></li>
                {financingOn && <>
                  <li>Zinsen (mtl.): <b>{eur(Math.round(monthlyInterest))}</b></li>
                  <li>Tilgung (mtl.): <b>{eur(Math.round(monthlyPrincipal))}</b></li>
                </>}
                <li>= Cashflow operativ (mtl.): <b>{eur(Math.round(monthlyCFOperative))}</b></li>
                <li>- Steuern (mtl., Platzhalter): <b>{eur(monthlyTaxes)}</b></li>
                <li>= Cashflow nach Steuern (mtl.): <b>{eur(Math.round(monthlyCFNet))}</b></li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <InfoTile title="VermÃƒgenszuwachs p.a. (ohne Wertsteigerung)" value={eur(Math.round(equityGainNoApp))} subtle />
              <InfoTile title="VermÃƒgenszuwachs p.a. (mit Wertsteigerung)" value={eur(Math.round(equityGainWithApp))} subtle />
            </div>

            {/* 10J-Projektion */}
            <div>
              <div className="text-sm font-medium mb-1 text-foreground">Projektion (10 Jahre)</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projection} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <RTooltip formatter={(v:any)=>eur(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="cashflowPA" name="Cashflow p.a." stroke={BRAND} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="tilgungPA"  name="Tilgung p.a."  stroke={CTA} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="vermoegenPA" name="VermÃƒgenszuwachs p.a." stroke={ORANGE} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Vereinfachte AnnuitÃ¤t: Zinsen auf Restschuld, Tilgung steigt, AnnuitÃ¤t nominal konstant.</p>
            </div>
          </div>

          {/* NK-Transparenz separat */}
          <div className="rounded-[var(--radius)] border p-4 bg-card shadow-soft">
            <div className="text-sm font-medium mb-2 text-foreground">Kaufnebenkosten im Detail</div>
            <ul className="text-sm text-foreground space-y-1">
              <li>Grunderwerbsteuer: {pct(nkGrEStPct)} â€ ' {eur(nkGrEStBetrag)}</li>
              <li>Notar: {pct(nkNotarPct)} â€ ' {eur(nkNotarBetrag)}</li>
              <li>Grundbuch: {pct(nkGrundbuchPct)} â€ ' {eur(nkGrundbuchBetrag)}</li>
              <li>Makler: {pct(nkMaklerPct)} â€ ' {eur(nkMaklerBetrag)}</li>
              {nkSonstPct > 0 && <li>Sonstiges/Puffer: {pct(nkSonstPct)} â€ ' {eur(nkSonstBetrag)}</li>}
              <li className="mt-2"><b>Summe NK</b>: {pct(nkPct)} â€ ' <b>{eur(nkGesamtBetrag)}</b></li>
              <li>All-in-Kaufpreis = Kaufpreis + NK = <b>{eur(viewInput.kaufpreis + nkGesamtBetrag)}</b></li>
            </ul>
          </div>

          {/* KurzeinschÃ¤tzung */}
          <div className="rounded-[var(--radius)] border p-4 bg-card shadow-soft">
            <div className="text-sm font-medium mb-2 text-foreground">Kurze EinschÃ¤tzung <span className="text-xs text-muted-foreground">({viewTag})</span></div>
            <p className="text-sm text-foreground">
              Ergebnis: <b>{scoreLabelText(viewOut.scoreLabel)}</b>.{" "}
              {viewOut.scoreLabel === "BUY" && "Solide Parameter. Lage, Zustand, Mietpotenziale & Finanzierung final prÃ¼fen."}
              {viewOut.scoreLabel === "CHECK" && "Grenzfall â€“ mit Preis-/Miete-Hebel oder tieferer Due-Diligence verbessern."}
              {viewOut.scoreLabel === "NO" && "Aktuell unattraktiv â€“ Preis/Miete/Finanzierung anpassen oder Alternativen vergleichen."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Kleine Hilfskomponenten ---------- */

function NumberField({ label, value, onChange, step = 1, help }: { label: string; value: number; onChange: (n:number)=>void; step?: number; help?: string }) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <input
        className="mt-1 w-full border border-input bg-card text-foreground rounded-[var(--radius)] p-2"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e)=>onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </div>
  );
}
function PercentField({ label, value, onChange, step = 0.005, help }: { label: string; value: number; onChange: (n:number)=>void; step?: number; help?: string }) {
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
          onChange={(e)=>onChange(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <span className="w-28 text-right tabular-nums text-foreground">{pct(value)}</span>
      </div>
    </div>
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
function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>
  );
}
function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border p-4 bg-card shadow-soft">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {label} {hint && <Help title={hint} />}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
function InfoTile({ title, value, subtle }: { title: string; value: React.ReactNode; subtle?: boolean }) {
  return (
    <div className={`rounded-[var(--radius)] border border-border p-3 ${subtle ? "bg-surface" : "bg-card shadow-soft"}`}>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-[11px] text-foreground bg-card shadow-soft" title={hint}>
      {icon} {text}
    </span>
  );
}
function SliderRow({
  label, value, min, max, step, right, onChange
}: { label: string; value: number; min: number; max: number; step: number; right?: string; onChange: (v:number)=>void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {right && <span className="text-foreground">{right}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e)=>onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </div>
  );
}

/* ---------- Score Donut ---------- */
function ScoreDonut({ scorePct, scoreColor, label }: { scorePct: number; scoreColor: string; label: "BUY"|"CHECK"|"NO" }) {
  const rest = Math.max(0, 100 - scorePct);
  return (
    <div className="h-44 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScore" x1="0" y1="0" x2="1" y2="1">
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
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="url(#gradScore)" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: scoreColor }}>
            {scorePct}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">"{label}"</div>
        </div>
      </div>
    </div>
  );
}
function scoreLabelText(s: "BUY"|"CHECK"|"NO") {
  if (s === "BUY") return "Kaufen (unter Vorbehalt)";
  if (s === "CHECK") return "Weiter prÃ¼fen";
  return "Eher Nein";
}

/* ---------- Break-even Card & Solver ---------- */

function BreakEvenCard({ input, kaufpreis, mieteProM2Monat }: { input: WohnInput; kaufpreis:number; mieteProM2Monat:number }) {
  const bePrice = useMemo(() => breakEvenPriceForCashflowZero(input), [input.kaufpreis, input.flaecheM2, input.mieteProM2Monat, input.leerstandPct, input.opexPctBrutto, input.nkPct, input.financingOn, input.ltvPct, input.zinsPct, input.tilgungPct]);
  const beRentPerM2 = useMemo(() => breakEvenRentPerM2ForCashflowZero(input), [input.kaufpreis, input.flaecheM2, input.mieteProM2Monat, input.leerstandPct, input.opexPctBrutto, input.nkPct, input.financingOn, input.ltvPct, input.zinsPct, input.tilgungPct]);
  function signedPct(x: number) { const v = Math.round(x*100); return (x>0?"+":"")+v+"%"; }
  return (
    <div className="mt-4 rounded-[var(--radius)] border p-3 bg-surface">
      <div className="text-xs text-muted-foreground mb-2">Break-even (CF = 0) bei heutigen Annahmen</div>
      <div className="grid gap-2 text-sm text-foreground">
        <div className="flex items-center justify-between"><span>Kaufpreis-Grenze</span>
          <span className="tabular-nums">
            {bePrice != null ? eur(bePrice) : "â€“ (ohne Finanzierung)"}
            {bePrice != null && kaufpreis > 0 && (<span className="ml-2 text-xs text-muted-foreground">({signedPct((bePrice - kaufpreis) / kaufpreis)})</span>)}
          </span>
        </div>
        <div className="flex items-center justify-between"><span>benÃƒtigte Miete/mÂ²</span>
          <span className="tabular-nums">
            {beRentPerM2.toFixed(2)} â‚¬/mÂ²
            {mieteProM2Monat > 0 && (<span className="ml-2 text-xs text-muted-foreground">({signedPct((beRentPerM2 - mieteProM2Monat) / mieteProM2Monat)})</span>)}
          </span>
        </div>
      </div>
    </div>
  );
}
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
    const opex = (base.flaecheM2 * base.mieteProM2Monat * 12) * base.opexPctBrutto;
    const loan = base.kaufpreis * base.ltvPct;
    const annu = loan * (base.zinsPct + base.tilgungPct);
    return (eff - opex - annu) / 12;
  };
  let low = 0, high = Math.max(0.1, base.mieteProM2Monat), cfH = cfAt(high), safe = 0;
  while (cfH < 0 && high < 200 && safe < 60) { high *= 1.2; cfH = cfAt(high); safe++; }
  for (let k = 0; k < 40; k++) { const mid = (low + high) / 2, cf = cfAt(mid); if (cf >= 0) high = mid; else low = mid; }
  return Math.round(((low + high) / 2) * 100) / 100;
}


