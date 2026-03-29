// src/routes/Compare.tsx
// Propora Compare (PRO) – Deals nebeneinander (ETW / MFH / GEWERBE)

import React, { useMemo, useRef, useState } from "react";
import PlanGuard from "@/components/PlanGuard";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  ChevronDown,
  Gauge,
  Banknote,
  TrendingUp,
  LineChart as LineIcon,
  Scale,
  Stars,
  Info,
  Target,
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
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ============================== Theme ============================== */

const BRAND = "#1b2c47";
const CTA = "#ffde59";
const SURFACE = "#F7F7FA";

/* ============================================================
   TYPES & DATA MODEL
   ============================================================ */

type SzenarioTyp = "ETW" | "MFH" | "GEWERBE";

type Szenario = {
  id: string;
  name: string;
  typ: SzenarioTyp;
  color: string;

  kaufpreis: number;
  flaecheM2: number;
  mieteProM2Monat: number;
  leerstandPct: number; // 0..1
  opexPctBrutto: number; // 0..1

  financingOn: boolean;
  ltvPct: number; // 0..1
  zinsPct: number; // 0..1
  tilgungPct: number; // 0..1

  capRateAssumed: number; // 0..1
};

type ViewRow = {
  id: string;
  name: string;
  typ: SzenarioTyp;
  color: string;
  noiYear: number;
  noiYield: number;
  cashflowMonat: number;
  dscr: number | null;
  wertAusCap: number;
  valueGap: number;
  score: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
};

/* ============================ Utils ============================ */

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

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scale(x: number, a: number, b: number) {
  if (b === a) return 0;
  return clamp01((x - a) / (b - a));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function scoreLabelFrom(score: number): "BUY" | "CHECK" | "NO" {
  if (score >= 0.7) return "BUY";
  if (score >= 0.5) return "CHECK";
  return "NO";
}

function labelText(s: "BUY" | "CHECK" | "NO") {
  if (s === "BUY") return "Kaufen (unter Vorbehalt)";
  if (s === "CHECK") return "Weiter prüfen";
  return "Eher Nein";
}

/* -------- Export-Dropdown wie in Gewerbe-/Finanzierungs-Tools ------ */

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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-3 z-50"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ====================== Modell-Formeln (unchanged) ===================== */

function calcViewRow(s: Szenario): ViewRow {
  // Berechnungslogik unverändert zum alten Compare
  const grossRentYear = s.flaecheM2 * s.mieteProM2Monat * 12;
  const effRentYear = grossRentYear * (1 - clamp01(s.leerstandPct));
  const opexYear = grossRentYear * clamp01(s.opexPctBrutto);
  const noiYear = effRentYear - opexYear;

  const loan = s.financingOn ? s.kaufpreis * clamp01(s.ltvPct) : 0;
  const annuityYear = s.financingOn ? loan * (s.zinsPct + s.tilgungPct) : 0;
  const dscr = s.financingOn && annuityYear > 0 ? noiYear / annuityYear : null;
  const cashflowMonat = (noiYear - annuityYear) / 12;

  const cap = Math.max(0.0001, s.capRateAssumed);
  const wertAusCap = noiYear / cap;
  const valueGap = Math.round(wertAusCap - s.kaufpreis);
  const noiYield = s.kaufpreis > 0 ? noiYear / s.kaufpreis : 0;

  const partYield = scale(noiYield, 0.045, 0.09);
  const partDSCR = scale(dscr ?? 0, 1.2, 1.7);
  const partCF = scale(cashflowMonat, 0, 1200);
  const score = clamp01(partYield * 0.5 + partDSCR * 0.35 + partCF * 0.15);

  return {
    id: s.id,
    name: s.name,
    typ: s.typ,
    color: s.color,
    noiYear: Math.round(noiYear),
    noiYield,
    cashflowMonat: Math.round(cashflowMonat),
    dscr: dscr ? Number(dscr.toFixed(2)) : null,
    wertAusCap: Math.round(wertAusCap),
    valueGap,
    score,
    scoreLabel: scoreLabelFrom(score),
  };
}

/* ========================== Hauptkomponente ==================== */

export default function Compare() {
  return (
    <PlanGuard required="pro">
      <CompareInner />
    </PlanGuard>
  );
}

function CompareInner() {
  const [items, setItems] = useState<Szenario[]>(() => demoItems());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);

  // Für PDF-Export: Bereich referenzieren (alles zwischen Header und Sticky-Footer)
  const printRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => items.map(calcViewRow), [items]);

  const best = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.score - a.score)[0];
  }, [rows]);

  /* ----- Export / Import (LOGIK UNVERÄNDERT) ----- */

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vergleich-szenarien.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const arr = JSON.parse(String(r.result));
        if (!Array.isArray(arr)) throw new Error("Invalid");
        const norm = arr.map((x: any) => normalizeSzenario(x));
        setItems(norm.length ? norm : demoItems());
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  // CSV-Export (kompakter KPI-Vergleich)
  function exportCSV() {
    const header = [
      "Name",
      "Typ",
      "Kaufpreis",
      "Fläche_m2",
      "Miete_m2_monat",
      "Leerstand_%",
      "Opex_%_Brutto",
      "Finanzierung",
      "LTV_%",
      "Zins_%",
      "Tilgung_%",
      "CapRate_%",
      "NOI_Jahr",
      "NOI_Yield_%",
      "Cashflow_monat",
      "DSCR",
      "Wert_NOI/Cap",
      "ValueGap",
    ];
    const lines = [header.join(";")];

    for (const s of items) {
      const v = calcViewRow(s);
      lines.push(
        [
          safe(s.name),
          s.typ,
          num0(s.kaufpreis),
          num0(s.flaecheM2),
          numDec(s.mieteProM2Monat, 1),
          numDec(s.leerstandPct * 100, 1),
          numDec(s.opexPctBrutto * 100, 1),
          s.financingOn ? "Ja" : "Nein",
          numDec(s.ltvPct * 100, 1),
          numDec(s.zinsPct * 100, 2),
          numDec(s.tilgungPct * 100, 2),
          numDec(s.capRateAssumed * 100, 2),
          num0(v.noiYear),
          numDec(v.noiYield * 100, 2),
          num0(v.cashflowMonat),
          v.dscr ?? "",
          num0(v.wertAusCap),
          num0(v.valueGap),
        ].join(";")
      );
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vergleich.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // PDF-Export (mehrseitig, scharf)
  async function exportPDF() {
    if (!printRef.current) return;
    const node = printRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842

    const pageW = 595;
    const pageH = 842;
    const margin = 20;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, undefined, "FAST");
    } else {
      // Mehrseitig in Scheiben schneiden
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
        pdf.addImage(part, "PNG", margin, margin, imgW, partH, undefined, "FAST");

        srcY += sliceHeight;
      }
    }
    pdf.save("vergleich.pdf");
  }

  // Dropdown-Runner
  function runSelectedExports(opts: {
    json: boolean;
    csv: boolean;
    pdf: boolean;
  }) {
    if (opts.json) exportJson();
    if (opts.csv) exportCSV();
    if (opts.pdf) exportPDF();
  }

  /* ----- Szenarien-CRUD ----- */

  function addItem() {
    const n = items.length + 1;
    setItems((list) => [
      ...list,
      {
        id: uid(),
        name: `Szenario ${n}`,
        typ: "ETW",
        color: pickColor(n),
        kaufpreis: 350000,
        flaecheM2: 70,
        mieteProM2Monat: 12,
        leerstandPct: 0.05,
        opexPctBrutto: 0.25,
        financingOn: true,
        ltvPct: 0.8,
        zinsPct: 0.039,
        tilgungPct: 0.02,
        capRateAssumed: 0.055,
      },
    ]);
  }

  function cloneItem(id: string) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const c = {
      ...it,
      id: uid(),
      name: it.name + " (Kopie)",
      color: pickColor(items.length + 1),
    };
    setItems((list) => [...list, c]);
  }

  function deleteItem(id: string) {
    setItems((list) => list.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function patchItem(id: string, patch: Partial<Szenario>) {
    setItems((list) =>
      list.map((x) => (x.id === id ? { ...x, ...patch } : x))
    );
  }

  /* ----- Charts (Daten) ----- */

  const chartCashflow = rows.map((r) => ({
    name: r.name,
    CF: r.cashflowMonat,
  }));

  const chartValueVsPrice = rows.map((r) => {
    const base = items.find((x) => x.id === r.id)!;
    return {
      name: r.name,
      Preis: Math.round(base.kaufpreis),
      Wert: r.wertAusCap,
    };
  });

  /* ============================= Render ============================= */

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: SURFACE }}
    >
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shadow"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, ${CTA})`,
                color: "#fff",
              }}
            >
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Vergleichs-Rechner
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl">
                Vergleiche unterschiedliche Objekte nebeneinander: Cashflow,
                NOI-Rendite, DSCR und Modellwert – mit klarer Kaufempfehlung.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 border bg-card hover:bg-slate-50"
              onClick={() => setShowGlossary(true)}
            >
              <Info className="h-4 w-4" />
              Glossar
            </button>

            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={() => setItems(demoItems())}
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
      </div>

      {/* Inhalt für PDF – alles in diesen Wrapper */}
      <div
        ref={printRef}
        className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-28"
      >
        <ScenarioSection
          items={items}
          rows={rows}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          addItem={addItem}
          cloneItem={cloneItem}
          deleteItem={deleteItem}
          patchItem={patchItem}
        />

        <CompareCharts
          chartCashflow={chartCashflow}
          chartValueVsPrice={chartValueVsPrice}
        />
      </div>

      {/* Sticky Bottom – Top-Szenario */}
      <CompareFooter best={best} />

      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
    </div>
  );
}

/*
  In Teil 2 folgen:
  - ScenarioSection
  - CompareCharts
  - CompareFooter
  - kleine UI-Bausteine (InputCard, InputBadge, NumberField, PercentField, Kpi, Badge, ScoreCardSmall, ScoreDots)

  In Teil 3:
  - demoItems, normalizeSzenario, Helper (num, num0, numDec, safe, pickColor)
  - GlossTerm Helper
*/
/* ====================== Szenarien-Bereich ====================== */

type ScenarioSectionProps = {
  items: Szenario[];
  rows: ViewRow[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  addItem: () => void;
  cloneItem: (id: string) => void;
  deleteItem: (id: string) => void;
  patchItem: (id: string, patch: Partial<Szenario>) => void;
};

function ScenarioSection({
  items,
  rows,
  selectedId,
  setSelectedId,
  addItem,
  cloneItem,
  deleteItem,
  patchItem,
}: ScenarioSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">
          Szenarien & Eingaben
        </h2>
        <p className="text-xs text-slate-500 max-w-2xl">
          Lege hier deine Objekte an (ETW, MFH, Gewerbe) und passe Mieten,
          Kosten und Finanzierung an. Score, Cashflow und Kaufempfehlung
          aktualisieren sich automatisch.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[11px] text-slate-500">
          <InputBadge />
          Eingaben beeinflussen Score, Cashflow und Modellwert.
        </span>
        <button
          className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-slate-50"
          onClick={addItem}
        >
          <Plus className="h-4 w-4" /> Szenario hinzufügen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((s) => {
          const v = rows.find((r) => r.id === s.id)!;
          const active = selectedId === s.id;

          return (
            <div
              key={s.id}
              className={
                "rounded-2xl border bg-white p-4 md:p-5 transition-all " +
                (active
                  ? "ring-2 ring-indigo-400 border-indigo-200"
                  : "hover:border-slate-300")
              }
            >
              {/* Kopfzeile Szenario */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-[11px] border font-medium"
                    style={{
                      background: s.color + "20",
                      borderColor: s.color + "66",
                    }}
                  >
                    {s.typ}
                  </span>
                  <input
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    value={s.name}
                    onChange={(e) =>
                      patchItem(s.id, { name: e.target.value })
                    }
                  />
                  <span className="text-[11px] text-slate-500">
                    ID: {s.id.slice(0, 6)}…
                  </span>
                </div>

                <div className="w-48 shrink-0 space-y-2">
                  <ScoreCardSmall score={v.score} label={v.scoreLabel} />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={
                        "h-9 inline-flex items-center justify-center rounded-lg border bg-card hover:bg-slate-50 " +
                        (active
                          ? "border-indigo-400 text-indigo-700"
                          : "text-slate-700")
                      }
                      onClick={() =>
                        setSelectedId(active ? null : s.id)
                      }
                      title="Szenario hervorheben"
                    >
                      <Target className="h-4 w-4" />
                    </button>
                    <button
                      className="h-9 inline-flex items-center justify-center rounded-lg border bg-card hover:bg-slate-50"
                      onClick={() => cloneItem(s.id)}
                      title="Duplizieren"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      className="h-9 inline-flex items-center justify-center rounded-lg border bg-card hover:bg-rose-50 text-rose-600 col-span-2"
                      onClick={() => deleteItem(s.id)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Eingaben – im Gewerbe-Style als InputCard */}
              <InputCard
                title="Eingaben für dieses Objekt"
                subtitle="Kaufpreis, Mieten, Kosten & Finanzierung"
                description="Passen alle Eingaben zum Markt? Du kannst z. B. mit Cap Rate und Opex spielen, um die Bewertung zu stress-testen."
              >
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Basis */}
                  <NumberField
                    label="Kaufpreis (€)"
                    value={s.kaufpreis}
                    onChange={(n) => patchItem(s.id, { kaufpreis: n })}
                  />
                  <NumberField
                    label="Fläche (m²)"
                    value={s.flaecheM2}
                    onChange={(n) => patchItem(s.id, { flaecheM2: n })}
                  />
                  <NumberField
                    label="Miete (€/m²/Monat)"
                    value={s.mieteProM2Monat}
                    step={0.1}
                    onChange={(n) =>
                      patchItem(s.id, { mieteProM2Monat: n })
                    }
                  />

                  {/* Leerstand & Opex */}
                  <PercentField
                    label="Leerstand (Quote, %)"
                    value={s.leerstandPct}
                    onChange={(x) =>
                      patchItem(s.id, { leerstandPct: x })
                    }
                  />
                  <PercentField
                    label="Opex auf Bruttomiete (%)"
                    value={s.opexPctBrutto}
                    onChange={(x) =>
                      patchItem(s.id, { opexPctBrutto: x })
                    }
                  />

                  {/* Finanzierung */}
                  <div className="rounded-2xl border bg-white p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-800">
                        Finanzierung
                      </span>
                      <label className="text-[11px] text-slate-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.financingOn}
                          onChange={(e) =>
                            patchItem(s.id, {
                              financingOn: e.target.checked,
                            })
                          }
                        />
                        aktiv
                      </label>
                    </div>
                    <AnimatePresence initial={false}>
                      {s.financingOn && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="grid grid-cols-1 gap-2 mt-1"
                        >
                          <PercentField
                            label="LTV (Beleihung, %)"
                            value={s.ltvPct}
                            onChange={(x) =>
                              patchItem(s.id, { ltvPct: x })
                            }
                            step={0.001}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <PercentField
                              label="Zins p.a."
                              value={s.zinsPct}
                              onChange={(x) =>
                                patchItem(s.id, { zinsPct: x })
                              }
                              step={0.001}
                            />
                            <PercentField
                              label="Tilgung p.a."
                              value={s.tilgungPct}
                              onChange={(x) =>
                                patchItem(s.id, { tilgungPct: x })
                              }
                              step={0.001}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Cap Rate */}
                  <PercentField
                    label="Cap Rate (Modell, %)"
                    value={s.capRateAssumed}
                    onChange={(x) =>
                      patchItem(s.id, { capRateAssumed: x })
                    }
                    step={0.0005}
                  />

                  {/* Mini-KPIs */}
                  <div className="grid sm:grid-cols-3 gap-2">
                    <Kpi
                      mini
                      label="NOI-Yield"
                      value={pct(v.noiYield)}
                      icon={<Gauge className="h-3.5 w-3.5" />}
                    />
                    <Kpi
                      mini
                      label="CF mtl."
                      value={eur(v.cashflowMonat)}
                      icon={<Banknote className="h-3.5 w-3.5" />}
                    />
                    <Kpi
                      mini
                      label="DSCR"
                      value={v.dscr ?? "–"}
                      icon={<TrendingUp className="h-3.5 w-3.5" />}
                    />
                  </div>
                </div>
              </InputCard>

              {/* Wert vs Preis-Mini-Zeile */}
              <div className="mt-3 rounded-2xl border bg-slate-50 p-2.5 text-[11px] md:text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <LineIcon className="h-4 w-4 text-slate-400" />
                  <span>
                    Modellwert (NOI/Cap):{" "}
                    <b>{eur(rows.find((r) => r.id === s.id)!.wertAusCap)}</b>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span>
                    Kaufpreis: <b>{eur(s.kaufpreis)}</b>
                  </span>
                </div>
                <span
                  className={
                    "px-2 py-1 rounded-full border text-[11px] " +
                    (v.valueGap >= 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200")
                  }
                >
                  {v.valueGap >= 0 ? "Unter Wert" : "Über Wert"} ·{" "}
                  {eur(Math.abs(v.valueGap))}
                </span>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-xs text-slate-500">
            Noch keine Szenarien angelegt. Füge oben ein Szenario hinzu.
          </p>
        )}
      </div>
    </section>
  );
}

/* ====================== Charts-Bereich (untereinander) ====================== */

function CompareCharts({
  chartCashflow,
  chartValueVsPrice,
}: {
  chartCashflow: { name: string; CF: number }[];
  chartValueVsPrice: { name: string; Preis: number; Wert: number }[];
}) {
  return (
    <section className="space-y-4">
      {/* Cashflow-Chart – volle Breite */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Cashflow (monatlich) – Ranking
            </div>
            <p className="text-xs text-slate-500">
              Zeigt, welches Objekt dir nach Zins und Tilgung den höchsten
              monatlichen Spielraum lässt.
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartCashflow}
              margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RTooltip formatter={(v: any) => eur(Number(v))} />
              <Legend />
              <Bar dataKey="CF" fill="#0ea5e9" radius={[8, 8, 0, 0]}>
                <LabelList
                  dataKey="CF"
                  position="top"
                  formatter={(v: any) => eur(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Dauerhaft negativer Cashflow = aktives Zuschießen. Das kann Sinn
          machen, wenn du Wertsteigerung oder Potenziale siehst – sollte
          aber bewusst entschieden sein.
        </p>
      </div>

      {/* Wert vs Preis – volle Breite */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Modellwert (NOI/Cap) vs. Kaufpreis
            </div>
            <p className="text-xs text-slate-500">
              Gegenüberstellung von Kaufpreis und Modellwert. So siehst du
              sofort, wo du „unter Wert“ einkaufst – oder wo du eher zu viel
              bezahlst.
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartValueVsPrice}
              margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f2933" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>
                <linearGradient id="gradWert" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RTooltip formatter={(v: any) => eur(Number(v))} />
              <Legend />
              <Bar
                dataKey="Preis"
                name="Kaufpreis"
                fill="url(#gradPreis)"
                radius={[8, 8, 0, 0]}
              >
                <LabelList
                  dataKey="Preis"
                  position="top"
                  formatter={(v: any) => eur(Number(v))}
                />
              </Bar>
              <Bar
                dataKey="Wert"
                name="Modellwert (NOI/Cap)"
                fill="url(#gradWert)"
                radius={[8, 8, 0, 0]}
              >
                <LabelList
                  dataKey="Wert"
                  position="top"
                  formatter={(v: any) => eur(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Große positive Value-Gap = Chance für guten Einkauf (oder konservative
          Annahmen). Negative Value-Gap = kritisch nachfragen, nachverhandeln
          oder ablehnen.
        </p>
      </div>
    </section>
  );
}

/* ====================== Footer (Top-Szenario) ====================== */

function CompareFooter({ best }: { best: ViewRow | null }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {best ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg shadow border"
                style={{ background: best.color }}
                title={best.typ}
              />
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  <span>{best.name}</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] bg-card">
                    <Stars className="h-3.5 w-3.5" /> Beste Option aktuell
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Score:</span>
                  <ScoreDots score={best.score} label={best.scoreLabel} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <Badge
                icon={<Gauge className="h-3.5 w-3.5" />}
                text={`NOI-Yield ${pct(best.noiYield)}`}
              />
              <Badge
                icon={<Banknote className="h-3.5 w-3.5" />}
                text={`CF mtl. ${eur(best.cashflowMonat)}`}
              />
              <Badge
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                text={`DSCR ${best.dscr ?? "–"}`}
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-600">
              <Info className="h-4 w-4 text-gray-400" />
              <span>
                Modellwert {eur(best.wertAusCap)} · Gap{" "}
                {best.valueGap >= 0 ? "Unter Wert" : "Über Wert"}{" "}
                {eur(Math.abs(best.valueGap))}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">
            Füge mindestens ein Szenario hinzu, um eine Empfehlung zu erhalten.
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== UI-Bausteine (Input & KPIs) ===================== */

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
    <div className="rounded-2xl border p-4 bg-amber-50/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground flex items-center gap-2">
            {title}
            <InputBadge />
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              {description}
            </p>
          )}
        </div>
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="text-xs md:text-sm grid gap-1 text-slate-800">
      <span>{label}</span>
      <input
        className="w-full rounded-xl border px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
      />
    </label>
  );
}

function PercentField({
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
  return (
    <label className="text-xs md:text-sm grid gap-1 text-slate-800">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={0.95}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <span className="w-20 text-right tabular-nums text-xs">
          {pct(value)}
        </span>
      </div>
    </label>
  );
}

function Kpi({
  label,
  value,
  icon,
  mini = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  mini?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-2.5 " +
        (mini ? "bg-slate-50" : "bg-card shadow-soft")
      }
    >
      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] text-slate-800 bg-card">
      {icon}
      {text}
    </span>
  );
}

function ScoreCardSmall({
  score,
  label,
}: {
  score: number;
  label: "BUY" | "CHECK" | "NO";
}) {
  const pctVal = Math.round(score * 100);
  const color =
    label === "BUY" ? "#16a34a" : label === "CHECK" ? "#f59e0b" : "#ef4444";

  const circumference = 2 * Math.PI * 15.5;
  const dash = (pctVal / 100) * circumference;

  return (
    <div className="rounded-xl border p-2.5 bg-white shadow-xs">
      <div className="text-[11px] text-slate-500 mb-1">Score</div>
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10">
          <svg viewBox="0 0 36 36" className="absolute inset-0">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              stroke="#e5e7eb"
              strokeWidth="5"
              fill="none"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              stroke={color}
              strokeWidth="5"
              fill="none"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(-90 18 18)"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <div className="text-base font-semibold" style={{ color }}>
            {pctVal}%
          </div>
          <div className="text-[11px] text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ScoreDots({
  score,
  label,
}: {
  score: number;
  label: "BUY" | "CHECK" | "NO";
}) {
  const filled = Math.round(score * 5);
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            "h-2.5 w-2.5 rounded-full " +
            (i < filled
              ? label === "BUY"
                ? "bg-emerald-500"
                : label === "CHECK"
                ? "bg-amber-500"
                : "bg-rose-500"
              : "bg-gray-300")
          }
        />
      ))}
      <span className="ml-1 text-[11px] text-slate-500">
        {labelText(label)}
      </span>
    </div>
  );
}
/* ======================= Demo & Normalizer ===================== */

function demoItems(): Szenario[] {
  return [
    {
      id: uid(),
      name: "ETW – Cityrand",
      typ: "ETW",
      color: "#60a5fa",
      kaufpreis: 320_000,
      flaecheM2: 68,
      mieteProM2Monat: 12.5,
      leerstandPct: 0.06,
      opexPctBrutto: 0.24,
      financingOn: true,
      ltvPct: 0.8,
      zinsPct: 0.039,
      tilgungPct: 0.02,
      capRateAssumed: 0.055,
    },
    {
      id: uid(),
      name: "MFH – solider Cashflow",
      typ: "MFH",
      color: "#34d399",
      kaufpreis: 1_200_000,
      flaecheM2: 165,
      mieteProM2Monat: 12.1,
      leerstandPct: 0.05,
      opexPctBrutto: 0.18,
      financingOn: true,
      ltvPct: 0.8,
      zinsPct: 0.039,
      tilgungPct: 0.02,
      capRateAssumed: 0.057,
    },
    {
      id: uid(),
      name: "Gewerbe – Büro 2 Zonen",
      typ: "GEWERBE",
      color: "#f59e0b",
      kaufpreis: 1_500_000,
      flaecheM2: 600,
      mieteProM2Monat: 15,
      leerstandPct: 0.08,
      opexPctBrutto: 0.26,
      financingOn: true,
      ltvPct: 0.65,
      zinsPct: 0.043,
      tilgungPct: 0.02,
      capRateAssumed: 0.065,
    },
  ];
}

function normalizeSzenario(x: any): Szenario {
  return {
    id: String(x.id ?? uid()),
    name: String(x.name ?? "Szenario"),
    typ: (x.typ as SzenarioTyp) ?? "ETW",
    color: String(x.color ?? pickColor(Math.floor(Math.random() * 6) + 1)),
    kaufpreis: num(x.kaufpreis, 300_000),
    flaecheM2: num(x.flaecheM2, 70),
    mieteProM2Monat: num(x.mieteProM2Monat, 12),
    leerstandPct: clamp01(num(x.leerstandPct, 0.05)),
    opexPctBrutto: clamp01(num(x.opexPctBrutto, 0.25)),
    financingOn: Boolean(x.financingOn ?? true),
    ltvPct: clamp01(num(x.ltvPct, 0.8)),
    zinsPct: clamp01(num(x.zinsPct, 0.04)),
    tilgungPct: clamp01(num(x.tilgungPct, 0.02)),
    capRateAssumed: clamp01(num(x.capRateAssumed, 0.055)),
  };
}

/* ============================ Helper ============================ */

function num(v: any, fb: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function num0(v: number) {
  return Number.isFinite(v)
    ? String(Math.round(v)).replace(".", ",")
    : "";
}

function numDec(v: number, d: number) {
  if (!Number.isFinite(v)) return "";
  const s = v.toFixed(d);
  return s.replace(".", ",");
}

function safe(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function pickColor(i: number) {
  const palette = [
    "#60a5fa",
    "#34d399",
    "#f59e0b",
    "#f472b6",
    "#a78bfa",
    "#fb7185",
  ];
  return palette[(i - 1) % palette.length];
}

/* ============================ Glossar ============================ */

function Glossary({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Glossar – Kennzahlen</h3>
          <button
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <dl className="space-y-3 text-sm text-slate-800">
          <GlossTerm term="NOI (Net Operating Income)">
            Jahresnettomiete nach Leerstand und laufenden Betriebskosten (Opex),
            aber vor Finanzierung. Basis für NOI-Yield und Wert (NOI/Cap).
          </GlossTerm>
          <GlossTerm term="NOI-Yield">
            Verhältnis aus NOI und Kaufpreis. Zeigt, wie „rentabel“ das Objekt
            vor Finanzierung ist. Beispiel: 5,5&nbsp;% entspricht grob einer
            18-fachen Jahresnettomiete.
          </GlossTerm>
          <GlossTerm term="Cashflow (monatlich)">
            Geld, das nach Zins- und Tilgungszahlung übrig bleibt
            (oder fehlt). Positiver Cashflow = das Objekt trägt sich, negativer
            Cashflow = du musst monatlich zuschießen.
          </GlossTerm>
          <GlossTerm term="DSCR (Debt Service Coverage Ratio)">
            Kennzahl, wie gut dein NOI die jährlichen Kreditraten deckt. 1,0
            bedeutet „gerade ausreichend“, ab ca. 1,2–1,3 wird es komfortabler,
            darüber entspannt.
          </GlossTerm>
          <GlossTerm term="LTV (Loan-to-Value)">
            Verhältnis von Darlehenshöhe zum Kaufpreis (ohne NK). 80&nbsp;% LTV
            heißt: 80&nbsp;% Fremdkapital, 20&nbsp;% Eigenkapital (plus
            Nebenkosten).
          </GlossTerm>
          <GlossTerm term="Cap Rate">
            Rendite-Annahme des Marktes auf Basis des NOI. Über NOI/Cap kannst
            du einen Modellwert berechnen. Höhere Cap Rate = niedrigerer Wert
            (z. B. C-Lage), niedrigere Cap Rate = höherer Wert (Top-Lage).
          </GlossTerm>
          <GlossTerm term="Modellwert (NOI/Cap)">
            Theoretischer Objektwert basierend auf deinem NOI und der gewählten
            Cap Rate. Dient als Referenzpunkt, nicht als Gutachten.
          </GlossTerm>
          <GlossTerm term="Value Gap">
            Differenz zwischen Modellwert und Kaufpreis. Positiv = „unter Wert“
            (Chance), negativ = „über Wert“ (kritisch prüfen oder
            nachverhandeln).
          </GlossTerm>
          <GlossTerm term="Opex (Operating Expenses)">
            Laufende Betriebskosten, die beim Eigentümer hängen bleiben
            (z. B. nicht umlagefähige Kosten, Verwaltung, Instandhaltung).
          </GlossTerm>
          <GlossTerm term="Leerstand (Vacancy)">
            Anteil der Flächen, die nicht vermietet sind – entweder dauerhaft
            oder temporär. Er reduziert unmittelbare Mieteinnahmen.
          </GlossTerm>
        </dl>
        <div className="mt-4 text-xs text-slate-500">
          Hinweis: Vereinfachte Darstellung – ersetzt keine steuerliche,
          rechtliche oder finanzielle Beratung.
        </div>
      </div>
    </div>
  );
}

function GlossTerm({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-medium text-slate-900">{term}</dt>
      <dd className="text-slate-600 text-sm">{children}</dd>
    </div>
  );
}
