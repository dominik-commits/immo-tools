// src/routes/EinfamilienhausCheck.tsx
import React, { useMemo, useState } from "react";
import PlanGuard from "@/components/PlanGuard";
import { motion } from "framer-motion";
import {
  Home as HomeIcon,
  Info,
  Calculator,
  Download,
  Percent,
  Wallet,
  Building2,
  Factory,
  TrendingUp,
  Grid3x3,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

/* ============ kleine Utils ============ */
const eur = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const clamp = (n: number, min = 0, max = Number.POSITIVE_INFINITY) => Math.min(Math.max(n, min), max);

function InfoBubble({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center ml-2 align-middle" title={text} aria-label={text}>
      <Info className="h-4 w-4 text-gray-400" />
    </span>
  );
}

function Section({ title, icon, children }: any) {
  const Icon = icon ?? HomeIcon;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
  type = "number",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
  type?: "number" | "text";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">
        {label}
        {hint ? <InfoBubble text={hint} /> : null}
      </span>
      <div className="flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500">
        <input
          className="w-full rounded-xl px-3 py-2 outline-none"
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value), min ?? -1e12, max ?? 1e12))}
          step={step}
          min={min}
          max={max}
        />
        {suffix ? <span className="pr-3 text-gray-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

/* ============ Komponente ============ */
export default function EinfamilienhausCheck() {
  // --- Kaufdaten
  const [purchasePrice, setPurchasePrice] = useState(450000); // Kaufpreis Immobilie
  const [coldRentMonth, setColdRentMonth] = useState(1900); // Kaltmiete mtl.
  const [vacancyRate, setVacancyRate] = useState(0.04); // Leerstand p.a. (0.04 = 4%)
  const [operatingNonAlloc, setOperatingNonAlloc] = useState(220); // nicht-umlagefähige BK mtl.
  const [maintenance, setMaintenance] = useState(150); // Instandhaltung mtl.
  const [capexYear, setCapexYear] = useState(1000); // planmäßige Modernisierung p.a.
  const [valueGrowth, setValueGrowth] = useState(0.02); // Wertentwicklung p.a.

  // Nebenkosten in %
  const [taxRate, setTaxRate] = useState(0.05); // GrESt
  const [notaryRate, setNotaryRate] = useState(0.016); // Notar+Grundbuch
  const [agentRate, setAgentRate] = useState(0.03); // Makler
  const [renovation, setRenovation] = useState(15000); // CapEx bei Kauf

  // Finanzierung
  const [equity, setEquity] = useState(120000);
  const [interest, setInterest] = useState(0.0375); // Sollzins
  const [redemption, setRedemption] = useState(0.02); // anfängliche Tilgung
  const [years, setYears] = useState(30); // Kalkulationshorizont

  // Steuern (optional)
  const [considerTax, setConsiderTax] = useState(false);
  const [marginalTax, setMarginalTax] = useState(0.30); // pers. Grenzsteuersatz
  const [buildingShare, setBuildingShare] = useState(0.8); // Gebäudewertanteil
  const [afaRate, setAfaRate] = useState(0.02); // lineare AfA p.a.

  /* ======== Kern-Berechnung in Funktion kapseln (für Sensitivität) ======== */
  type Result = ReturnType<typeof compute>;
  function compute(params?: Partial<{
    interest: number;
    coldRentMonth: number;
    vacancyRate: number;
  }>) {
    const _interest = params?.interest ?? interest;
    const _coldRentMonth = params?.coldRentMonth ?? coldRentMonth;
    const _vacancyRate = params?.vacancyRate ?? vacancyRate;

    // Kaufnebenkosten
    const costsTax = purchasePrice * taxRate;
    const costsNotary = purchasePrice * notaryRate;
    const costsAgent = purchasePrice * agentRate;
    const totalAcq = purchasePrice + costsTax + costsNotary + costsAgent + renovation;

    // Finanzierung
    const loanAmount = Math.max(totalAcq - equity, 0);
    const annRate = _interest + redemption; // Annuitätssatz (vereinfachend)
    const annuityYear = loanAmount * annRate; // jährliche Annuität
    const annuityMonth = annuityYear / 12;

    // Miete & NOI
    const grossRentYear = _coldRentMonth * 12;
    const effectiveRentYear = grossRentYear * (1 - _vacancyRate);
    const nonAllocYear = operatingNonAlloc * 12;
    const maintenanceYear = maintenance * 12;
    const opexYear = nonAllocYear + maintenanceYear + capexYear;
    const NOI = Math.max(effectiveRentYear - opexYear, 0);

    // Cashflow
    const interestYear = loanAmount * _interest;
    const cashflowBeforeDebt = NOI;
    const debtService = annuityYear; // Zins+Tilgung
    const cashflowAfterDebt = cashflowBeforeDebt - debtService; // vor Steuern

    // Rendite-Kennzahlen
    const equityInvested = Math.max(equity, 0);
    const coc = equityInvested > 0 ? cashflowAfterDebt / equityInvested : 0;
    const grossYield = purchasePrice > 0 ? grossRentYear / purchasePrice : 0;
    const netYield = purchasePrice > 0 ? NOI / purchasePrice : 0;
    const dscr = debtService > 0 ? NOI / debtService : Infinity;

    // Steuer (optional & vereinfacht)
    let tax = 0;
    let taxableIncome = NOI - interestYear;
    if (considerTax) {
      const buildingValue = purchasePrice * buildingShare;
      const afa = buildingValue * afaRate;
      taxableIncome -= afa;
      tax = Math.max(taxableIncome, 0) * marginalTax;
    }
    const cashflowAfterTax = cashflowAfterDebt - tax;

    // Projektion Restschuld & Wert
    const proj = [];
    let remaining = loanAmount;
    let value = purchasePrice;
    for (let y = 1; y <= years; y++) {
      const interestY = remaining * _interest;
      const redemptionY = Math.min(Math.max(annuityYear - interestY, 0), remaining);
      remaining = Math.max(remaining - redemptionY, 0);
      value = value * (1 + valueGrowth);
      proj.push({
        year: y,
        Restschuld: Math.round(remaining),
        Objektwert: Math.round(value),
      });
    }

    const costBars = [
      { name: "GrESt", Betrag: Math.round(costsTax) },
      { name: "Notar+GB", Betrag: Math.round(costsNotary) },
      { name: "Makler", Betrag: Math.round(costsAgent) },
      { name: "Sofort-Reno", Betrag: Math.round(renovation) },
    ];

    return {
      totalAcq,
      loanAmount,
      annuityMonth,
      grossRentYear,
      effectiveRentYear,
      opexYear,
      NOI,
      interestYear,
      debtService,
      cashflowBeforeDebt,
      cashflowAfterDebt,
      equityInvested,
      coc,
      grossYield,
      netYield,
      dscr,
      taxableIncome,
      tax,
      cashflowAfterTax,
      projection: proj,
      costBars,
    };
  }

  const calc = useMemo(() => compute(), [
    purchasePrice,
    taxRate,
    notaryRate,
    agentRate,
    renovation,
    equity,
    interest,
    redemption,
    years,
    coldRentMonth,
    vacancyRate,
    operatingNonAlloc,
    maintenance,
    capexYear,
    valueGrowth,
    considerTax,
    marginalTax,
    buildingShare,
    afaRate,
  ]);

  /* ======== Sensitivitätsanalyse (±1 %-Punkt) ======== */
  // Schrittweiten: ±1 %-Punkt für Zins/Leerstand/Miete
  const stepsNarrow = [-0.01, 0, 0.01]; // -1pp, 0, +1pp
  // Für die Heatmap nehmen wir etwas feinere Abstufung (0.5 pp) – bitte anpassen, wenn du 3x3 willst:
  const heatmapInterestSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const heatmapRentSteps = [-0.01, -0.005, 0, 0.005, 0.01];

  // 1) Einzel-Sensitivitäten (Zins / Leerstand / Miete) – Auswirkung auf Cashflow & CoC
  const sensInterest = stepsNarrow.map((d) => {
    const r = compute({ interest: clamp(interest + d, 0, 1) });
    return { delta: d, cashflow: r.cashflowAfterDebt, coc: r.coc };
  });
  const sensVacancy = stepsNarrow.map((d) => {
    const r = compute({ vacancyRate: clamp(vacancyRate + d, 0, 0.8) });
    return { delta: d, cashflow: r.cashflowAfterDebt, coc: r.coc };
  });
  const sensRent = stepsNarrow.map((d) => {
    const r = compute({ coldRentMonth: Math.max(0, coldRentMonth * (1 + d)) });
    return { delta: d, cashflow: r.cashflowAfterDebt, coc: r.coc };
  });

  // 2) CoC-Heatmap: Zins (Zeilen) x Miete (Spalten)
  const heatmap = heatmapInterestSteps.map((di) =>
    heatmapRentSteps.map((dm) => {
      const r = compute({
        interest: clamp(interest + di, 0, 1),
        coldRentMonth: Math.max(0, coldRentMonth * (1 + dm)),
      });
      return { di, dm, coc: r.coc };
    })
  );

  // Hilfsfunktionen für Heatmap-Farbe (blass rot -> neutral -> satt grün)
  const allCoc = heatmap.flat().map((c) => c.coc);
  const cocMin = Math.min(...allCoc);
  const cocMax = Math.max(...allCoc);
  const range = Math.max(cocMax - cocMin, 1e-9);
  function cocToColor(coc: number) {
    // normiert 0..1 -> 0 rot, 0.5 gelb, 1 grün
    const t = (coc - cocMin) / range;
    const hue = 0 + (120 - 0) * t; // 0° rot -> 120° grün
    const light = 92 - 30 * t; // 92% -> 62%
    return `hsl(${hue.toFixed(0)}, 80%, ${light.toFixed(0)}%)`;
  }

  /* ======== Export minimal (JSON) ======== */
  function exportJSON() {
    const payload = {
      typ: "Einfamilienhaus (Kapitalanlage)",
      inputs: {
        purchasePrice,
        coldRentMonth,
        vacancyRate,
        operatingNonAlloc,
        maintenance,
        capexYear,
        valueGrowth,
        taxRate,
        notaryRate,
        agentRate,
        renovation,
        equity,
        interest,
        redemption,
        years,
        considerTax,
        marginalTax,
        buildingShare,
        afaRate,
      },
      results: calc,
      sensitivity: {
        interest: sensInterest,
        vacancy: sensVacancy,
        rent: sensRent,
        heatmap: {
          interestSteps: heatmapInterestSteps,
          rentSteps: heatmapRentSteps,
          grid: heatmap.map((row) => row.map((c) => c.coc)),
        },
      },
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "efh-analyzer-propora.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PlanGuard required="pro">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HomeIcon className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold">Einfamilienhaus – Analyzer (Kapitalanlage)</h1>
              <p className="text-sm text-gray-600">
                Fokus: Vermietung, Cashflow, Renditen, DSCR. Nur für Pro-Plan.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportJSON}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Eingaben */}
          <div className="lg:col-span-1 space-y-5">
            <Section title="Kauf & Ertrag" icon={Building2}>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Kaufpreis"
                  value={purchasePrice}
                  onChange={setPurchasePrice}
                  step={1000}
                  min={0}
                  suffix="€"
                  hint="reiner Objektpreis exkl. NK"
                />
                <Field
                  label="Kaltmiete (mtl.)"
                  value={coldRentMonth}
                  onChange={setColdRentMonth}
                  step={50}
                  min={0}
                  suffix="€"
                  hint="aktuelle oder geplante Ist-Miete"
                />
                <Field
                  label="Leerstand"
                  value={vacancyRate}
                  onChange={setVacancyRate}
                  step={0.005}
                  min={0}
                  max={0.5}
                  suffix="%"
                  hint="als Anteil p.a."
                />
                <Field
                  label="Wertzuwachs p.a."
                  value={valueGrowth}
                  onChange={setValueGrowth}
                  step={0.005}
                  min={-0.2}
                  max={0.2}
                  suffix="%"
                  hint="Prognose Objektwert"
                />
                <Field
                  label="Nicht-uml. BK (mtl.)"
                  value={operatingNonAlloc}
                  onChange={setOperatingNonAlloc}
                  step={10}
                  min={0}
                  suffix="€"
                  hint="z. B. Teile Verwaltung, Vers."
                />
                <Field
                  label="Instandhaltung (mtl.)"
                  value={maintenance}
                  onChange={setMaintenance}
                  step={10}
                  min={0}
                  suffix="€"
                />
                <Field
                  label="CapEx (jährl.)"
                  value={capexYear}
                  onChange={setCapexYear}
                  step={250}
                  min={0}
                  suffix="€"
                  hint="planmäßige Modernisierung"
                />
              </div>
            </Section>

            <Section title="Kaufnebenkosten" icon={Factory}>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="GrESt"
                  value={taxRate}
                  onChange={setTaxRate}
                  step={0.005}
                  min={0}
                  max={0.15}
                  suffix="%"
                  hint="bundeslandspezifisch"
                />
                <Field
                  label="Notar + Grundbuch"
                  value={notaryRate}
                  onChange={setNotaryRate}
                  step={0.001}
                  min={0}
                  max={0.03}
                  suffix="%"
                />
                <Field
                  label="Makler"
                  value={agentRate}
                  onChange={setAgentRate}
                  step={0.001}
                  min={0}
                  max={0.07}
                  suffix="%"
                />
                <Field
                  label="Sofort-Renovierung"
                  value={renovation}
                  onChange={setRenovation}
                  step={500}
                  min={0}
                  suffix="€"
                />
              </div>
            </Section>

            <Section title="Finanzierung" icon={Wallet}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Eigenkapital" value={equity} onChange={setEquity} step={1000} min={0} suffix="€" />
                <Field label="Zins (Soll)" value={interest} onChange={setInterest} step={0.0025} min={0} max={0.2} suffix="%" />
                <Field label="Anf. Tilgung" value={redemption} onChange={setRedemption} step={0.0025} min={0} max={0.2} suffix="%" />
                <Field label="Horizont (Jahre)" value={years} onChange={setYears} step={1} min={1} max={50} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="taxToggle"
                  type="checkbox"
                  checked={considerTax}
                  onChange={() => setConsiderTax((v) => !v)}
                  className="h-4 w-4"
                />
                <label htmlFor="taxToggle" className="text-sm text-gray-700">
                  Steuern berücksichtigen (vereinfacht)
                </label>
              </div>
              {considerTax && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Grenzsteuersatz" value={marginalTax} onChange={setMarginalTax} step={0.01} min={0} max={0.6} suffix="%" />
                  <Field label="Gebäudeanteil" value={buildingShare} onChange={setBuildingShare} step={0.05} min={0} max={1} suffix="%" />
                  <Field label="AfA-Rate" value={afaRate} onChange={setAfaRate} step={0.005} min={0} max={0.05} suffix="%" />
                </div>
              )}
            </Section>
          </div>

          {/* Ergebnisse */}
          <div className="lg:col-span-2 space-y-5">
            <Section title="Kern-Kennzahlen" icon={Calculator}>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KPI label="Gesamtinvest (inkl. NK)" value={eur(calc.totalAcq)} />
                <KPI label="Fremdkapital" value={eur(calc.loanAmount)} />
                <KPI label="Annuität (mtl.)" value={eur2(calc.annuityMonth)} />
                <KPI label="NOI (p.a.)" value={eur(calc.NOI)} />

                <KPI label="Brutto-Anfangsrendite" value={pct(calc.grossYield)} />
                <KPI label="Nettorendite" value={pct(calc.netYield)} />
                <KPI label="DSCR" value={calc.dscr === Infinity ? "∞" : calc.dscr.toFixed(2)} />
                <KPI label="CoC (vor St.)" value={pct(calc.coc)} />
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <Stat
                  label="Cashflow (vor Steuer)"
                  value={eur(calc.cashflowAfterDebt)}
                  help="NOI – Annuität (Zins+Tilgung)"
                />
                <Stat
                  label="Cashflow (nach Steuer, vereinf.)"
                  value={eur(calc.cashflowAfterTax)}
                  help="optional: mit AfA & Grenzsteuersatz"
                />
              </div>
            </Section>

            <Section title="Kostenstruktur (Kaufnebenkosten)" icon={Percent}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calc.costBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                    <RTooltip formatter={(v: any) => eur(v as number)} />
                    <Bar dataKey="Betrag">
                      <LabelList position="top" formatter={(v: any) => eur(v as number)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Projektion: Restschuld vs. Wert" icon={TrendingUp}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calc.projection}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                    <RTooltip formatter={(v: any) => eur(v as number)} labelFormatter={(l) => `Jahr ${l}`} />
                    <Legend />
                    <Line dataKey="Restschuld" dot={false} strokeWidth={2} />
                    <Line dataKey="Objektwert" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* ====== NEU: Sensitivität (±1 %-Punkt) ====== */}
            <Section title="Sensitivität (±1 %-Punkt)" icon={Grid3x3}>
              <div className="grid md:grid-cols-3 gap-4">
                <SensitivityCard title="Zins (Soll)" items={sensInterest} />
                <SensitivityCard title="Leerstand" items={sensVacancy} percent />
                <SensitivityCard title="Miete" items={sensRent} percent />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Hinweise: Zins & Leerstand werden additiv in %-Punkten variiert; Miete wird relativ (× (1±Δ)) angepasst.
              </p>
            </Section>

            {/* ====== NEU: CoC-Heatmap (Zins vs. Miete) ====== */}
            <Section title="CoC-Heatmap: Zins (Zeilen) × Miete (Spalten)" icon={Calculator}>
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="text-xs text-gray-500 text-left pr-2">Zins Δ</th>
                      {heatmapRentSteps.map((dm) => (
                        <th key={dm} className="text-xs text-gray-600 text-center px-2">
                          Miete {dm > 0 ? "+" : ""}{(dm * 100).toFixed(1)} pp
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="text-xs text-gray-600 pr-2 whitespace-nowrap">
                          {heatmapInterestSteps[rIdx] > 0 ? "+" : ""}
                          {(heatmapInterestSteps[rIdx] * 100).toFixed(1)} pp
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-0">
                            <div
                              className="rounded-md text-center text-[11px] font-medium px-2 py-1"
                              style={{ background: cocToColor(cell.coc) }}
                              title={`CoC: ${(cell.coc * 100).toFixed(2)}%`}
                            >
                              {(cell.coc * 100).toFixed(1)}%
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Größerer Wert = dunkler/grüner. Schrittweiten anpassbar im Code: <code>heatmapInterestSteps</code>,{" "}
                <code>heatmapRentSteps</code>.
              </p>
            </Section>

            <Section title="Formeln (Kurz erklärt)" icon={Info}>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Gesamtinvest = Kaufpreis + GrESt + Notar/GB + Makler + Sofort-Reno</li>
                <li>NOI = Effektivmiete (nach Leerstand) – nicht-uml. BK – Instandhaltung – CapEx</li>
                <li>Annuität p.a. (vereinfacht) = FK × (Zins + anf. Tilgung)</li>
                <li>DSCR = NOI / Schuldendienst p.a.</li>
                <li>CoC = Cashflow vor Steuern / eingesetztes Eigenkapital</li>
                {considerTax && (
                  <>
                    <li>Zu versteuern ≈ NOI – Zins – AfA (Gebäudeanteil × AfA-Rate)</li>
                    <li>Steuer ≈ max(0, zu versteuern) × Grenzsteuersatz</li>
                  </>
                )}
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </PlanGuard>
  );
}

/* --- kleine Anzeige-Atoms --- */
function KPI({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm"
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </motion.div>
  );
}

function Stat({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {label} {help ? <InfoBubble text={help} /> : null}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

/* --- Sensitivity Card --- */
function SensitivityCard({
  title,
  items,
  percent = false,
}: {
  title: string;
  items: { delta: number; cashflow: number; coc: number }[];
  percent?: boolean; // true => Delta als %-Punkt anzeigen (Leerstand/Miete)
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Grid3x3 className="h-4 w-4 text-indigo-600" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-1">
        <div className="font-medium">Δ</div>
        <div className="font-medium text-right">Cashflow</div>
        <div className="font-medium text-right">CoC</div>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.delta} className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-gray-700">
              {it.delta > 0 ? "+" : ""}
              {(it.delta * 100).toFixed(0)}{percent ? " pp" : " pp"}
            </div>
            <div className={`text-right ${it.cashflow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {eur(Math.round(it.cashflow))}
            </div>
            <div className="text-right">{(it.coc * 100).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
