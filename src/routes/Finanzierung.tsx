// src/routes/Finanzierung.tsx
// Finanzierung (Propora PRO) – v2.0 UI-Update
// Berechnungslogik unverändert, UI/UX an Gewerbe-Check angepasst.

import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "recharts";
import PlanGuard from "@/components/PlanGuard";
import { AnimatePresence, motion } from "framer-motion";
import { Download, CreditCard } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ============ Farben & Helpers ============ */
const COLORS = {
  primary: "#2563eb",
  indigo: "#4f46e5",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
};

// Brand-Optik angelehnt an Gewerbe-Check
const BRAND = "#0F2C8A";
const CTA = "#ffde59";
const SURFACE = "#F7F7FA";
const SURFACE_ALT = "#EAEAEE";

const eur0 = (n: number) =>
  n.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
const eur = (n: number) =>
  n.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const nice = (n: number) => Math.round(n);

/* ============ Types ============ */
type JahresRow = {
  year: number;
  kalenderjahr: number;
  zins: number;
  tilgung: number;
  sonder: number;
  rateSum: number;
  restschuld: number;
};
type SonderMode = "EUR" | "PCT";
type Input = {
  // Kauf & NK
  kaufpreis: number;
  grunderwerbPct: number;
  notarPct: number;
  maklerPct: number;
  sonstKosten: number;
  eigenkapital: number;

  // Darlehen
  zinsSollPct: number;
  tilgungStartPct: number;
  zinsbindungJahre: number;

  // Planung
  laufzeitJahre: number;

  // Sondertilgung
  sonderOn: boolean;
  sonderMode: SonderMode;
  sonderAmount: number; // € p.a. ODER % (0..1)
  sonderStartYear: number;
  sonderEndYear: number;

  // NEU: Bank-Grenze
  sonderCapOn: boolean;
  sonderCapPct: number; // 0..1 (max % vom Ursprung p.a.)

  // NEU: Ziel-Restschuld zum Ende Zinsbindung
  zielRestAtFix: number; // € (0 = kein Ziel)
};

const DRAFT_KEY = "finance.tool.v1.6";

/* ============ Page Wrapper ============ */
export default function Finanzierung() {
  return (
    <PlanGuard required="pro">
      <FinanzierungInner />
    </PlanGuard>
  );
}

/* ============ Export-Dropdown ============ */
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
        className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2  border hover:shadow transition"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" /> Export
        <svg
          className="h-4 w-4 opacity-70"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.207l3.71-3.977a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1-1.08 0l-4.24-4.54a.75.75 0 0 1 .02-1.06z" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg p-3 z-50" style={{ background: "rgba(22,27,34,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
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
                className="px-3 py-1.5 text-sm rounded-lg border hover:"
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

/* ============ Component ============ */
function FinanzierungInner() {
  const [input, setInput] = useState<Input>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as Input;
    } catch {}
    return {
      kaufpreis: 400_000,
      grunderwerbPct: 0.05,
      notarPct: 0.015,
      maklerPct: 0,
      sonstKosten: 2500,
      eigenkapital: 120_000,
      zinsSollPct: 0.038,
      tilgungStartPct: 0.02,
      zinsbindungJahre: 10,
      laufzeitJahre: 30,

      sonderOn: false,
      sonderMode: "EUR",
      sonderAmount: 5000,
      sonderStartYear: 2,
      sonderEndYear: 10,

      sonderCapOn: false,
      sonderCapPct: 0.05,
      zielRestAtFix: 0,
    };
  });
  const [showGlossary, setShowGlossary] = useState(false);
  const printRef = useRef<HTMLDivElement>(null); // Bereich für PDF

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(input));
    } catch {}
  }, [input]);

  /* === NK & Darlehen === */
  const nk = useMemo(() => {
    const ge = input.kaufpreis * clamp(input.grunderwerbPct, 0, 0.15);
    const no = input.kaufpreis * clamp(input.notarPct, 0, 0.05);
    const ma = input.kaufpreis * clamp(input.maklerPct, 0, 0.08);
    return {
      ge,
      no,
      ma,
      total: ge + no + ma + Math.max(0, input.sonstKosten),
    };
  }, [input]);
  const kapitalbedarf = useMemo(
    () => input.kaufpreis + nk.total,
    [input.kaufpreis, nk.total]
  );
  const darlehen = useMemo(
    () => Math.max(0, kapitalbedarf - Math.max(0, input.eigenkapital)),
    [kapitalbedarf, input.eigenkapital]
  );
  const ltv = useMemo(
    () => (input.kaufpreis > 0 ? darlehen / input.kaufpreis : 0),
    [darlehen, input.kaufpreis]
  );

  const annuitaetMonat = useMemo(
    () => (darlehen * (input.zinsSollPct + input.tilgungStartPct)) / 12,
    [darlehen, input.zinsSollPct, input.tilgungStartPct]
  );

  /* === Tilgungsplan + Sonder (mit Bank-Grenze) === */
  const schedule = useMemo<JahresRow[]>(() => {
    const principal0 = darlehen;
    const H = clamp(Math.round(input.laufzeitJahre), 1, 50);
    const startYear = new Date().getFullYear();
    const i_m = input.zinsSollPct / 12;
    const A = annuitaetMonat;

    const sonderPerYearAbs = (origin: number, year: number) => {
      if (!input.sonderOn) return 0;
      if (year < input.sonderStartYear || year > input.sonderEndYear) return 0;
      let wish =
        input.sonderMode === "EUR"
          ? Math.max(0, input.sonderAmount)
          : Math.max(0, origin * clamp(input.sonderAmount, 0, 1));
      if (input.sonderCapOn) {
        const cap = origin * clamp(input.sonderCapPct, 0, 1);
        wish = Math.min(wish, cap);
      }
      return wish;
    };

    let rest = principal0;
    const years: JahresRow[] = [];

    for (let y = 1; y <= H; y++) {
      let zinsJ = 0,
        tilgJ = 0,
        rateJ = 0;

      for (let m = 1; m <= 12; m++) {
        if (rest <= 0.01) break;
        const z = rest * i_m;
        const tilg = Math.max(0, A - z);
        rest = Math.max(0, rest - tilg);
        zinsJ += z;
        tilgJ += tilg;
        rateJ += z + tilg;
      }

      let sonder = 0;
      if (rest > 0) {
        const wish = sonderPerYearAbs(principal0, y);
        if (wish > 0) {
          sonder = Math.min(rest, wish);
          rest = Math.max(0, rest - sonder);
        }
      }

      years.push({
        year: y,
        kalenderjahr: startYear + (y - 1),
        zins: zinsJ,
        tilgung: tilgJ,
        sonder,
        rateSum: rateJ,
        restschuld: rest,
      });

      if (rest <= 0.01) {
        for (let k = y + 1; k <= H; k++) {
          years.push({
            year: k,
            kalenderjahr: startYear + (k - 1),
            zins: 0,
            tilgung: 0,
            sonder: 0,
            rateSum: 0,
            restschuld: 0,
          });
        }
        break;
      }
    }
    return years;
  }, [
    darlehen,
    input.laufzeitJahre,
    input.zinsSollPct,
    annuitaetMonat,
    input.sonderOn,
    input.sonderMode,
    input.sonderAmount,
    input.sonderStartYear,
    input.sonderEndYear,
    input.sonderCapOn,
    input.sonderCapPct,
  ]);

  /* === KPIs === */
  const totalZins = useMemo(
    () => schedule.reduce((s, r) => s + r.zins, 0),
    [schedule]
  );
  const totalTilg = useMemo(
    () => schedule.reduce((s, r) => s + r.tilgung, 0),
    [schedule]
  );
  const totalSonder = useMemo(
    () => schedule.reduce((s, r) => s + r.sonder, 0),
    [schedule]
  );

  const first = schedule[0];
  const rateBadge = useMemo(() => {
    const z1 = first?.zins ?? 0,
      t1 = first?.tilgung ?? 0;
    const sum = z1 + t1;
    const p = sum > 0 ? z1 / sum : 0;
    if (p > 0.6) return { text: "Rate: überwiegend Zinsen", color: COLORS.rose };
    if (p < 0.4)
      return { text: "Rate: überwiegend Tilgung", color: COLORS.emerald };
    return { text: "Rate: ausgewogen", color: COLORS.amber };
  }, [first]);

  const ltvState = useMemo(() => {
    if (ltv <= 0.6) return { label: "sehr komfortabel", color: COLORS.emerald };
    if (ltv <= 0.8) return { label: "komfortabel", color: COLORS.emerald };
    if (ltv <= 0.9) return { label: "ok", color: COLORS.amber };
    return { label: "angespannt", color: COLORS.rose };
  }, [ltv]);

  const bodenfehler = input.eigenkapital > kapitalbedarf;

  // NEU: Restschuld zum Ende Zinsbindung (+ Delta zum Ziel)
  const idxFix = clamp(
    Math.round(input.zinsbindungJahre),
    1,
    Math.max(1, schedule.length)
  );
  const restAtFix = schedule[idxFix - 1]?.restschuld ?? 0;
  const zielRest = Math.max(0, input.zielRestAtFix || 0);
  const restDelta = zielRest > 0 ? restAtFix - zielRest : 0; // >0 = über Ziel, <0 = unter Ziel
  const zielState =
    zielRest > 0
      ? restAtFix <= zielRest
        ? { label: "unter Ziel", color: COLORS.emerald }
        : { label: "über Ziel", color: COLORS.rose }
      : null;

  /* === Export === */
  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finanzierung-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportCsv() {
    const header = [
      "Jahr",
      "Kalenderjahr",
      "Zinsen",
      "Tilgung",
      "Sondertilgung",
      "Summe Raten",
      "Restschuld",
    ];
    const rows = schedule.map((r) => [
      r.year,
      r.kalenderjahr,
      nice(r.zins),
      nice(r.tilgung),
      nice(r.sonder),
      nice(r.rateSum),
      nice(r.restschuld),
    ]);
    const csv = [header.join(";")]
      .concat(rows.map((cols) => cols.join(";")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tilgungsplan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function exportPdf() {
    if (!printRef.current) return;
    const node = printRef.current;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842

    const pageW = 595,
      pageH = 842,
      margin = 20;
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
        pdf.addImage(part, "PNG", margin, margin, imgW, partH, undefined, "FAST");

        srcY += sliceHeight;
      }
    }
    pdf.save("finanzierung.pdf");
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

  /* === UI: Layout + Header + Sticky-Footer (Content folgt in Teil 2) === */
  return (
    <div
      className="min-h-screen" style={{ background: "#0d1117", color: "#e6edf3" }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Header im Gewerbe-Stil */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shadow"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, ${COLORS.indigo})`,
                color: "#fff",
              }}
            >
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Finanzierungs-Analyse
        </h1>
              <p className="text-sm ">
                Kapitalbedarf, Darlehenshöhe, Annuität und Restschuld planen – inkl.
                Sondertilgung mit Bank-Grenze und Ziel-Restschuld zum Ende der
                Zinsbindung.
              </p>
              <p className="text-xs  mt-1 max-w-2xl">
                Vereinfacht dargestelltes Annuitätenmodell ohne individuelle
                Beratung. Ideal, um Szenarien durchzuspielen und eine erste
                Einschätzung zu bekommen – keine Finanz- oder Steuerberatung.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Beispiel-Reset auf Defaultwerte */}
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2  border hover:shadow transition"
              onClick={() =>
                setInput({
                  kaufpreis: 400_000,
                  grunderwerbPct: 0.05,
                  notarPct: 0.015,
                  maklerPct: 0,
                  sonstKosten: 2500,
                  eigenkapital: 120_000,
                  zinsSollPct: 0.038,
                  tilgungStartPct: 0.02,
                  zinsbindungJahre: 10,
                  laufzeitJahre: 30,
                  sonderOn: false,
                  sonderMode: "EUR",
                  sonderAmount: 5000,
                  sonderStartYear: 2,
                  sonderEndYear: 10,
                  sonderCapOn: false,
                  sonderCapPct: 0.05,
                  zielRestAtFix: 0,
                })
              }
            >
              Beispiel
            </button>

            <Btn label="Glossar" variant="secondary" onClick={() => setShowGlossary(true)} />
            <ExportDropdown onRun={runSelectedExports} />
          </div>
        </div>

        {/* Grid: Hauptbereich + (optional) Sidebar – Inhalt im PDF-Bereich */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* --- ALLES innerhalb dieses Wrappers landet im PDF --- */}
            <div ref={printRef} className="space-y-6">
              {/* Der eigentliche Content (Kurz erklärt, KPIs, Eingaben, Charts, Tabelle)
                  kommt in TEIL 2 und TEIL 3 unterhalb dieser Wrapper-DIV weiter. */}
              {/* Kurz erklärt / Nutzung */}
              <section className="rounded-2xl p-4 md:p-5 space-y-3" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                    style={{
                      background: BRAND,
                      color: "#fff",
                    }}
                  >
                    i
                  </span>
                  Kurz erklärt
                </div>
                <p className="text-sm text-slate-700">
                  Mit diesem Rechner planst du deinen{" "}
                  <span className="font-medium">Kapitalbedarf</span>, die{" "}
                  <span className="font-medium">Darlehenshöhe</span>, die{" "}
                  <span className="font-medium">monatliche Annuität</span> sowie
                  die Entwicklung der{" "}
                  <span className="font-medium">Restschuld</span> über die
                  Zeit. Optional kannst du Sondertilgungen und eine
                  Ziel-Restschuld zum Ende der Zinsbindung berücksichtigen.
                </p>
                <ul className="text-sm text-slate-700 space-y-1.5 ml-1">
                  <li>
                    <b>Kapitalbedarf</b> = Kaufpreis + Nebenkosten (Steuer,
                    Notar, ggf. Makler, Sonstiges).
                  </li>
                  <li>
                    <b>Darlehen</b> = Kapitalbedarf – Eigenkapital.
                  </li>
                  <li>
                    <b>Monatsrate</b> ≈ (Sollzins + anfängliche Tilgung) ×
                    Darlehen / 12.
                  </li>
                  <li>
                    <b>Sondertilgung</b> reduziert die Restschuld am
                    Jahresende; eine Bank-Grenze limitiert den Betrag (z. B. 5
                    % p.a. vom Ursprungsdarlehen).
                  </li>
                </ul>
              </section>

              {/* KPIs */}
              <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <KpiCard label="Kapitalbedarf" value={eur0(kapitalbedarf)} />
                <KpiCard label="Eigenkapital" value={eur0(input.eigenkapital)} />
                <KpiCard label="Darlehen" value={eur0(darlehen)} />
                <KpiCard
                  label="Monatsrate (Start)"
                  value={eur(annuitaetMonat)}
                />
                <KpiBadge
                  label={`LTV ${(ltv * 100).toFixed(0)} %`}
                  value={ltvState.label}
                  color={ltvState.color}
                />
              </section>

              {/* Schnellstart */}
              <section className="rounded-2xl p-4 md:p-5" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Schnellstart
                    </div>
                    <p className="text-xs text-slate-500">
                      Starte mit typischen Finanzierungsquoten und passe dann
                      deine Werte an.
                    </p>
                  </div>
                </div>
                <QuickChips setInput={setInput} />
              </section>

              {/* Eingaben */}
              <section className="rounded-2xl border  shadow-sm p-4 md:p-5 space-y-6">
                {/* Kauf & NK */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-800">
                      Kauf & Nebenkosten
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Basis für Kapitalbedarf und Darlehenshöhe
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl">
                    In diesem Abschnitt trägst du alle Kosten rund um den
                    Kaufvertrag ein: Kaufpreis sowie Steuern, Notar-/Grundbuch-
                    und Maklerkosten. Zusätzlich kannst du weitere einmalige
                    Kosten berücksichtigen.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <NumberField
                      label="Kaufpreis (€)"
                      value={input.kaufpreis}
                      onChange={(v) =>
                        setInput((s) => ({ ...s, kaufpreis: v }))
                      }
                    />
                    <PercentField
                      label="Grunderwerbsteuer (%)"
                      value={input.grunderwerbPct * 100}
                      onChange={(p) =>
                        setInput((s) => ({
                          ...s,
                          grunderwerbPct: clamp(p, 0, 100) / 100,
                        }))
                      }
                    />
                    <PercentField
                      label="Notar/Grundbuch (%)"
                      value={input.notarPct * 100}
                      onChange={(p) =>
                        setInput((s) => ({
                          ...s,
                          notarPct: clamp(p, 0, 100) / 100,
                        }))
                      }
                    />
                    <PercentField
                      label="Makler (%)"
                      value={input.maklerPct * 100}
                      onChange={(p) =>
                        setInput((s) => ({
                          ...s,
                          maklerPct: clamp(p, 0, 100) / 100,
                        }))
                      }
                    />
                    <NumberField
                      label="Sonstige Kosten (€)"
                      value={input.sonstKosten}
                      onChange={(v) =>
                        setInput((s) => ({ ...s, sonstKosten: v }))
                      }
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Nebenkosten ≈ {eur0(nk.total)} (GrESt {eur0(nk.ge)}, Notar{" "}
                    {eur0(nk.no)}, Makler {eur0(nk.ma)}, sonst.{" "}
                    {eur0(input.sonstKosten)})
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <NumberField
                      label="Eigenkapital (€)"
                      value={input.eigenkapital}
                      onChange={(v) =>
                        setInput((s) => ({ ...s, eigenkapital: v }))
                      }
                    />
                    {bodenfehler && (
                      <div className="md:col-span-3 text-xs text-rose-600 self-end">
                        Eigenkapital übersteigt Kapitalbedarf – bitte prüfen.
                      </div>
                    )}
                  </div>
                </div>

                {/* Darlehen */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-800">
                      Darlehen & Laufzeit
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Zins, Tilgung und Planungshorizont
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl">
                    Hier bestimmst du den Zins, die anfängliche Tilgung, die
                    Dauer der Zinsbindung und den Planungshorizont für die
                    Gesamtlaufzeit. Daraus ergibt sich die monatliche Rate und
                    der Tilgungsverlauf.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <PercentField
                      label="Sollzins p.a. (%)"
                      value={input.zinsSollPct * 100}
                      onChange={(p) =>
                        setInput((s) => ({
                          ...s,
                          zinsSollPct: clamp(p, 0, 100) / 100,
                        }))
                      }
                      step={0.01}
                    />
                    <PercentField
                      label="anfängliche Tilgung p.a. (%)"
                      value={input.tilgungStartPct * 100}
                      onChange={(p) =>
                        setInput((s) => ({
                          ...s,
                          tilgungStartPct: clamp(p, 0, 100) / 100,
                        }))
                      }
                    />
                    <NumberField
                      label="Zinsbindung (Jahre)"
                      value={input.zinsbindungJahre}
                      onChange={(v) =>
                        setInput((s) => ({
                          ...s,
                          zinsbindungJahre: clamp(Math.round(v), 1, 30),
                        }))
                      }
                    />
                    <NumberField
                      label="Planungshorizont (Jahre)"
                      value={input.laufzeitJahre}
                      onChange={(v) =>
                        setInput((s) => ({
                          ...s,
                          laufzeitJahre: clamp(Math.round(v), 1, 50),
                        }))
                      }
                    />
                    <div className="md:col-span-2 flex justify-end">
                      <KpiPill
                        text={rateBadge.text}
                        color={rateBadge.color}
                      />
                    </div>
                  </div>
                </div>

                {/* Sondertilgung */}
                <div className="space-y-3 border-t pt-4">
                  <details className="rounded-2xl p-3 md:p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800 flex items-center gap-2">
                      Sondertilgung (optional)
                      <span className="text-[11px] font-normal text-slate-500">
                        z. B. jährliche Zusatzzahlungen aus Boni oder
                        Überschüssen
                      </span>
                    </summary>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
                      <label className="text-sm text-slate-800 flex items-center gap-2 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={input.sonderOn}
                          onChange={(e) =>
                            setInput((s) => ({
                              ...s,
                              sonderOn: e.target.checked,
                            }))
                          }
                        />
                        Sondertilgung aktivieren
                      </label>

                      <SelectField<SonderMode>
                        label="Modus"
                        value={input.sonderMode}
                        options={[
                          { value: "EUR", label: "Fixbetrag (€ p.a.)" },
                          {
                            value: "PCT",
                            label: "% vom Ursprungsdarlehen p.a.",
                          },
                        ]}
                        onChange={(v) =>
                          setInput((s) => ({ ...s, sonderMode: v }))
                        }
                      />

                      {input.sonderMode === "EUR" ? (
                        <NumberField
                          label="Betrag (€ / Jahr)"
                          value={input.sonderAmount}
                          onChange={(v) =>
                            setInput((s) => ({
                              ...s,
                              sonderAmount: Math.max(0, v),
                            }))
                          }
                        />
                      ) : (
                        <PercentField
                          label="% vom Ursprungsdarlehen / Jahr"
                          value={(input.sonderAmount ?? 0) * 100}
                          onChange={(p) =>
                            setInput((s) => ({
                              ...s,
                              sonderAmount: clamp(p, 0, 100) / 100,
                            }))
                          }
                          step={0.1}
                        />
                      )}

                      <NumberField
                        label="ab Jahr"
                        value={input.sonderStartYear}
                        onChange={(v) =>
                          setInput((s) => {
                            const start = clamp(
                              Math.round(v),
                              1,
                              s.laufzeitJahre
                            );
                            const end = Math.max(start, s.sonderEndYear);
                            return {
                              ...s,
                              sonderStartYear: start,
                              sonderEndYear: end,
                            };
                          })
                        }
                      />
                      <NumberField
                        label="bis Jahr"
                        value={input.sonderEndYear}
                        onChange={(v) =>
                          setInput((s) => ({
                            ...s,
                            sonderEndYear: clamp(
                              Math.round(v),
                              s.sonderStartYear,
                              s.laufzeitJahre
                            ),
                          }))
                        }
                      />

                      {/* Bank-Grenzwert */}
                      <div className="md:col-span-3 rounded-xl p-3 space-y-2" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <label className="text-xs text-slate-800 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={input.sonderCapOn}
                            onChange={(e) =>
                              setInput((s) => ({
                                ...s,
                                sonderCapOn: e.target.checked,
                              }))
                            }
                          />
                          Bank-Grenze anwenden
                          <Help title="Viele Banken erlauben z. B. max. 5 % p.a. Sondertilgung bezogen auf den ursprünglichen Darlehensbetrag." />
                        </label>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <PercentField
                            label="Max. % p.a. (vom Ursprungsdarlehen)"
                            value={input.sonderCapPct * 100}
                            onChange={(p) =>
                              setInput((s) => ({
                                ...s,
                                sonderCapPct: clamp(p, 0, 100) / 100,
                              }))
                            }
                            step={0.1}
                          />
                          <KpiCard
                            label="Max. Betrag p.a."
                            value={eur0(
                              Math.round(
                                darlehen *
                                  (input.sonderCapOn
                                    ? input.sonderCapPct
                                    : 0)
                              )
                            )}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Die Bank limitiert z. B. auf 5 % p.a. – dein Wunsch
                          wird automatisch darauf begrenzt.
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Ziel-Restschuld */}
                <div className="space-y-3 border-t pt-4">
                  <div className="rounded-2xl p-3 md:p-4 space-y-3" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Ziel-Restschuld (Ende Zinsbindung)
                        </div>
                        <p className="text-xs text-slate-500 max-w-xl">
                          Lege fest, welche Restschuld du zum Ende der
                          Zinsbindung anstrebst – z. B. für eine gute
                          Anschlussfinanzierung oder einen späteren Verkauf.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <NumberField
                        label="Ziel-Restschuld (€)"
                        value={input.zielRestAtFix}
                        onChange={(v) =>
                          setInput((s) => ({
                            ...s,
                            zielRestAtFix: Math.max(0, v),
                          }))
                        }
                      />
                      <KpiCard
                        label={`Restschuld in Jahr ${input.zinsbindungJahre}`}
                        value={eur0(Math.round(restAtFix))}
                      />
                      {zielState ? (
                        <KpiBadge
                          label="Status"
                          value={`${
                            zielState.label
                          } (${restDelta > 0 ? "+" : ""}${eur0(
                            Math.abs(Math.round(restDelta))
                          )})`}
                          color={zielState.color}
                        />
                      ) : (
                        <KpiBadge
                          label="Status"
                          value={"–"}
                          color={COLORS.slate}
                        />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tipp: Erhöhe Tilgung oder Sondertilgungen, um die
                      Ziel-Restschuld schneller zu erreichen.
                    </div>
                  </div>
                </div>
              </section>

              {/* Charts */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl p-4 md:p-5 shadow-sm" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Zinsen, Tilgung & Sondertilgung pro Jahr
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Wie sich deine jährlichen Zahlungen zusammensetzen –
                    inklusive optionaler Sondertilgungen.
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={schedule.map((r) => ({
                          name: `Y${r.year}`,
                          zins: nice(r.zins),
                          tilg: nice(r.tilgung),
                          sonder: nice(r.sonder),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                        <XAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} dataKey="name" />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <RTooltip formatter={(v: any) => eur0(Number(v))} />
                        <Legend />
                        <Bar
                          dataKey="zins"
                          name="Zinsen"
                          fill={COLORS.amber}
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="tilg"
                          name="Tilgung"
                          fill={COLORS.emerald}
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="sonder"
                          name="Sondertilgung"
                          fill={COLORS.primary}
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Summe: Zinsen {eur0(nice(totalZins))} · Tilgung{" "}
                    {eur0(nice(totalTilg))}
                    {input.sonderOn ? (
                      <>
                        {" "}
                        · Sondertilgung {eur0(nice(totalSonder))}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl p-4 md:p-5 shadow-sm" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Restschuld (Jahresende)
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Wie schnell sich deine Restschuld abbaut – und in welchem
                    Jahr du voraussichtlich schuldenfrei bist.
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={schedule.map((r) => ({
                          name: `Y${r.year}`,
                          rest: nice(r.restschuld),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                        <XAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} dataKey="name" />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <RTooltip formatter={(v: any) => eur0(Number(v))} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="rest"
                          name="Restschuld"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Tabelle */}
              <section className="rounded-2xl p-4 md:p-5 shadow-sm overflow-x-auto" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      Tilgungsplan (jährlich)
                    </div>
                    <p className="text-xs text-slate-500">
                      Kompakte Übersicht über Zinsen, Tilgung, Sondertilgungen
                      und Restschuld je Jahr.
                    </p>
                  </div>
                </div>
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="text-left text-slate-500 border-b text-xs">
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">Jahr</th>
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">
                        Kalenderjahr
                      </th>
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">Zinsen</th>
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">Tilgung</th>
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">
                        Sondertilgung
                      </th>
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">Summe Raten</th>
                      <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1.5 pr-2 font-medium">
                        Restschuld (Ende)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((r) => (
                      <tr
                        key={r.year}
                        className="border-b last:border-0 text-xs"
                      >
                        <td className="py-1.5 pr-2">{r.year}</td>
                        <td className="py-1.5 pr-2">{r.kalenderjahr}</td>
                        <td className="py-1.5 pr-2">
                          {eur0(nice(r.zins))}
                        </td>
                        <td className="py-1.5 pr-2">
                          {eur0(nice(r.tilgung))}
                        </td>
                        <td className="py-1.5 pr-2">
                          {eur0(nice(r.sonder))}
                        </td>
                        <td className="py-1.5 pr-2">
                          {eur0(nice(r.rateSum))}
                        </td>
                        <td className="py-1.5 pr-2">
                          {eur0(nice(r.restschuld))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <p className="text-[11px] text-slate-500 max-w-3xl">
                Hinweis: Vereinfachtes Modell mit konstanter Start-Annuität
                (Sollzins + anfängliche Tilgung), Sondertilgung am Jahresende,
                ohne Zinswechsel oder dynamische Ratenanpassungen. Keine
                Finanz-, Rechts- oder Steuerberatung. Für verbindliche
                Entscheidungen bitte immer mit Bank/Berater sprechen.
              </p>
            </div>
          </div>

          {/* Sidebar / Überblick */}
          <div className="space-y-4 xl:space-y-5">
            <div
              className="rounded-2xl p-4 md:p-5 shadow-sm space-y-3" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}

            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Finanzierungs-Überblick
              </div>
              <div className="space-y-2 text-sm text-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Finanzierungsquote (LTV)
                  </span>
                  <span className="font-medium">
                    {(ltv * 100).toFixed(0)} %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Darlehensbetrag
                  </span>
                  <span className="font-medium">{eur0(darlehen)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Monatsrate (Start)
                  </span>
                  <span className="font-medium">{eur(annuitaetMonat)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Zinsbindung (Jahre)
                  </span>
                  <span className="font-medium">
                    {input.zinsbindungJahre}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/70 mt-2">
                <p className="text-[11px] text-slate-600">
                  Nutze den Rechner, um unterschiedliche Szenarien (z. B.
                  höhere Tilgung, andere Zinsbindung, Sondertilgungen)
                  miteinander zu vergleichen.
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-4 md:p-5 shadow-sm space-y-3" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Tipps für dein Gespräch mit der Bank
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li>
                  • Zeige, wie sich deine Rate bei unterschiedlichen
                  Zinsniveaus verändern würde.
                </li>
                <li>
                  • Nutze die Ziel-Restschuld, um eine realistische
                  Anschlussfinanzierung zu planen.
                </li>
                <li>
                  • Prüfe, ob Sondertilgungsoptionen zu deiner Liquidität
                  passen.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
    </div>
  );
}
/* ============ UI-Bausteine ============ */
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3.5 md:p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg md:text-xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

function KpiBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl p-3.5 md:p-4  shadow-sm" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          style={{ background: hexToRgba(color, 0.12), color }}
        >
          • {value}
        </span>
      </div>
    </div>
  );
}

function KpiPill({ text, color }: { text: string; color: string }) {
  return (
    <div className="self-end">
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border"
        style={{
          borderColor: hexToRgba(color, 0.3),
          background: hexToRgba(color, 0.08),
          color,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function Btn({
  label,
  onClick,
  variant = "primary",
  leftIcon,
}: {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  leftIcon?: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all active:scale-[0.98] h-9";
  const variants: Record<string, string> = {
    primary:
      "bg-[#0F2C8A] text-white shadow hover:brightness-110",
    secondary: " border  hover:",
    ghost:
      "bg-transparent border border-transparent hover:border-slate-200 ",
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick}>
      {leftIcon ? <span className="opacity-90">{leftIcon}</span> : null}
      <span className="leading-none">{label}</span>
    </button>
  );
}

function NumberField({
  label, value, onChange, step = 1, help, suffix, placeholder,
}: {
  label: string; value: number; onChange: (n: number) => void;
  step?: number; help?: string; suffix?: string; placeholder?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const displayValue = focused
    ? String(rawValue)
    : rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type={focused ? "number" : "text"}
          step={step} value={displayValue} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")))}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        {suffix && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="text-xs md:text-sm text-slate-800 block">
      <span>{label}</span>
      <input
        className="mt-1 w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }} //ndigo-500/40 focus:border-indigo-400 "
        type="number"
        step={step}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="text-xs md:text-sm text-slate-800 block">
      <span>{label}</span>
      <select
        className="mt-1 w-full rounded-xl px-3 text-sm focus:outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }} // focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 text-slate-400 ml-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>
  );
}

/* Glossar */
function Glossary({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md  shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Glossar</h3>
          <button
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <dl className="space-y-3 text-sm text-slate-800">
          <GlossTerm term="Sondertilgung">
            Außerplanmäßige Tilgung am Jahresende. Häufig begrenzt auf einen
            Prozentsatz des ursprünglichen Darlehens (z. B. 5 % p.a.).
          </GlossTerm>
          <GlossTerm term="Ziel-Restschuld">
            Wunsch-Restschuld zum Ende der Zinsbindung. Hilfreich, um eine
            Anschlussfinanzierung oder einen Verkauf zu planen.
          </GlossTerm>
          <GlossTerm term="Annuität">
            Gleichbleibende Rate, die sich aus Zins- und Tilgungsanteil
            zusammensetzt. Der Zinsanteil sinkt über die Zeit, der Tilgungsanteil
            steigt.
          </GlossTerm>
        </dl>
        <div className="mt-4 text-xs text-slate-500">
          Vereinfachte Darstellung, keine Finanz-, Steuer- oder Rechtsberatung.
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

/* Utils */
function hexToRgba(hex: string, alpha = 1) {
  const m = hex.replace("#", "");
  const bigint = parseInt(m, 16);
  const r = (bigint >> 16) & 255,
    g = (bigint >> 8) & 255,
    b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Presets */
type PresetKind = "80" | "90" | "100";

function computePreset(kind: PresetKind, s: Input): Input {
  if (kind === "80") {
    const ek = Math.round(
      s.kaufpreis * 0.2 +
        s.kaufpreis * (s.grunderwerbPct + s.notarPct + s.maklerPct) +
        s.sonstKosten
    );
    return { ...s, eigenkapital: ek, tilgungStartPct: 0.03 };
  } else if (kind === "90") {
    return {
      ...s,
      eigenkapital: Math.round(s.kaufpreis * 0.1),
      tilgungStartPct: 0.02,
    };
  }
  return { ...s, eigenkapital: 0, tilgungStartPct: 0.02 };
}

function QuickChips({
  setInput,
}: {
  setInput: React.Dispatch<React.SetStateAction<Input>>;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Chip
        color={COLORS.emerald}
        onClick={() => setInput((s) => computePreset("80", s))}
      >
        80&nbsp;% Finanzierung (inkl. NK aus EK)
      </Chip>
      <Chip
        color={COLORS.amber}
        onClick={() => setInput((s) => computePreset("90", s))}
      >
        90&nbsp;% Finanzierung
      </Chip>
      <Chip
        color={COLORS.rose}
        onClick={() => setInput((s) => computePreset("100", s))}
      >
        100&nbsp;% (inkl. Nebenkosten finanziert)
      </Chip>
    </div>
  );
}

function Chip({
  children,
  onClick,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      className="px-3 py-1.5 text-[11px] md:text-xs rounded-xl hover:shadow-md transition"
      style={{ borderColor: hexToRgba(color, 0.5) }}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
