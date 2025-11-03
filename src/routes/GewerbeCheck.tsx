// src/routes/GewerbeCheck.tsx
// Gewerbe-Check (v3) – PRO: exakte Annuität, Recoverables je Zone, Free-Rent, TI, Cap-Spread, Sticky-Footer

import React, { useMemo, useState } from "react";
import { Briefcase, RefreshCw, Upload, Download, Plus, Trash2, Gauge, Banknote, TrendingUp, Info, ChevronDown } from "lucide-react";
import PlanGuard from "@/components/PlanGuard";
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Legend,
  BarChart, Bar, LabelList, LineChart, Line, PieChart, Pie, Cell
} from "recharts";

/** ----------------------------------------------------------------
 *  Features
 *  - Exakte Annuität + Tilgungsplan
 *  - Recoverable-Opex je Zone
 *  - Free-Rent (Y1) & TI (€/m² upfront)
 *  - Cap-Bewertung mit Risiko-Spread (WALT/Bonität/Indexierung)
 *  - Einheitlicher UI-Standard & Sticky-Footer (Score + Entscheidung)
 *  - Export-Dropdown (JSON / CSV / PDF)
 * ---------------------------------------------------------------- */

type Bonitaet = "A" | "B" | "C";
type Zone = {
  id: string;
  name: string;
  areaM2: number;
  rentPerM2: number;
  vacancyPct: number;
  recoverablePct: number;     // Anteil der Opex, der über NK umlagefähig ist (0..1)
  freeRentMonthsY1: number;   // mietfreie Monate in Jahr 1 (nur Y1)
  tiPerM2: number;            // Tenant Improvements (€/m²), Einmalzahlung t0
  leaseTermYears: number;     // Restlaufzeit/WALT
};

/* ---------- Brandfarben ---------- */
const BRAND = "#1b2c47";   // Primary
const CTA = "#ffde59";     // Gelb
const ORANGE = "#ff914d";  // Orange
const SURFACE_ALT = "#EAEAEE";

/* ---------- kleine Utils inkl. Export-Helper ---------- */
function ts() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
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

/* ---------------- Kleine UI-Atoms ---------------- */

function Help({ title }: { title: string }) {
  return (<span className="inline-flex items-center" title={title}><Info className="h-4 w-4 text-gray-400" /></span>);
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>;
}
function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] text-foreground bg-card" title={hint}>{icon} {text}</span>);
}
function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm text-foreground flex items-center gap-1">
      <span>{label}</span>
      {help && <Help title={help} />}
    </div>
  );
}
function NumberField({ label, value, onChange, step = 1, help }: { label: string; value: number; onChange: (n:number)=>void; step?: number; help?: string }) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <input
        className="mt-1 w-full border rounded-2xl p-2 bg-card text-foreground"
        type="number" step={step}
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
        <input type="range" min={0} max={0.95} step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full" />
        <span className="w-28 text-right tabular-nums text-foreground">{pct(value)}</span>
      </div>
    </div>
  );
}
function PercentFieldCompact({ label, value, onChange, step = 0.005 }: { label: string; value: number; onChange: (n:number)=>void; step?: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={0.95} step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full" />
        <input
          type="number" step={0.1}
          className="w-16 border rounded-2xl p-1 text-right bg-card text-foreground"
          value={(value*100).toFixed(1)}
          onChange={(e)=>onChange(Number(e.target.value)/100)}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
function ScoreDonut({ scorePct, scoreColor, label, size = 42 }: { scorePct: number; scoreColor: string; label: "BUY"|"CHECK"|"NO"; size?: number }) {
  const rest = Math.max(0, 100 - scorePct);
  const inner = Math.round(size * 0.65);
  const outer = Math.round(size * 0.9);
  return (
    <div className="relative" style={{ width: size * 2, height: size * 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScoreG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scoreColor} />
              <stop offset="100%" stopColor={CTA} />
            </linearGradient>
          </defs>
          <Pie
            data={[{ name: "Score", value: scorePct }, { name: "Rest", value: rest }]}
            startAngle={90} endAngle={-270}
            innerRadius={inner} outerRadius={outer}
            dataKey="value" stroke="none"
          >
            <Cell fill="url(#gradScoreG)" />
            <Cell fill={SURFACE_ALT} />
          </Pie>
          <Legend />
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

/* ---------- Export-Dropdown (wie bei den anderen Tools) ---------- */
function ExportDropdown({ onRun }:{ onRun:(opts:{json:boolean; csv:boolean; pdf:boolean})=>void }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(true);
  const [csv, setCsv]   = useState(false);
  const [pdf, setPdf]   = useState(false);

  function run() {
    onRun({ json: json || (!csv && !pdf), csv, pdf });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
        onClick={()=>setOpen(v=>!v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" /> Export
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-3 z-50">
          <div className="text-xs font-medium text-gray-500 mb-2">Formate wählen</div>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={json} onChange={e=>setJson(e.target.checked)} /> JSON
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={csv} onChange={e=>setCsv(e.target.checked)} /> CSV
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={pdf} onChange={e=>setPdf(e.target.checked)} /> PDF
          </label>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50" onClick={()=>setOpen(false)}>Abbrechen</button>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-[#0F2C8A] text-white hover:brightness-110" onClick={run}>Export starten</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Hauptkomponente (PRO) ---------------- */

export default function GewerbeCheck() {
  return (
    <PlanGuard required="pro">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  // --- Deal-Basis ---
  const [kaufpreis, setKaufpreis] = useState(1_200_000);
  const [zonen, setZonen] = useState<Zone[]>([
    { id: uid(), name: "Büro EG", areaM2: 250, rentPerM2: 16, vacancyPct: 0.05, recoverablePct: 0.85, freeRentMonthsY1: 0, tiPerM2: 50, leaseTermYears: 5 },
    { id: uid(), name: "Büro OG", areaM2: 350, rentPerM2: 13, vacancyPct: 0.10, recoverablePct: 0.75, freeRentMonthsY1: 1, tiPerM2: 35, leaseTermYears: 4 },
  ]);

  // Betriebskosten & Rücklage (auf Brutto)
  const [opexTotalPctBrutto, setOpexTotalPctBrutto] = useState(0.26);
  const [capexRuecklagePctBrutto, setCapexRuecklagePctBrutto] = useState(0.04);

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
  const [ltvPct, setLtvPct] = useState(0.6);
  const [zinsPct, setZinsPct] = useState(0.045);
  const [laufzeitYears, setLaufzeitYears] = useState(30);

  // Playground
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // Abgeleitet
  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const KP = applyAdjustments ? adjustedPrice : kaufpreis;

  // --- Zonen-Einnahmen Jahr 1 (Free-Rent berücksichtigt) ---
  const zonenCalcY1 = useMemo(() => computeZonesY1(zonen, rentAdjPct), [zonen, rentAdjPct]);
  const grossRentYearY1 = zonenCalcY1.totalGross;
  const effRentYearY1   = zonenCalcY1.totalEff;
  const tiUpfront       = zonenCalcY1.totalTI;

  // Betriebskosten (Vermieter-Sicht)
  const totalOpexY1 = grossRentYearY1 * opexTotalPctBrutto;
  const recoveredY1 = zonenCalcY1.recoveredOpex(opexTotalPctBrutto);
  const landlordOpexY1 = Math.max(0, totalOpexY1 - recoveredY1);
  const capexY1 = grossRentYearY1 * capexRuecklagePctBrutto;

  // NOI (Y1)
  const noiY1 = effRentYearY1 - landlordOpexY1 - capexY1;

  // Cap-Spread & Wert
  const avgWALT = avgWeighted(zonen.map(z => ({ w: z.areaM2, v: z.leaseTermYears })));
  const capSpread = calcCapSpread(avgWALT, bonitaetTop3, indexiert);
  const capEff    = clampMin(capRateAssumed + capSpread, 0.0001);
  const wertAusCap = capEff > 0 ? noiY1 / capEff : 0;

  // Finanzierung – exakte Annuität
  const loan = financingOn ? KP * ltvPct : 0;
  const annuityYear = financingOn ? annuityExact(loan, zinsPct, laufzeitYears) : 0; // exakt
  const interestY1  = financingOn ? loan * zinsPct : 0; // Näherung Y1
  const principalY1 = financingOn ? Math.max(0, annuityYear - interestY1) : 0;

  const cashflowMonatY1 = (noiY1 - annuityYear - tiUpfront) / 12; // TI einmalig in Y1

  // KPIs
  const noiYield = KP > 0 ? noiY1 / KP : 0;
  const dscr = financingOn && annuityYear > 0 ? noiY1 / annuityYear : null;

  // NK
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;
  const nkBetrag = Math.round(KP * nkPct);

  // Score (Ampel)
  const score = clamp01( scale(noiYield, 0.045, 0.09)*0.5 + scale(dscr ?? 0, 1.2, 1.7)*0.35 + scale(cashflowMonatY1, 0, 1200)*0.15 );
  const scoreLabel: "BUY"|"CHECK"|"NO" = score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";
  const scorePct = Math.round(score*100);
  const scoreColor = score >= 0.7 ? "#16a34a" : score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Projektion (10y)
  const projection = useMemo(()=>buildProjection10y({
    years: 10,
    zones: zonen, rentAdjPct,
    opexPct: opexTotalPctBrutto, capexPct: capexRuecklagePctBrutto,
    rentGrowthPct: 0.015, costGrowthPct: 0.02,
    loan, zinsPct, yearsLoan: laufzeitYears, financingOn, annuityExactFn: annuityExact,
  }), [zonen, rentAdjPct, opexTotalPctBrutto, capexRuecklagePctBrutto, loan, zinsPct, laufzeitYears, financingOn]);

  // Tilgungsplan (exakt)
  const tilgungsplan = useMemo(()=>buildAmortizationExact(loan, zinsPct, laufzeitYears, financingOn, annuityExact), [loan, zinsPct, laufzeitYears, financingOn]);

  const viewTag = applyAdjustments ? "Angepasst" : "Aktuell";
  const valueGap = Math.round(wertAusCap - KP);
  const valueGapPct = KP > 0 ? (wertAusCap - KP)/KP : 0;

  // UI helpers
  function updateZone(id:string, patch: Partial<Zone>) { setZonen(prev => prev.map(z => z.id === id ? { ...z, ...patch } : z)); }
  function removeZone(id:string) { setZonen(prev => prev.filter(z => z.id !== id)); }

  // ---------- Export-Funktionen ----------
  function handleExportJSON() {
    const payload = {
      generatedAt: new Date().toISOString(),
      input: {
        kaufpreis: KP, zonen,
        opexTotalPctBrutto, capexRuecklagePctBrutto,
        capRateAssumed, bonitaetTop3, indexiert,
        nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
        financingOn, ltvPct, zinsPct, laufzeitYears,
        priceAdjPct, rentAdjPct, applyAdjustments
      },
      output: {
        grossRentYearY1, effRentYearY1, totalOpexY1, recoveredY1, landlordOpexY1, capexY1, tiUpfront,
        noiY1, noiYield, dscr,
        capEff, capSpread, wertAusCap,
        cashflowMonatY1, score, scoreLabel, valueGap, valueGapPct
      }
    };
    downloadBlob(`gewerbe_export_${ts()}.json`, "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
  }
  function handleExportCSV() {
    const rows: (string|number)[][] = [
      ["Abschnitt","Feld","Wert"],
      ["Eingaben","Kaufpreis (€)", KP],
      ["Eingaben","Opex gesamt (% Brutto)", pct(opexTotalPctBrutto)],
      ["Eingaben","CapEx-Rücklage (% Brutto)", pct(capexRuecklagePctBrutto)],
      ["Eingaben","Cap Rate (Basis)", pct(capRateAssumed)],
      ["Eingaben","Top-3 Bonität", bonitaetTop3],
      ["Eingaben","Indexiert", indexiert ? "Ja" : "Nein"],
      ["Eingaben","NK gesamt (%)", pct(nkPct)],
      ["Finanzierung","Aktiv", financingOn ? "Ja" : "Nein"],
      ["Finanzierung","LTV", financingOn ? pct(ltvPct) : "-"],
      ["Finanzierung","Zins p.a.", financingOn ? pct(zinsPct) : "-"],
      ["Finanzierung","Laufzeit (J)", financingOn ? laufzeitYears : "-"],
      [],
      ["Ergebnis (Y1)","NOI p.a.", eur(Math.round(noiY1))],
      ["Ergebnis (Y1)","NOI-Yield", pct(noiYield)],
      ["Ergebnis (Y1)","DSCR", dscr ? dscr.toFixed(2) : "-"],
      ["Ergebnis (Y1)","Cashflow mtl. (inkl. TI)", eur(Math.round(cashflowMonatY1))],
      ["Ergebnis (Y1)","Modellwert (NOI/Cap_eff)", eur(Math.round(wertAusCap))],
      ["Ergebnis (Y1)","Effektive Cap", pct(capEff)],
      ["Ergebnis (Y1)","Cap-Spread (bp)", (capSpread*10000).toFixed(0)],
      ["Ergebnis (Y1)","Wert-Gap", `${eur(Math.abs(valueGap))} (${signedPct(valueGapPct)})`],
      [],
      ["Kosten (Y1)","Bruttomiete", eur(Math.round(grossRentYearY1))],
      ["Kosten (Y1)","Effektive Miete", eur(Math.round(effRentYearY1))],
      ["Kosten (Y1)","Opex gesamt", eur(Math.round(totalOpexY1))],
      ["Kosten (Y1)","Recoverables (Mieter)", eur(Math.round(recoveredY1))],
      ["Kosten (Y1)","Vermieter-Opex", eur(Math.round(landlordOpexY1))],
      ["Kosten (Y1)","CapEx-Rücklage", eur(Math.round(capexY1))],
      ["Kosten (Y1)","TI upfront", eur(Math.round(tiUpfront))],
      [],
      ["Zonen","Spalten","Name;Fläche m²;Miete €/m²;Leerstand %;Recoverable %;FreeRentMonateY1;TI €/m²;LeaseTerm J"],
    ];
    for (const z of zonen) {
      rows.push(["Zonen","Zeile",
        `${z.name};${z.areaM2};${z.rentPerM2};${(z.vacancyPct*100).toFixed(1)};${(z.recoverablePct*100).toFixed(1)};${z.freeRentMonthsY1};${z.tiPerM2};${z.leaseTermYears}`
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const csvWithBom = "\uFEFF" + csv;
    downloadBlob(`gewerbe_export_${ts()}.csv`, "text/csv;charset=utf-8", csvWithBom);
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
<tr><th>Finanzierung</th><td class="right">${financingOn ? `Ja – LTV ${pct(ltvPct)}, Zins ${pct(zinsPct)}, Laufzeit ${laufzeitYears} J.` : "Nein"}</td></tr>
<tr><th>Kaufnebenkosten gesamt</th><td class="right">${pct(nkPct)} (${eur(nkBetrag)})</td></tr>
</table>

<h2>Ergebnis (Jahr 1)</h2>
<table>
<tr><th>NOI p.a.</th><td class="right">${eur(Math.round(noiY1))}</td></tr>
<tr><th>NOI-Yield</th><td class="right">${pct(noiYield)}</td></tr>
<tr><th>DSCR</th><td class="right">${dscr ? dscr.toFixed(2) : "–"}</td></tr>
<tr><th>Cashflow mtl. (inkl. TI)</th><td class="right">${eur(Math.round(cashflowMonatY1))}</td></tr>
<tr><th>Effektive Cap</th><td class="right">${pct(capEff)} <span class="badge">${(capSpread*10000).toFixed(0)} bp Spread</span></td></tr>
<tr><th>Modellwert (NOI/Cap)</th><td class="right">${eur(Math.round(wertAusCap))}</td></tr>
<tr><th>Wert-Gap</th><td class="right">${eur(Math.abs(valueGap))} (${signedPct(valueGapPct)})</td></tr>
</table>

<h2>Zonen (Y1)</h2>
<table>
  <thead><tr>
    <th>Name</th><th class="right">Fläche</th><th class="right">Miete</th><th class="right">Leerstand</th>
    <th class="right">Recoverable</th><th class="right">Free-Rent</th><th class="right">TI</th><th class="right">LeaseTerm</th>
  </tr></thead>
  <tbody>
  ${zonen.map(z=>`
    <tr>
      <td>${z.name}</td>
      <td class="right">${z.areaM2.toLocaleString("de-DE")} m²</td>
      <td class="right">${z.rentPerM2.toFixed(2)} €/m²</td>
      <td class="right">${pct(z.vacancyPct)}</td>
      <td class="right">${pct(z.recoverablePct)}</td>
      <td class="right">${z.freeRentMonthsY1} Mo</td>
      <td class="right">${eur(Math.round(z.tiPerM2*z.areaM2))}</td>
      <td class="right">${z.leaseTermYears.toFixed(1)} J</td>
    </tr>
  `).join("")}
  </tbody>
</table>

<h2>Kostenaufschlüsselung (Y1)</h2>
<table>
<tr><th>Bruttomiete</th><td class="right">${eur(Math.round(grossRentYearY1))}</td></tr>
<tr><th>Effektive Miete</th><td class="right">${eur(Math.round(effRentYearY1))}</td></tr>
<tr><th>Opex gesamt</th><td class="right">${eur(Math.round(totalOpexY1))}</td></tr>
<tr><th>Recoverables (Mieter)</th><td class="right">${eur(Math.round(recoveredY1))}</td></tr>
<tr><th>Vermieter-Opex</th><td class="right">${eur(Math.round(landlordOpexY1))}</td></tr>
<tr><th>CapEx-Rücklage</th><td class="right">${eur(Math.round(capexY1))}</td></tr>
<tr><th>TI upfront</th><td class="right">${eur(Math.round(tiUpfront))}</td></tr>
</table>

<script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
</body></html>`.trim();

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }
  function runSelectedExports(opts:{json:boolean; csv:boolean; pdf:boolean}) {
    if (opts.json) handleExportJSON();
    if (opts.csv)  handleExportCSV();
    if (opts.pdf)  handleExportPDF();
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-surface text-foreground">
      {/* Inhalt mit extra Bottom-Padding für den Sticky Footer */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-40">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shadow" style={{ background: `linear-gradient(135deg, ${BRAND}, ${ORANGE})`, color: "#fff" }}>
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Gewerbe-Check</h2>
              <p className="text-muted-foreground text-sm">Exakte Annuität, Recoverables je Zone & Incentives – übersichtlich wie MFH.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={()=>{
                setKaufpreis(1_200_000);
                setZonen([
                  { id: uid(), name: "Büro EG", areaM2: 250, rentPerM2: 16, vacancyPct: 0.05, recoverablePct: 0.85, freeRentMonthsY1: 0, tiPerM2: 50, leaseTermYears: 5 },
                  { id: uid(), name: "Büro OG", areaM2: 350, rentPerM2: 13, vacancyPct: 0.10, recoverablePct: 0.75, freeRentMonthsY1: 1, tiPerM2: 35, leaseTermYears: 4 },
                ]);
                setOpexTotalPctBrutto(0.26); setCapexRuecklagePctBrutto(0.04);
                setCapRateAssumed(0.065); setBonitaetTop3("B"); setIndexiert(true);
                setNkGrEStPct(0.065); setNkNotarPct(0.015); setNkGrundbuchPct(0.005); setNkMaklerPct(0.0357); setNkSonstPct(0);
                setFinancingOn(true); setLtvPct(0.6); setZinsPct(0.045); setLaufzeitYears(30);
                setPriceAdjPct(0); setRentAdjPct(0); setApplyAdjustments(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>

            {/* Neuer Export: Dropdown mit Checkboxen */}
            <ExportDropdown onRun={runSelectedExports} />

            {/* Import */}
            <label className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input type="file" className="hidden" accept="application/json" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importJson(f);}} />
            </label>
          </div>
        </div>

        {/* Eingaben */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Eingaben</h2>

          <Card>
            <div className="grid grid-cols-1 gap-4">
              <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
              <div className="grid grid-cols-1 gap-4">
                <PercentField label="Opex gesamt (% Brutto)" value={opexTotalPctBrutto} onChange={setOpexTotalPctBrutto} />
                <PercentField label="CapEx-Rücklage (% Brutto)" value={capexRuecklagePctBrutto} onChange={setCapexRuecklagePctBrutto} />
              </div>
            </div>
          </Card>

          {/* Zonen */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">Mietzonen</div>
              <button
                className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-card hover:shadow"
                onClick={()=> setZonen(prev => [...prev, {
                  id: uid(), name: `Zone ${prev.length+1}`, areaM2: 120, rentPerM2: 10, vacancyPct: 0.1,
                  recoverablePct: 0.8, freeRentMonthsY1: 0, tiPerM2: 0, leaseTermYears: 3
                }])}
              >
                <Plus className="h-3.5 w-3.5" /> Zeile
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {zonen.map((z, idx) => (
                <div key={z.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <LabelWithHelp label="Name" />
                    <input className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground" value={z.name} onChange={(e)=>updateZone(z.id, { name: e.target.value })}/>
                  </div>
                  <div className="col-span-2">
                    <LabelWithHelp label="Fläche (m²)" />
                    <input type="number" className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground" value={z.areaM2} onChange={(e)=>updateZone(z.id, { areaM2: num(e.target.value, z.areaM2) })}/>
                  </div>
                  <div className="col-span-2">
                    <LabelWithHelp label="Miete (€/m²/Monat)" />
                    <input type="number" step={0.1} className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground" value={z.rentPerM2} onChange={(e)=>updateZone(z.id, { rentPerM2: num(e.target.value, z.rentPerM2) })}/>
                  </div>
                  <div className="col-span-2">
                    <PercentFieldCompact label="Leerstand (%)" value={z.vacancyPct} onChange={(v)=>updateZone(z.id, { vacancyPct: v })}/>
                  </div>
                  <div className="col-span-3">
                    <PercentFieldCompact label="Recoverable (%)" value={z.recoverablePct} onChange={(v)=>updateZone(z.id, { recoverablePct: v })}/>
                  </div>

                  <div className="col-span-3">
                    <NumberField label="Free-Rent (Monate Y1)" value={z.freeRentMonthsY1} step={1} onChange={(v)=>updateZone(z.id, { freeRentMonthsY1: Math.max(0, Math.min(24, Math.round(v))) })}/>
                  </div>
                  <div className="col-span-3">
                    <NumberField label="TI (€/m², upfront)" value={z.tiPerM2} step={5} onChange={(v)=>updateZone(z.id, { tiPerM2: Math.max(0, v) })}/>
                  </div>
                  <div className="col-span-3">
                    <NumberField label="Lease Term (J)" value={z.leaseTermYears} step={0.5} onChange={(v)=>updateZone(z.id, { leaseTermYears: Math.max(0.5, v) })}/>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button className="mb-1 inline-flex items-center justify-center h-9 w-9 rounded-lg border hover:bg-red-50" onClick={()=>removeZone(z.id)} title="Zeile löschen">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>

                  <div className="col-span-12 text-xs text-muted-foreground -mt-1">
                    Brutto p.a. (Y1, inkl. Free-Rent): <b>{eur(Math.round(z.areaM2 * z.rentPerM2 * 12 * (1 - Math.min(z.freeRentMonthsY1,12)/12)))}</b> ·
                    Eff. p.a.: <b>{eur(Math.round(z.areaM2 * z.rentPerM2 * 12 * (1 - Math.min(z.freeRentMonthsY1,12)/12) * (1 - z.vacancyPct)))}</b> ·
                    TI upfront: <b>{eur(Math.round(z.areaM2 * z.tiPerM2))}</b>
                  </div>
                  {idx < zonen.length - 1 && <div className="col-span-12 border-b" />}
                </div>
              ))}
            </div>
          </Card>

          {/* Risiko/Cap */}
          <Card className="bg-surface">
            <div className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
              Risikofaktoren <Help title="Cap-Spread aus WALT, Bonität, Indexierung." />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Ø WALT (auto, aus Zonen)" value={avgWALT} onChange={()=>{}} step={0.1} />
                <div>
                  <LabelWithHelp label="Top-3 Bonität" help="A (sehr gut), B (solide), C (schwach)" />
                  <select className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground" value={bonitaetTop3} onChange={(e)=>setBonitaetTop3(e.target.value as Bonitaet)}>
                    <option value="A">A – sehr gut</option>
                    <option value="B">B – solide</option>
                    <option value="C">C – schwach</option>
                  </select>
                </div>
              </div>
              <label className="text-sm text-foreground inline-flex items-center gap-2">
                <input type="checkbox" checked={indexiert} onChange={(e)=>setIndexiert(e.target.checked)} />
                Mietverträge indexiert (z. B. VPI)
              </label>

              <div className="grid grid-cols-2 gap-3">
                <PercentField label="Cap Rate (Basis) (%)" value={capRateAssumed} onChange={setCapRateAssumed} step={0.0005} />
                <div className="rounded-lg border p-3 bg-card">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    Effektive Cap <Help title="Basis-Cap ± Spread (WALT/Bonität/Indexierung)." />
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {pct(capEff)} <span className="text-xs text-muted-foreground">({signedPct(capSpread)} Spread)</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Finanzierung */}
          <Card className="bg-surface">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <input type="checkbox" checked={financingOn} onChange={(e)=>setFinancingOn(e.target.checked)} />
                Finanzierung berücksichtigen
              </label>
              <span className="text-xs text-muted-foreground">Exakte Annuität: Rate = L·r / (1−(1+r)^(−n))</span>
            </div>
            {financingOn && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct} />
                <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct} step={0.001} />
                <NumberField label="Laufzeit (Jahre)" value={laufzeitYears} step={1} onChange={setLaufzeitYears} />
              </div>
            )}
          </Card>

          {/* Playground */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Profit-Spielplatz</div>
                <p className="text-xs text-muted-foreground mb-3">Kaufpreis & Ø-Miete gemeinsam justieren.</p>
              </div>
              <label className="text-xs text-foreground inline-flex items-center gap-2">
                <input type="checkbox" checked={applyAdjustments} onChange={(e)=>setApplyAdjustments(e.target.checked)} />
                in Bewertung verwenden
              </label>
            </div>
            <div className="space-y-4">
              <SliderRow label="Kaufpreis-Anpassung" value={priceAdjPct} min={-0.3} max={0.3} step={0.01} right={`${signedPct(priceAdjPct)} = ${eur(adjustedPrice)}`} onChange={setPriceAdjPct}/>
              <SliderRow label="Miete/m²-Anpassung (alle Zonen)" value={rentAdjPct} min={-0.3} max={0.5} step={0.01} right={`${signedPct(rentAdjPct)}`} onChange={setRentAdjPct}/>
            </div>
          </Card>
        </section>

        {/* Ergebnisse */}
        <section className="space-y-6">
          <div className="text-sm text-foreground font-medium flex items-center gap-2">
            Ergebnis <span className="text-xs text-muted-foreground">({viewTag})</span>
          </div>

          {/* Kostenaufteilung */}
          <Card>
            <div className="text-sm font-medium mb-2 text-foreground">Kostenaufteilung (Y1, auf Brutto)</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                        { name: "Opex gesamt", value: totalOpexY1 },
                        { name: "davon recoverable (Mieter)", value: recoveredY1 },
                        { name: "Vermieter-Opex", value: landlordOpexY1 },
                        { name: "CapEx-Rücklage", value: capexY1 },
                      ]}
                      innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                    <Cell fill={BRAND} />
                    <Cell fill={CTA} />
                    <Cell fill={ORANGE} />
                    <Cell fill={SURFACE_ALT} />
                  </Pie>
                  <RTooltip formatter={(v:any)=>eur(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recoverables entlasten den Vermieter; TI ist Einmalzahlung (separat in CF).</p>
          </Card>

          {/* Wert vs. Preis */}
          <ValueVsPrice KP={KP} wertAusCap={wertAusCap} valueGap={valueGap} valueGapPct={valueGapPct} capEff={capEff} capRateAssumed={capRateAssumed} capSpread={capSpread} viewTag={viewTag} />

          {/* Projektion */}
          <Card>
            <div className="text-sm font-medium mb-1 text-foreground">Projektion (10 Jahre)</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis />
                  <RTooltip formatter={(v:any)=>eur(v)} /><Legend />
                  <Line type="monotone" dataKey="cashflowPA" name="Cashflow p.a." stroke={BRAND} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tilgungPA"  name="Tilgung p.a."  stroke={CTA} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Y1: Free-Rent & TI wirken einmalig; ab Y2 normalisiert sich die Miete (mit Growth).</p>
          </Card>

          {/* Tilgungsplan */}
          {financingOn && (<AmortTable plan={tilgungsplan} />)}

          {/* NK-Detail */}
          <Card>
            <div className="text-sm font-medium mb-2 text-foreground">Kaufnebenkosten im Detail</div>
            <ul className="text-sm text-foreground space-y-1">
              <li>Grunderwerbsteuer: {pct(nkGrEStPct)} = {eur(Math.round(KP * nkGrEStPct))}</li>
              <li>Notar: {pct(nkNotarPct)} = {eur(Math.round(KP * nkNotarPct))}</li>
              <li>Grundbuch: {pct(nkGrundbuchPct)} = {eur(Math.round(KP * nkGrundbuchPct))}</li>
              <li>Makler: {pct(nkMaklerPct)} = {eur(Math.round(KP * nkMaklerPct))}</li>
              {nkSonstPct > 0 && <li>Sonstiges/Puffer: {pct(nkSonstPct)} = {eur(Math.round(KP * nkSonstPct))}</li>}
              <li className="mt-2"><b>Summe NK</b>: {pct(nkPct)} = <b>{eur(nkBetrag)}</b></li>
              <li>All-in-Kaufpreis = Kaufpreis + NK = <b>{eur(Math.round(KP * (1 + nkPct)))}</b></li>
            </ul>
          </Card>
        </section>
      </div>

      {/* ---------- Sticky Ergebnis-Footer ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="p-3 flex items-center justify-between gap-3">
              {/* Links: Entscheidung + Badges */}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Ergebnis <span className="text-[11px] text-muted-foreground">(live)</span></div>
                <div className="text-sm font-semibold truncate text-foreground">
                  Entscheidung: {scoreLabel==="BUY" ? "Kaufen (unter Vorbehalt)" : scoreLabel==="CHECK" ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={eur(Math.round(cashflowMonatY1)) + " mtl."} hint="Cashflow (Y1, inkl. TI)" />
                  <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={`NOI-Yield ${pct(noiYield)}`} hint="NOI / Kaufpreis" />
                  <Badge icon={<TrendingUp className="h-3.5 w-3.5" />} text={dscr ? dscr.toFixed(2) : "–"} hint="DSCR (Y1)" />
                </div>
              </div>
              {/* Rechts: Score-Donut */}
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={scoreLabel} size={42} />
            </div>
            {/* Progress-Bar */}
            <div className="h-1.5 w-full rounded-b-2xl overflow-hidden" style={{ background: SURFACE_ALT }}>
              <div
                className="h-full transition-all"
                style={{ width: `${Math.max(4, Math.min(100, scorePct))}%`, background: `linear-gradient(90deg, ${scoreColor}, ${CTA})` }}
                aria-label={`Score ${scorePct}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------- Import ----------
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setKaufpreis(num(d.kaufpreis, kaufpreis));
        setZonen(Array.isArray(d.zonen) && d.zonen.length ? d.zonen.map((z:any)=>({
          id: z.id ?? uid(),
          name: String(z.name ?? "Zone"),
          areaM2: num(z.areaM2, 0),
          rentPerM2: num(z.rentPerM2, 0),
          vacancyPct: clamp01(num(z.vacancyPct, 0)),
          recoverablePct: clamp01(num(z.recoverablePct, 0.8)),
          freeRentMonthsY1: Math.max(0, Math.min(24, Math.floor(num(z.freeRentMonthsY1, 0)))),
          tiPerM2: Math.max(0, num(z.tiPerM2, 0)),
          leaseTermYears: Math.max(0.5, num(z.leaseTermYears, 3))
        })) : zonen);
        setOpexTotalPctBrutto(num(d.opexTotalPctBrutto, opexTotalPctBrutto));
        setCapexRuecklagePctBrutto(num(d.capexRuecklagePctBrutto, capexRuecklagePctBrutto));
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
      } catch { alert("Ungültige Datei"); }
    };
    r.readAsText(file);
  }
}

/* ---------------- Charts/Widgets ---------------- */

function ValueVsPrice({ KP, wertAusCap, valueGap, valueGapPct, capEff, capRateAssumed, capSpread, viewTag }:{
  KP:number; wertAusCap:number; valueGap:number; valueGapPct:number; capEff:number; capRateAssumed:number; capSpread:number; viewTag:string;
}){
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">Wert (NOI/Cap_eff) vs. Kaufpreis</div>
          <div className="text-xs text-muted-foreground">Basis: {viewTag.toLowerCase()}</div>
        </div>
        <span className={"px-2 py-1 rounded-full text-xs border " + (valueGap >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
          {valueGap >= 0 ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(valueGap))} ({signedPct(valueGapPct)})
        </span>
      </div>
      <div className="h-56 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{ name: "Deal", Preis: Math.round(KP), Wert: Math.round(wertAusCap) }]} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} /><stop offset="100%" stopColor="#2a446e" />
              </linearGradient>
              <linearGradient id="gradWert"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CTA} /><stop offset="100%" stopColor={ORANGE} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis />
            <RTooltip formatter={(v:any)=>eur(v)} /><Legend />
            <Bar dataKey="Preis" fill="url(#gradPreis)" radius={[10,10,0,0]}><LabelList dataKey="Preis" position="top" formatter={(v:any)=>eur(v)} /></Bar>
            <Bar dataKey="Wert"  fill="url(#gradWert)"  radius={[10,10,0,0]}><LabelList dataKey="Wert"  position="top" formatter={(v:any)=>eur(v)} /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Effektive Cap: {pct(capEff)} (Basis {pct(capRateAssumed)} {capSpread>=0?"+":"-"} {Math.abs(capSpread*100).toFixed(1)} bp Risiko).</p>
    </div>
  );
}

function AmortTable({ plan }:{ plan:{ rows:{year:number; interest:number; principal:number; annuity:number; outstanding:number;}[]; sum10:{interest:number; principal:number; annuity:number;} } }){
  if (!plan.rows.length) return null;
  return (
    <Card>
      <div className="text-sm font-medium mb-2 text-foreground">Tilgungsplan (exakte Annuität)</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-4">Jahr</th>
              <th className="py-2 pr-4">Zins</th>
              <th className="py-2 pr-4">Tilgung</th>
              <th className="py-2 pr-4">Annuität</th>
              <th className="py-2 pr-4">Restschuld</th>
            </tr>
          </thead>
          <tbody>
            {plan.rows.slice(0, Math.min(10, plan.rows.length)).map(r => (
              <tr key={r.year} className="border-b last:border-0">
                <td className="py-1 pr-4">{r.year}</td>
                <td className="py-1 pr-4 tabular-nums">{eur(Math.round(r.interest))}</td>
                <td className="py-1 pr-4 tabular-nums">{eur(Math.round(r.principal))}</td>
                <td className="py-1 pr-4 tabular-nums">{eur(Math.round(r.annuity))}</td>
                <td className="py-1 pr-4 tabular-nums">{eur(Math.round(r.outstanding))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2 pr-4 font-medium">Summe (10J)</td>
              <td className="py-2 pr-4 font-medium tabular-nums">{eur(Math.round(plan.sum10.interest))}</td>
              <td className="py-2 pr-4 font-medium tabular-nums">{eur(Math.round(plan.sum10.principal))}</td>
              <td className="py-2 pr-4 font-medium tabular-nums">{eur(Math.round(plan.sum10.annuity))}</td>
              <td className="py-2 pr-4" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">TI wird als einmaliger Abfluss in Y1 berücksichtigt (nicht in der Annuität).</p>
    </Card>
  );
}

/* ---------------- Logik/Calcs ---------------- */

function computeZonesY1(zonen:Zone[], rentAdjPct:number){
  let totalGross=0, totalEff=0, totalTI=0;
  const recoveredOpexFromZones:( (opexPct:number)=>number ) = (opexPct:number)=>{
    return zonen.reduce((s,z)=>{
      const grossY1 = z.areaM2 * z.rentPerM2*(1+rentAdjPct) * 12 * (1 - Math.min(z.freeRentMonthsY1,12)/12);
      return s + grossY1 * opexPct * clamp01(z.recoverablePct);
    }, 0);
  };
  for (const z of zonen){
    const grossY1 = z.areaM2 * z.rentPerM2*(1+rentAdjPct) * 12 * (1 - Math.min(z.freeRentMonthsY1,12)/12);
    const effY1   = grossY1 * (1 - clamp01(z.vacancyPct));
    const ti      = z.areaM2 * Math.max(0, z.tiPerM2);
    totalGross += grossY1;
    totalEff   += effY1;
    totalTI    += ti;
  }
  return { totalGross, totalEff, totalTI, recoveredOpex: recoveredOpexFromZones };
}

function annuityExact(loan:number, r:number, years:number){
  if (loan<=0 || r<=0 || years<=0) return 0;
  const n = Math.round(years);
  const ann = loan * (r) / (1 - Math.pow(1+r, -n));
  return ann;
}

function buildAmortizationExact(loan:number, r:number, years:number, on:boolean, annuityFn:(L:number,r:number,n:number)=>number){
  const rows: {year:number; interest:number; principal:number; annuity:number; outstanding:number;}[] = [];
  if (!on || loan<=0 || r<=0 || years<=0) return { rows, sum10:{interest:0, principal:0, annuity:0} };
  let outstanding = loan;
  const n = Math.round(years);
  const ann = annuityFn(loan, r, n);
  for (let y=1; y<=n; y++){
    const interest = outstanding * r;
    const principal = Math.min(ann - interest, outstanding);
    outstanding = Math.max(0, outstanding - principal);
    rows.push({ year:y, interest, principal, annuity:ann, outstanding });
    if (outstanding <= 1) break;
  }
  const sum10 = rows.slice(0,10).reduce((a,r)=>({ interest:a.interest+r.interest, principal:a.principal+r.principal, annuity:a.annuity+r.annuity }), {interest:0, principal:0, annuity:0});
  return { rows, sum10 };
}

function buildProjection10y(opts:{
  years:number;
  zones:Zone[]; rentAdjPct:number;
  opexPct:number; capexPct:number;
  rentGrowthPct:number; costGrowthPct:number;
  loan:number; zinsPct:number; yearsLoan:number; financingOn:boolean;
  annuityExactFn:(L:number,r:number,n:number)=>number;
}){
  const { years, zones, rentAdjPct, opexPct, capexPct, rentGrowthPct, costGrowthPct, loan, zinsPct, yearsLoan, financingOn, annuityExactFn } = opts;
  const data: {year:number; cashflowPA:number; tilgungPA:number;}[] = [];
  let outstanding = financingOn ? loan : 0;
  const n = Math.round(yearsLoan);
  const ann = financingOn ? annuityExactFn(loan, zinsPct, n) : 0;

  for (let t=1; t<=years; t++){
    let gross=0, eff=0, recovered=0, ti=0;
    for (const z of zones){
      const freeFactorY1 = (t===1) ? (1 - Math.min(z.freeRentMonthsY1,12)/12) : 1;
      const grossZ0 = z.areaM2 * z.rentPerM2*(1+rentAdjPct) * 12 * freeFactorY1;
      const grossZt = grossZ0 * Math.pow(1+rentGrowthPct, t-1);
      const effZt   = grossZt * (1 - clamp01(z.vacancyPct));
      gross += grossZt; eff += effZt;
      recovered += grossZt * opexPct * clamp01(z.recoverablePct);
      if (t===1) ti += z.areaM2 * Math.max(0, z.tiPerM2);
    }
    const opexT  = gross * (opexPct * Math.pow(1+costGrowthPct, t-1));
    const capexT = gross * (capexPct * Math.pow(1+costGrowthPct, t-1));
    const landlordOpexT = Math.max(0, opexT - recovered);
    const noiT = eff - landlordOpexT - capexT;

    const interest = financingOn ? outstanding * zinsPct : 0;
    const principal = financingOn ? Math.min(ann - interest, Math.max(0, outstanding)) : 0;
    outstanding = Math.max(0, outstanding - principal);

    const cf = noiT - (financingOn ? ann : 0) - (t===1 ? ti : 0);
    data.push({ year: t, cashflowPA: Math.round(cf), tilgungPA: Math.round(principal) });
  }
  return data;
}

function calcCapSpread(walt:number, bonitaet:Bonitaet, indexiert:boolean){
  const spreadWALT = walt < 3 ? 0.006 : walt < 5 ? 0.003 : walt < 8 ? 0.000 : -0.002;
  const spreadBon  = bonitaet === "A" ? -0.002 : bonitaet === "B" ?  0.000 :  0.004;
  const spreadIdx  = indexiert ? -0.001 : 0;
  return clampRange(spreadWALT + spreadBon + spreadIdx, -0.004, 0.012);
}

/* ---------------- Utils ---------------- */

function eur(n:number){ return Number.isFinite(n) ? n.toLocaleString("de-DE", { style:"currency", currency:"EUR", maximumFractionDigits:0 }) : "–"; }
function pct(x:number){ return Number.isFinite(x) ? (x*100).toFixed(1)+" %" : "–"; }
function signedPct(x:number){ const v=(x*100).toFixed(1); return (x>0?"+":"")+v+" %"; }
function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }
function clampMin(x:number, m:number){ return x < m ? m : x; }
function clampRange(x:number, a:number, b:number){ return Math.max(a, Math.min(b, x)); }
function scale(x:number, a:number, b:number){ if (b===a) return 0; return clamp01((x-a)/(b-a)); }
function num(x:any, fb:number){ const v=Number(x); return Number.isFinite(v)?v:fb; }
function uid(){ return Math.random().toString(36).slice(2,9); }
function avgWeighted(items:{w:number; v:number}[]){ const W=items.reduce((s,i)=>s+i.w,0); if(W<=0) return 0; return items.reduce((s,i)=>s+i.v*i.w,0)/W; }

function SliderRow({ label, value, min, max, step, right, onChange }: { label: string; value: number; min: number; max: number; step: number; right?: string; onChange: (v:number)=>void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>{right && <span>{right}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
