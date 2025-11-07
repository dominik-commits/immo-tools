// src/routes/MFHCheck.tsx
// Mehrfamilienhaus-Check – v3.2 (UX-Polish + Bundesland-Defaults)
// Ergänzungen ggü. v3.0:
// - UI-Polish: klarere Eingabe-Hervorhebung, besseres Spacing, Fokus-Ring, Sticky-Header-Controls
// - Bundesland-Voreinstellungen: setzt GrESt/Notar/Grundbuch/Makler mit Override-Option
// - Spielplatz bleibt sichtbar (Desk/ mobil), Modus-Persistenz
// - Kleine Copy-/Label-Verbesserungen

import React, { useEffect, useMemo, useState } from "react";
import {
  Home as HomeIcon,
  RefreshCw,
  Upload,
  Download,
  Info,
  Settings2,
  Wand2,
  ChevronDown,
  Gauge,
  TrendingUp,
  Banknote,
  Plus,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import PlanGuard from "@/components/PlanGuard";

// ====== Platzhalter: hole Plan-Status aus deinem User-Context/Hook ======
function useUserPlan() {
  return { plan: "pro" as "basis" | "pro" };
}

/* ---------------- Types ---------------- */
type ViewMode = "einfach" | "erweitert";
type Unit = { id: string; name: string; areaM2: number; rentPerM2: number };

/* ---------------- Theme ---------------- */
const BRAND = "#1b2c47";
const CTA = "#ffde59";
const ORANGE = "#ff914d";
const SURFACE = "#F7F7FA";

/* ---------------- Bundesland-Defaults ---------------- */
// Hinweis: Werte sind branchenübliche Näherungen und frei überschreibbar.
// GrESt in %; Notar/Grundbuch/Makler als typische Spannen (Mitte gewählt)
const LAND_PRESETS: Record<string, { grest: number; notar: number; grundbuch: number; makler: number }> = {
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
    <div className="text-sm text-foreground flex items-center gap-1">
      <span>{label}</span>
      {help && (
        <span title={help}>
          <Info className="h-4 w-4 text-gray-400" />
        </span>
      )}
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
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>;
}
function InputCard({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 bg-amber-50/50">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
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
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
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
          className="w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
          type="number"
          step={step}
          value={((value ?? 0) * 100).toFixed(2)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}

function ExportDropdown({ onRun }: { onRun: (opts: { json: boolean; csv: boolean; pdf: boolean }) => void }) {
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
          <div className="text-xs font-medium text-gray-500 mb-2">Formate wählen</div>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={json} onChange={(e) => setJson(e.target.checked)} /> JSON
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={csv} onChange={(e) => setCsv(e.target.checked)} /> CSV
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={pdf} onChange={(e) => setPdf(e.target.checked)} /> PDF
          </label>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-[#0F2C8A] text-white hover:brightness-110" onClick={run}>
              Export starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MFHCheck() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  // Modus-Schalter (global) – Persistenz
  const MODE_KEY = "mfh.mode.v3";
  const [mode, setMode] = useState<ViewMode>(() => {
    const raw = localStorage.getItem(MODE_KEY);
    return raw === "erweitert" || raw === "einfach" ? (raw as ViewMode) : "einfach";
  });
  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
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

  // Kaufpreis & NK
  const [kaufpreis, setKaufpreis] = useState(650_000);
  const [bundesland, setBundesland] = useState<string>("Berlin");
  const [nkGrEStPct, setNkGrEStPct] = useState(LAND_PRESETS["Berlin"].grest);
  const [nkNotarPct, setNkNotarPct] = useState(LAND_PRESETS["Berlin"].notar);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(LAND_PRESETS["Berlin"].grundbuch);
  const [nkMaklerPct, setNkMaklerPct] = useState(LAND_PRESETS["Berlin"].makler);
  const [nkSonstPct, setNkSonstPct] = useState(0.004);
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // Finanzierung inkl. EK
  const [eigenkapital, setEigenkapital] = useState(150_000);
  const [manualLoan, setManualLoan] = useState(false);
  const [darlehenManual, setDarlehenManual] = useState(400_000);
  const [zins, setZins] = useState(0.035);
  const [tilgung, setTilgung] = useState(0.02);

  // Spielplatz
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  // NK-Preset anwenden, aber manuelle Overrides respektieren
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
      const avgRentPerM2 = gesamtFlaecheM2 > 0 ? kaltmieteJahr / (gesamtFlaecheM2 * 12) : 0;
      return { area: gesamtFlaecheM2, grossRentYear: kaltmieteJahr, avgRentPerM2 };
    } else {
      const area = units.reduce((s, u) => s + num(u.areaM2, 0), 0);
      const grossRentYear = units.reduce((s, u) => s + num(u.areaM2, 0) * num(u.rentPerM2, 0) * 12, 0);
      const avgRentPerM2 = area > 0 ? grossRentYear / (area * 12) : 0;
      return { area, grossRentYear, avgRentPerM2 };
    }
  }, [mgmtMode, gesamtFlaecheM2, kaltmieteJahr, units]);

  // Preis-Anpassung + All-in
  const kaufpreisAdj = Math.round(kaufpreis * (1 + priceAdjPct));
  const kaufpreisView = applyAdjustments ? kaufpreisAdj : kaufpreis;
  const nkSum = Math.round(kaufpreisView * nkPct);
  const allIn = kaufpreisView + nkSum;

  // Miete-Anpassung + Leerstand
  const grossRentAdj = totals.grossRentYear * (1 + (applyAdjustments ? rentAdjPct : 0));
  const effRentYear = grossRentAdj * (1 - clamp01(leerstandPct));

  // Opex/CapEx
  const [capexRuecklagePctBrutto, setCapexRuecklagePctBrutto] = useState(0.03);
  const capexRuecklage = grossRentAdj * capexRuecklagePctBrutto;
  const noi = Math.max(0, effRentYear - nichtUmlagefaehigeKosten - capexRuecklage);

  // Darlehen (aus EK oder manuell)
  const loan = Math.max(0, manualLoan ? darlehenManual : kaufpreisView - Math.max(0, eigenkapital));
  const annuitaetJahr = loan * (zins + tilgung);
  const annuitaetMonat = annuitaetJahr / 12;
  const zinsMonat = (loan * zins) / 12;
  const tilgungMonat = (loan * tilgung) / 12;

  // KPIs & Score
  const noiYield = kaufpreisView > 0 ? noi / kaufpreisView : 0;
  const dscr = annuitaetJahr > 0 ? noi / annuitaetJahr : 0;
  const score = clamp01(scale(noiYield, 0.035, 0.07) * 0.55 + scale(dscr, 1.1, 1.6) * 0.45);
  const scoreLabel: "BUY" | "CHECK" | "NO" = score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";
  const scorePct = Math.round(score * 100);
  const scoreColor = score >= 0.7 ? "#16a34a" : score >= 0.5 ? "#f59e0b" : "#ef4444";

  // Monatsrechnung (Y1)
  const monthlyEffRent = effRentYear / 12;
  const monthlyOpex = nichtUmlagefaehigeKosten / 12;
  const monthlyCapex = capexRuecklage / 12;
  const monthlyCF = monthlyEffRent - monthlyOpex - monthlyCapex - annuitaetMonat;

  // Projektion (10 Jahre)
  const [mietSteigerung, setMietSteigerung] = useState(0.01);
  const [kostenSteigerung, setKostenSteigerung] = useState(0.015);
  const projection = useMemo(
    () =>
      buildProjection10y({
        years: 10,
        effRentY1: effRentYear,
        nichtUmlagefaehige0: nichtUmlagefaehigeKosten,
        capexPct0: capexRuecklagePctBrutto,
        rentGrowth: mietSteigerung,
        costGrowth: kostenSteigerung,
        annuitaetJahr,
      }),
    [effRentYear, nichtUmlagefaehigeKosten, capexRuecklagePctBrutto, mietSteigerung, kostenSteigerung, annuitaetJahr]
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

  /* ===== Aktionen ===== */
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

  function runExport(opts: { json: boolean; csv: boolean; pdf: boolean }) {
    if (opts.json) {
      const payload = {
        generatedAt: new Date().toISOString(),
        input: {
          mode,
          mgmtMode,
          units,
          gesamtFlaecheM2,
          kaltmieteJahr,
          nichtUmlagefaehigeKosten,
          leerstandPct,
          kaufpreis,
          bundesland,
          nkGrEStPct,
          nkNotarPct,
          nkGrundbuchPct,
          nkMaklerPct,
          nkSonstPct,
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
        },
        derived: {
          totals,
          kaufpreisView,
          nkSum,
          allIn,
          effRentYear,
          capexRuecklage,
          loan,
          annuitaetJahr,
          annuitaetMonat,
          noi,
          noiYield,
          dscr,
          monthlyEffRent,
          monthlyOpex,
          monthlyCapex,
          monthlyCF,
          bePrice,
          beRentPerM2,
        },
      };
      downloadBlob(`mfh_export_${ts()}.json`, "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
    }
    if (opts.csv) {
      const rows = [
        ["Feld", "Wert"],
        ["Modus", mode],
        ["Flächenmodus", mgmtMode],
        ["Bundesland", bundesland],
        ["Fläche gesamt (m²)", totals.area.toLocaleString("de-DE")],
        ["⌀ Miete €/m²", totals.avgRentPerM2.toFixed(2)],
        ["Kaltmiete (Jahr)", eur(totals.grossRentYear)],
        ["Leerstand", pct(leerstandPct)],
        ["Effektive Miete (Jahr)", eur(Math.round(effRentYear))],
        ["Nicht umlagefähige Kosten (Jahr)", eur(nichtUmlagefaehigeKosten)],
        ["CapEx-Rücklage (%)", pct(capexRuecklagePctBrutto)],
        ["CapEx-Rücklage (Jahr)", eur(Math.round(capexRuecklage))],
        ["Kaufpreis (bewertet)", eur(kaufpreisView)],
        ["NK gesamt (%)", pct(nkPct)],
        ["NK Summe", eur(nkSum)],
        ["All-in", eur(allIn)],
        ["Eigenkapital", eur(eigenkapital)],
        ["Darlehen", eur(loan)],
        ["Zins p.a.", pct(zins)],
        ["Tilgung p.a.", pct(tilgung)],
        ["Annuität p.a.", eur(Math.round(annuitaetJahr))],
        ["Annuität mtl.", eur(Math.round(annuitaetMonat))],
        ["NOI p.a.", eur(Math.round(noi))],
        ["NOI-Yield", pct(noiYield)],
        ["DSCR", dscr.toFixed(2)],
        ["Cashflow mtl.", eur(Math.round(monthlyCF))],
        ["Break-even Preis", bePrice ? eur(bePrice) : "–"],
        ["Break-even Miete €/m²", beRentPerM2 ? beRentPerM2.toFixed(2) + " €/m²" : "–"],
      ];
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
        .join("\n");
      const csvWithBom = "\uFEFF" + csv;
      downloadBlob(`mfh_export_${ts()}.csv`, "text/csv;charset=utf-8", csvWithBom);
    }
    if (opts.pdf) {
      const html = `
<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>MFH – Export</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica Neue,Arial,Noto Sans;margin:24px;color:#111} h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:16px 0 8px} table{width:100%;border-collapse:collapse} th,td{padding:6px 8px} th{text-align:left} tr+tr td{border-top:1px solid #eee} .right{text-align:right} .meta{color:#555;font-size:12px;margin-bottom:12px}</style>
</head><body>
<h1>Mehrfamilienhaus – Export</h1>
<div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>
<h2>Eingaben</h2>
<table>
  <tr><th>Modus</th><td class="right">${mode}</td></tr>
  <tr><th>Bundesland</th><td class="right">${bundesland}</td></tr>
  <tr><th>Fläche gesamt</th><td class="right">${totals.area.toLocaleString("de-DE")} m²</td></tr>
  <tr><th>⌀ Miete €/m²</th><td class="right">${totals.avgRentPerM2.toFixed(2)}</td></tr>
  <tr><th>Kaltmiete (Jahr)</th><td class="right">${eur(totals.grossRentYear)}</td></tr>
  <tr><th>Leerstand</th><td class="right">${pct(leerstandPct)}</td></tr>
  <tr><th>Nicht umlagefähige Kosten</th><td class="right">${eur(nichtUmlagefaehigeKosten)}</td></tr>
  <tr><th>CapEx-Rücklage</th><td class="right">${pct(capexRuecklagePctBrutto)}</td></tr>
  <tr><th>Kaufpreis</th><td class="right">${eur(kaufpreisView)}</td></tr>
  <tr><th>Kaufnebenkosten</th><td class="right">${pct(nkPct)} (${eur(nkSum)})</td></tr>
  <tr><th>All-in</th><td class="right">${eur(allIn)}</td></tr>
  <tr><th>Eigenkapital</th><td class="right">${eur(eigenkapital)}</td></tr>
  <tr><th>Darlehen</th><td class="right">${eur(loan)}</td></tr>
  <tr><th>Zins / Tilgung</th><td class="right">${pct(zins)} / ${pct(tilgung)}</td></tr>
</table>
<h2>Ergebnis (Y1)</h2>
<table>
  <tr><th>Annuität (Jahr / Monat)</th><td class="right">${eur(Math.round(annuitaetJahr))} / ${eur(Math.round(annuitaetMonat))}</td></tr>
  <tr><th>NOI p.a.</th><td class="right">${eur(Math.round(noi))}</td></tr>
  <tr><th>NOI-Yield</th><td class="right">${pct(noiYield)}</td></tr>
  <tr><th>DSCR</th><td class="right">${dscr.toFixed(2)}</td></tr>
  <tr><th>Cashflow mtl.</th><td class="right">${eur(Math.round(monthlyCF))}</td></tr>
  <tr><th>Break-even Preis</th><td class="right">${bePrice ? eur(bePrice) : "–"}</td></tr>
  <tr><th>Break-even Miete €/m²</th><td class="right">${beRentPerM2 ? beRentPerM2.toFixed(2) : "–"}</td></tr>
</table>
<script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
</body></html>`.trim();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
      }
    }
  }

  return (
    <div className="min-h-screen" style={{ background: SURFACE }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shadow"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${ORANGE})`, color: "#fff" }}
            >
              <HomeIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Mehrfamilienhaus-Check</h1>
              <p className="text-muted-foreground text-sm">Portfolio-tauglich · Live-Score · Break-even · Projektion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 rounded-lg border text-xs" style={{ background: "#fff", color: scoreColor }}>
              Score: <b>{scorePct}%</b> ({scoreLabel})
            </div>
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={resetBeispiel}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>
            <ExportDropdown onRun={runExport} />
            <label className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input type="file" className="hidden" accept="application/json" onChange={(e) => { /* optional: implementieren */ }} />
            </label>
          </div>
        </div>

        {/* Sticky Controls (Mode + Spielplatz) */}
        <div className="sticky top-0 z-10 py-2 -mt-2" style={{ background: SURFACE }}>
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl border p-1 bg-white text-sm" title="Modus wählen">
              <button
                className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${mode === "einfach" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setMode("einfach")}
              >
                <Wand2 className="h-4 w-4" /> Einfach
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${mode === "erweitert" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setMode("erweitert")}
              >
                <Settings2 className="h-4 w-4" /> Erweitert
              </button>
            </div>

            {/* Spielplatz kurz-rechts */}
            <div className="hidden md:flex items-center gap-4 bg-white border rounded-xl px-3 py-2">
              <div className="text-xs text-muted-foreground">Spielplatz</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Preis</span>
                <input
                  aria-label="Preis-Anpassung"
                  type="range"
                  min={-0.3}
                  max={0.3}
                  step={0.005}
                  value={priceAdjPct}
                  onChange={(e) => setPriceAdjPct(Number(e.target.value))}
                />
                <span className="text-xs tabular-nums">{signedPct(priceAdjPct)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Miete</span>
                <input
                  aria-label="Miet-Anpassung"
                  type="range"
                  min={-0.3}
                  max={0.5}
                  step={0.005}
                  value={rentAdjPct}
                  onChange={(e) => setRentAdjPct(Number(e.target.value))}
                />
                <span className="text-xs tabular-nums">{signedPct(rentAdjPct)}</span>
              </div>
              <label className="text-xs inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyAdjustments}
                  onChange={(e) => setApplyAdjustments(e.target.checked)}
                />{" "}
                anwenden
              </label>
            </div>
          </div>
        </div>

        {/* 2-Spalten-Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MAIN (Inputs + Outputs) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Eingabemaske */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Eingaben</h2>

              {/* Flächenmanagement */}
              <InputCard title="Flächenmanagement & Einnahmen" subtitle="Gesamtwerte ODER auf Einheitenebene erfassen (summiert)">
                <div className="flex items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={mgmtMode === "gesamt"} onChange={() => setMgmtMode("gesamt")} /> Gesamtdaten
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={mgmtMode === "einheiten"} onChange={() => setMgmtMode("einheiten")} /> Einheiten
                  </label>
                </div>

                {mgmtMode === "gesamt" ? (
                  <>
                    <NumberField label="Gesamtfläche (m²)" value={gesamtFlaecheM2} onChange={setGesamtFlaecheM2} />
                    <NumberField label="Gesamtkaltmiete p.a. (€)" value={kaltmieteJahr} onChange={setKaltmieteJahr} step={500} />
                    <div className="text-xs text-muted-foreground">
                      ⌀ Miete: <b>{totals.avgRentPerM2.toFixed(2)} €/m²</b>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    {units.map((u, idx) => (
                      <div key={u.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <LabelWithHelp label="Einheit" />
                          <input
                            className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
                            value={u.name}
                            onChange={(e) => updateUnit(u.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="col-span-3">
                          <LabelWithHelp label="Fläche (m²)" />
                          <input
                            type="number"
                            className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
                            value={u.areaM2}
                            onChange={(e) => updateUnit(u.id, { areaM2: num(e.target.value, u.areaM2) })}
                          />
                        </div>
                        <div className="col-span-3">
                          <LabelWithHelp label="Miete (€/m²/Monat)" />
                          <input
                            type="number"
                            step={0.1}
                            className="mt-1 w-full border rounded-lg p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
                            value={u.rentPerM2}
                            onChange={(e) => updateUnit(u.id, { rentPerM2: num(e.target.value, u.rentPerM2) })}
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            className="mb-1 inline-flex items-center justify-center h-9 px-3 rounded-lg border hover:bg-red-50"
                            onClick={() => removeUnit(u.id)}
                            title="Zeile löschen"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                        <div className="col-span-12 text-xs text-muted-foreground -mt-1">
                          Kaltmiete p.a.: <b>{eur(Math.round(u.areaM2 * u.rentPerM2 * 12))}</b>
                        </div>
                        {idx < units.length - 1 && <div className="col-span-12 border-b" />}
                      </div>
                    ))}
                    <button
                      className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-card hover:shadow"
                      onClick={() =>
                        setUnits((prev) => [
                          ...prev,
                          { id: uid(), name: `WE ${prev.length + 1}`, areaM2: 50, rentPerM2: 9 },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" /> Einheit hinzufügen
                    </button>
                    <div className="text-xs text-muted-foreground">
                      Summe Fläche: <b>{totals.area.toLocaleString("de-DE")} m²</b> · Summe Miete p.a.:{" "}
                      <b>{eur(Math.round(totals.grossRentYear))}</b> · ⌀: <b>{totals.avgRentPerM2.toFixed(2)} €/m²</b>
                    </div>
                  </div>
                )}

                <PercentField
                  label="Leerstand (Quote)"
                  value={leerstandPct}
                  onChange={setLeerstandPct}
                  help="Mietausfall/Fluktuation – wirkt auf Effektivmiete"
                />

                <NumberField
                  label="Nicht umlagefähige Kosten p.a. (€)"
                  value={nichtUmlagefaehigeKosten}
                  onChange={setNichtUmlagefaehigeKosten}
                  step={100}
                  help="HV, Instandhaltung, Rücklagen etc."
                />
                <PercentField
                  label="CapEx-Rücklage (% der Bruttomiete)"
                  value={capexRuecklagePctBrutto}
                  onChange={setCapexRuecklagePctBrutto}
                  step={0.005}
                />
              </InputCard>

              {/* Kaufpreis & NK */}
              <InputCard title="Kaufpreis & Nebenkosten" subtitle="Bundesland wählen (Voreinstellungen) – Werte sind frei überschreibbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                  <div>
                    <LabelWithHelp
                      label="Bundesland (Preset)"
                      help="Setzt typische Prozentsätze – alle Felder unten bleiben editierbar."
                    />
                    <select
                      className="mt-1 w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
                      value={bundesland}
                      onChange={(e) => applyLandPreset(e.target.value)}
                    >
                      {LAND_LIST.map((l) => (
                        <option key={l} value={l}>
                          {l.replace("_", "-")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                  <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                  <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                  <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
                  <PercentField label="Sonstiges/Puffer" value={nkSonstPct} onChange={setNkSonstPct} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Summe NK: <b>{pct(nkPct)}</b> = <b>{eur(nkSum)}</b> · All-in: <b>{eur(allIn)}</b>
                </div>

                {/* Spielplatz (mobil sichtbar) */}
                <div className="md:hidden mt-3 rounded-xl border p-3 bg-white">
                  <div className="text-xs font-medium mb-2">Spielplatz</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Preis</span>
                      <span>{signedPct(priceAdjPct)}</span>
                    </div>
                    <input
                      type="range"
                      min={-0.3}
                      max={0.3}
                      step={0.005}
                      value={priceAdjPct}
                      onChange={(e) => setPriceAdjPct(Number(e.target.value))}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Miete</span>
                      <span>{signedPct(rentAdjPct)}</span>
                    </div>
                    <input
                      type="range"
                      min={-0.3}
                      max={0.5}
                      step={0.005}
                      value={rentAdjPct}
                      onChange={(e) => setRentAdjPct(Number(e.target.value))}
                    />
                    <label className="text-xs inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={applyAdjustments}
                        onChange={(e) => setApplyAdjustments(e.target.checked)}
                      />{" "}
                      in Bewertung verwenden
                    </label>
                  </div>
                </div>
              </InputCard>

              {/* Finanzierung */}
              <InputCard title="Finanzierung" subtitle="Eigenkapital + Darlehen · konstante Annuität aus Zins & Tilgung">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberField label="Eigenkapital (€)" value={eigenkapital} onChange={setEigenkapital} step={1000} />
                  <label className="text-xs inline-flex items-center gap-2 mt-6">
                    <input type="checkbox" checked={manualLoan} onChange={(e) => setManualLoan(e.target.checked)} /> Darlehen
                    manuell setzen
                  </label>
                  {manualLoan && (
                    <NumberField label="Darlehen (manuell, €)" value={darlehenManual} onChange={setDarlehenManual} step={1000} />
                  )}
                  <PercentField label="Zins p.a." value={zins} onChange={setZins} step={0.01} />
                  <PercentField label="Tilgung p.a." value={tilgung} onChange={setTilgung} step={0.01} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Darlehen aktuell: <b>{eur(loan)}</b> · Annuität p.a.: <b>{eur(Math.round(annuitaetJahr))}</b> · mtl.:{" "}
                  <b>{eur(Math.round(annuitaetMonat))}</b>
                </div>
              </InputCard>

              {/* Erweitert */}
              {mode === "erweitert" && (
                <InputCard title="Erweitert" subtitle="Wachstumsannahmen für Projektion">
                  <PercentField label="Mietsteigerung p.a." value={mietSteigerung} onChange={setMietSteigerung} step={0.005} />
                  <PercentField label="Kostensteigerung p.a." value={kostenSteigerung} onChange={setKostenSteigerung} step={0.005} />
                </InputCard>
              )}
            </section>

            {/* Auswertung */}
            <section className="space-y-6">
              <div className="text-sm text-foreground font-medium">Auswertung</div>

              {/* KPI-Board */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <KPI icon={<Gauge className="h-4 w-4" />} label="NOI-Yield" value={pct(noiYield)} hint="NOI / Kaufpreis (bewertet)" />
                  <KPI icon={<TrendingUp className="h-4 w-4" />} label="DSCR" value={annuitaetJahr > 0 ? dscr.toFixed(2) : "–"} hint="NOI / Annuität" />
                  <KPI icon={<Banknote className="h-4 w-4" />} label="Annuität mtl." value={eur(Math.round(annuitaetMonat))} hint="Zins + Tilgung" />
                  <KPI icon={<Banknote className="h-4 w-4" />} label="All-in" value={eur(allIn)} hint="Kaufpreis + NK" />
                </div>
              </Card>

              {/* Break-even Balken */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">Break-even (NOI vs. Annuität)</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[{ name: "Y1", NOI: Math.round(noi), Annuitaet: Math.round(annuitaetJahr) }]}
                      margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="gradNOI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CTA} />
                          <stop offset="100%" stopColor={ORANGE} />
                        </linearGradient>
                        <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={BRAND} />
                          <stop offset="100%" stopColor="#2a446e" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RTooltip formatter={(v: any) => eur(v)} />
                      <Legend />
                      <Bar dataKey="NOI" fill="url(#gradNOI)" radius={[10, 10, 0, 0]}>
                        <LabelList dataKey="NOI" position="top" formatter={(v: any) => eur(v)} />
                      </Bar>
                      <Bar dataKey="Annuitaet" fill="url(#gradA)" radius={[10, 10, 0, 0]}>
                        <LabelList dataKey="Annuitaet" position="top" formatter={(v: any) => eur(v)} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Break-even Preis: <b>{bePrice ? eur(bePrice) : "–"}</b> · Erforderliche ⌀-Miete:{" "}
                  <b>{beRentPerM2 ? beRentPerM2.toFixed(2) + " €/m²" : "–"}</b>
                </div>
              </Card>

              {/* Projektion */}
              <Card>
                <div className="text-sm font-medium mb-1 text-foreground">Projektion (10 Jahre)</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projection} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <RTooltip formatter={(v: any) => eur(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="noi" name="NOI p.a." stroke={BRAND} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cf" name="Cashflow p.a." stroke={CTA} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Effektive Miete steigt (Leerstand konstant); Annuität bleibt fix (vereinfachtes Modell).
                </p>
              </Card>

              {/* Monatsrechnung */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">Monatsrechnung (Jahr 1)</div>
                <ul className="text-sm text-foreground space-y-1">
                  <li>
                    Eff. Nettokaltmiete mtl.: <b>{eur(Math.round(monthlyEffRent))}</b>
                  </li>
                  <li>
                    Nicht umlagefähige Kosten mtl.: <b>{eur(Math.round(monthlyOpex))}</b>
                  </li>
                  <li>
                    CapEx-Rücklage mtl.: <b>{eur(Math.round(monthlyCapex))}</b>
                  </li>
                  <li>
                    Zinsen mtl.: <b>{eur(Math.round(zinsMonat))}</b>
                  </li>
                  <li>
                    Tilgung mtl.: <b>{eur(Math.round(tilgungMonat))}</b>
                  </li>
                  <li>
                    = Cashflow mtl.: <b>{eur(Math.round(monthlyCF))}</b>
                  </li>
                </ul>
              </Card>

              {/* NK-Detail */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">Kaufnebenkosten im Detail</div>
                <ul className="text-sm text-foreground space-y-1">
                  <li>
                    Grunderwerbsteuer ({bundesland}): {pct(nkGrEStPct)} = {eur(Math.round(kaufpreisView * nkGrEStPct))}
                  </li>
                  <li>
                    Notar: {pct(nkNotarPct)} = {eur(Math.round(kaufpreisView * nkNotarPct))}
                  </li>
                  <li>
                    Grundbuch: {pct(nkGrundbuchPct)} = {eur(Math.round(kaufpreisView * nkGrundbuchPct))}
                  </li>
                  <li>
                    Makler: {pct(nkMaklerPct)} = {eur(Math.round(kaufpreisView * nkMaklerPct))}
                  </li>
                  {nkSonstPct > 0 && (
                    <li>
                      Sonstiges/Puffer: {pct(nkSonstPct)} = {eur(Math.round(kaufpreisView * nkSonstPct))}
                    </li>
                  )}
                  <li className="mt-2">
                    <b>Summe NK</b>: {pct(nkPct)} = <b>{eur(nkSum)}</b>
                  </li>
                  <li>
                    All-in = Kaufpreis + NK = <b>{eur(allIn)}</b>
                  </li>
                </ul>
              </Card>

              {/* Tilgungsplan */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">Tilgungsplan (Annuität, Jahre 1–10)</div>
                {amort.rows.length ? (
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
                        {amort.rows.slice(0, 10).map((r) => (
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
                          <td className="py-2 pr-4 font-medium tabular-nums">{eur(Math.round(amort.sum10.interest))}</td>
                          <td className="py-2 pr-4 font-medium tabular-nums">{eur(Math.round(amort.sum10.principal))}</td>
                          <td className="py-2 pr-4 font-medium tabular-nums">{eur(Math.round(amort.sum10.annuity))}</td>
                          <td className="py-2 pr-4" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Kein Tilgungsplan verfügbar (prüfe Darlehen/Zins).</p>
                )}
              </Card>
            </section>
          </div>

          {/* GLOSSAR */}
          <aside className="xl:col-span-1">
            <div className="xl:sticky xl:top-6 space-y-4">
              <Card>
                <div className="text-sm font-semibold mb-2">Glossar</div>
                <GlossaryItem term="NOI" def="Net Operating Income = Eff. Kaltmiete – nicht umlagefähige Kosten – CapEx-Rücklage." />
                <GlossaryItem term="Leerstand" def="Quote der nicht vermieteten / nicht zahlenden Fläche. Wirkt auf Eff. Miete." />
                <GlossaryItem term="Annuität" def="Jährliche Rate aus Zins + Tilgung auf die Darlehenshöhe (konstant)." />
                <GlossaryItem term="DSCR" def="Debt Service Coverage Ratio = NOI / Annuität. >1,2 ist häufig Zielgröße." />
                <GlossaryItem term="NOI-Yield" def="NOI / Kaufpreis – schnelle Renditekennzahl (vor Finanzierung)." />
                <GlossaryItem term="Break-even" def="Punkt, an dem NOI die Annuität deckt (CF ≥ 0)." />
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

  // ===== Helpers: Units =====
  function updateUnit(id: string, patch: Partial<Unit>) {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }
  function removeUnit(id: string) {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }
}

/* ---------------- Widgets ---------------- */
function KPI({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border p-3 bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold mt-1 tabular-nums text-foreground">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div className="py-2 border-b last:border-0">
      <div className="text-sm font-medium text-foreground">{term}</div>
      <div className="text-xs text-muted-foreground">{def}</div>
    </div>
  );
}

/* ---------------- Logik/Calcs ---------------- */
function buildProjection10y(opts: {
  years: number;
  effRentY1: number;
  nichtUmlagefaehige0: number;
  capexPct0: number;
  rentGrowth: number;
  costGrowth: number;
  annuitaetJahr: number;
}) {
  const { years, effRentY1, nichtUmlagefaehige0, capexPct0, rentGrowth, costGrowth, annuitaetJahr } = opts;
  const data: { year: number; noi: number; cf: number }[] = [];
  for (let t = 1; t <= years; t++) {
    const effRentT = effRentY1 * Math.pow(1 + rentGrowth, t - 1);
    const opexT = nichtUmlagefaehige0 * Math.pow(1 + costGrowth, t - 1);
    const capexT = effRentY1 * capexPct0 * Math.pow(1 + costGrowth, t - 1); // Näherung auf Brutto
    const noi = Math.max(0, effRentT - opexT - capexT);
    const cf = noi - annuitaetJahr;
    data.push({ year: t, noi: Math.round(noi), cf: Math.round(cf) });
  }
  return data;
}

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
  const rows: { year: number; interest: number; principal: number; annuity: number; outstanding: number }[] = [];
  if (darlehen <= 0 || zins <= 0 || annuitaetJahr <= 0) return { rows, sum10: { interest: 0, principal: 0, annuity: 0 } };
  let outstanding = darlehen;
  for (let y = 1; y <= maxYears; y++) {
    const interest = outstanding * zins;
    const principal = Math.min(Math.max(0, annuitaetJahr - interest), outstanding);
    outstanding = Math.max(0, outstanding - principal);
    rows.push({ year: y, interest, principal, annuity: annuitaetJahr, outstanding });
    if (outstanding <= 1) break;
  }
  const sum10 = rows.slice(0, 10).reduce(
    (a, r) => ({ interest: a.interest + r.interest, principal: a.principal + r.principal, annuity: a.annuity + r.annuity }),
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
  if (manualLoan) return null; // wenn Darlehen manuell, ergibt der Solver auf Preis-Basis wenig Sinn
  const target = 0; // CF=0
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
    else lo = mid; // suche Minimum das CF≥0 erfüllt
  }
  return Number(((lo + hi) / 2).toFixed(2));
}

/* ---------------- Utils ---------------- */
function eur(n: number) {
  return Number.isFinite(n) ? n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "–";
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
