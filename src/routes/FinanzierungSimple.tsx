// src/routes/FinanzierungSimple.tsx
// Finanzierung (einfach) – v2.0
// - Eingaben stehen direkt am Anfang
// - Einheitliches Export-/Import-Handling
// - Klarer Aufbau: Eingaben → KPIs → Schnellstart → Charts → Tabelle

import React, { useMemo, useRef, useState } from "react";
import PlanGuard from "@/components/PlanGuard";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Upload } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ================================
   Palette & Helpers
==================================*/
const COLORS = {
  primary: "#2563eb",
  indigo: "#4f46e5",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
};

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

const hexToRgba = (hex: string, alpha = 1) => {
  const m = hex.replace("#", "");
  const bigint = parseInt(m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ================================
   Types
==================================*/
type Input = {
  kaufpreis: number;
  nebenkostenPct: number; // 0..1
  eigenkapital: number;
  sollzinsPct: number; // 0..1 p.a.
  tilgungStartPct: number; // 0..1 p.a.
  horizontJahre: number;
};

type JahresRow = {
  jahr: number;
  kalenderjahr: number;
  zinsen: number;
  tilgung: number;
  rateSumme: number;
  restschuld: number;
};

/* ================================
   Page (Basis-Plan)
==================================*/
export default function FinanzierungSimple() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}

/* ============ Export-Dropdown (einheitlich) ============ */
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
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Download className="h-4 w-4" /> Export
        <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.207l3.71-3.977a.75.75 0 111.08 1.04l-4.24 4.54a.75.75 0 01-1.08 0l-4.24-4.54a.75.75 0 01.02-1.06z" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 220, background: "#161b22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Formate wählen</div>
            {[["JSON", json, setJson], ["CSV", csv, setCsv], ["PDF", pdf, setPdf]].map(([label, val, set]) => (
              <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                <input type="checkbox" checked={val as boolean} onChange={e => (set as any)(e.target.checked)} />{label as string}
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "6px", borderRadius: 8, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Abbrechen</button>
              <button onClick={run} style={{ flex: 1, padding: "6px", borderRadius: 8, fontSize: 12, background: "#FCDC45", color: "#111", fontWeight: 600, border: "none", cursor: "pointer" }}>Export</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================
   Page Inner
==================================*/
function PageInner() {
  const [input, setInput] = useState<Input>({
    kaufpreis: 400_000,
    nebenkostenPct: 0.1,
    eigenkapital: 100_000,
    sollzinsPct: 0.038,
    tilgungStartPct: 0.02,
    horizontJahre: 20,
  });
  const [showGlossary, setShowGlossary] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Kapitalbedarf & Darlehen
  const nebenkosten = useMemo(
    () =>
      Math.max(0, input.kaufpreis * clamp(input.nebenkostenPct, 0, 0.2)),
    [input.kaufpreis, input.nebenkostenPct]
  );
  const kapitalbedarf = useMemo(
    () => input.kaufpreis + nebenkosten,
    [input.kaufpreis, nebenkosten]
  );
  const darlehen = useMemo(
    () => Math.max(0, kapitalbedarf - Math.max(0, input.eigenkapital)),
    [kapitalbedarf, input.eigenkapital]
  );
  const ltv = useMemo(
    () => (input.kaufpreis > 0 ? darlehen / input.kaufpreis : 0),
    [darlehen, input.kaufpreis]
  );

  // Monatsrate (vereinfachte Annuität)
  const annuitaetMonat = useMemo(
    () => (darlehen * (input.sollzinsPct + input.tilgungStartPct)) / 12,
    [darlehen, input.sollzinsPct, input.tilgungStartPct]
  );

  // Tilgungsplan
  const plan = useMemo<JahresRow[]>(() => {
    const startYear = new Date().getFullYear();
    const H = clamp(Math.round(input.horizontJahre), 1, 50);
    const i_m = input.sollzinsPct / 12;
    const A = annuitaetMonat;

    let rest = darlehen;
    const jahre: JahresRow[] = [];

    for (let y = 1; y <= H; y++) {
      let zinsJ = 0,
        tilgJ = 0,
        rateJ = 0;

      for (let _m = 1; _m <= 12; _m++) {
        if (rest <= 0.01) break;
        const z = rest * i_m;
        const tilg = Math.max(0, A - z);
        const newRest = Math.max(0, rest - tilg);
        zinsJ += z;
        tilgJ += tilg;
        rateJ += z + tilg;
        rest = newRest;
      }

      jahre.push({
        jahr: y,
        kalenderjahr: startYear + (y - 1),
        zinsen: zinsJ,
        tilgung: tilgJ,
        rateSumme: rateJ,
        restschuld: rest,
      });

      if (rest <= 0.01) {
        for (let k = y + 1; k <= H; k++) {
          jahre.push({
            jahr: k,
            kalenderjahr: startYear + (k - 1),
            zinsen: 0,
            tilgung: 0,
            rateSumme: 0,
            restschuld: 0,
          });
        }
        break;
      }
    }
  return jahre;
  }, [darlehen, input.horizontJahre, input.sollzinsPct, annuitaetMonat]);

  const y1 = plan[0];
  const totalZins = plan.reduce((s, r) => s + r.zinsen, 0);
  const totalTilg = plan.reduce((s, r) => s + r.tilgung, 0);

  const rateBadge = useMemo(() => {
    const z1 = y1?.zinsen ?? 0;
    const t1 = y1?.tilgung ?? 0;
    const total = z1 + t1;
    const shareZ = total > 0 ? z1 / total : 0;
    if (shareZ > 0.6)
      return { text: "Rate: überwiegend Zinsen", color: COLORS.rose };
    if (shareZ < 0.4)
      return { text: "Rate: überwiegend Tilgung", color: COLORS.emerald };
    return { text: "Rate: ausgewogen", color: COLORS.amber };
  }, [y1]);

  const ltvState = useMemo(() => {
    if (ltv <= 0.6) return { label: "sehr komfortabel", color: COLORS.emerald };
    if (ltv <= 0.8) return { label: "komfortabel", color: COLORS.emerald };
    if (ltv <= 0.9) return { label: "ok", color: COLORS.amber };
    return { label: "angespannt", color: COLORS.rose };
  }, [ltv]);

  const eigenkapFehler = input.eigenkapital > kapitalbedarf;

  // Presets
  const applyPreset = (kind: "80" | "90" | "100") => {
    setInput((s) => {
      if (kind === "80") {
        const ek = Math.round(
          s.kaufpreis * 0.2 + s.kaufpreis * s.nebenkostenPct
        ); // EK deckt NK
        return { ...s, eigenkapital: ek, tilgungStartPct: 0.03 };
      }
      if (kind === "90") {
        const ek = Math.round(s.kaufpreis * 0.1); // NK teils finanziert
        return { ...s, eigenkapital: ek, tilgungStartPct: 0.02 };
      }
      // 100% inkl. NK
      return { ...s, eigenkapital: 0, tilgungStartPct: 0.02 };
    });
  };

  /* === Export / Import Helpers === */
  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finanzierung-simple-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const header = [
      "Jahr",
      "Kalenderjahr",
      "Zinsen",
      "Tilgung",
      "Summe Raten",
      "Restschuld",
    ];
    const rows = plan.map((r) => [
      r.jahr,
      r.kalenderjahr,
      nice(r.zinsen),
      nice(r.tilgung),
      nice(r.rateSumme),
      nice(r.restschuld),
    ]);
    const csv = [header.join(";")]
      .concat(rows.map((cols) => cols.join(";")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tilgungsplan-simple.csv";
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
    const pdf = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842

    const pageW = 595;
    const pageH = 842;
    const margin = 20;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, undefined, "FAST");
    } else {
      let srcY = 0;
      const sliceHeight =
        ((pageH - margin * 2) * canvas.width) / imgW;
      while (srcY < canvas.height) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(
          sliceHeight,
          canvas.height - srcY
        );
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
    pdf.save("finanzierung-simple.pdf");
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
        setInput((s) => ({
          kaufpreis: num(d.kaufpreis, s.kaufpreis),
          nebenkostenPct: clamp(
            num(d.nebenkostenPct, s.nebenkostenPct),
            0,
            1
          ),
          eigenkapital: Math.max(
            0,
            num(d.eigenkapital, s.eigenkapital)
          ),
          sollzinsPct: clamp(
            num(d.sollzinsPct, s.sollzinsPct),
            0,
            1
          ),
          tilgungStartPct: clamp(
            num(d.tilgungStartPct, s.tilgungStartPct),
            0,
            1
          ),
          horizontJahre: clamp(
            Math.round(num(d.horizontJahre, s.horizontJahre)),
            1,
            50
          ),
        }));
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", color: "#e6edf3" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="2"/>
                <path d="M10 7V5M10 13V15" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M7 10C7 8.9 8.34 8 10 8C11.66 8 13 8.9 13 10C13 11.1 11.66 12 10 12C8.34 12 7 11.1 7 10Z" stroke="#FCDC45" strokeWidth="1.3" fill="none"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Finanzierungsrechner</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>Wenige Eingaben – klare Monatsrate, Zinsen und Restschuld über die Jahre.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Btn
              label="Glossar"
              variant="ghost"
              onClick={() => setShowGlossary(true)}
            />
            <ExportDropdown onRun={runSelectedExports} />
            {/* Import */}
            <label style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
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

        {/* --- Alles für PDF-Export --- */}
        <div ref={printRef} className="space-y-6">
          {/* 1) Eingaben – direkt am Anfang */}
          <div className="rounded-2xl p-4 space-y-5" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
              Eingaben
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", maxWidth: "48rem", marginBottom: 4 }}>
              Trage zuerst Kaufpreis, Nebenkosten, Eigenkapital und die
              Konditionen deines Kredits ein. Daraus berechnen wir
              Kapitalbedarf, Darlehen, Monatsrate und den Tilgungsverlauf.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NumberField
                label="Kaufpreis (€)"
                value={input.kaufpreis}
                onChange={(v) =>
                  setInput((s) => ({ ...s, kaufpreis: v }))
                }
              />
              <PercentField
                label="Nebenkosten pauschal (%)"
                value={input.nebenkostenPct * 100}
                onChange={(p) =>
                  setInput((s) => ({
                    ...s,
                    nebenkostenPct: clamp(p, 0, 100) / 100,
                  }))
                }
                step={0.1}
                hint="Daumenregel: 8–12 %"
              />
              <NumberField
                label="Eigenkapital (€)"
                value={input.eigenkapital}
                onChange={(v) =>
                  setInput((s) => ({ ...s, eigenkapital: v }))
                }
              />
            </div>

            {eigenkapFehler && (
              <div style={{ fontSize: 11, color: "#f87171" }}>
                Eigenkapital ist höher als der Kapitalbedarf – bitte
                prüfen.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
              <PercentField
                label="Sollzins p.a. (%)"
                value={input.sollzinsPct * 100}
                step={0.01}
                onChange={(p) =>
                  setInput((s) => ({
                    ...s,
                    sollzinsPct: clamp(p, 0, 100) / 100,
                  }))
                }
              />
              <PercentField
                label="anfängliche Tilgung p.a. (%)"
                value={input.tilgungStartPct * 100}
                step={0.01}
                onChange={(p) =>
                  setInput((s) => ({
                    ...s,
                    tilgungStartPct: clamp(p, 0, 100) / 100,
                  }))
                }
              />
              <NumberField
                label="Horizont (Jahre)"
                value={input.horizontJahre}
                onChange={(v) =>
                  setInput((s) => ({
                    ...s,
                    horizontJahre: clamp(Math.round(v), 1, 40),
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-end">
              <KpiPill text={rateBadge.text} color={rateBadge.color} />
            </div>
          </div>

          {/* 2) Kurz erklärt & Info-Kachel */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(15,44,138,0.12)", border: "1px solid rgba(15,44,138,0.25)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.88)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: "#1b2c47", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#FCDC45" }}>
                i
              </span>
              Kurz erklärt
            </div>
            <ul style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", paddingLeft: 4 }}>
              <li>
                <b>Kapitalbedarf</b> = Kaufpreis + pauschale Nebenkosten.
              </li>
              <li>
                <b>Darlehen</b> = Kapitalbedarf – Eigenkapital.
              </li>
              <li>
                <b>Monatsrate</b> ≈ (Sollzins + anf. Tilgung) × Darlehen /
                12.
              </li>
              <li>
                <b>Restschuld</b> sinkt jeden Monat – erst langsam (mehr
                Zinsen), später schneller (mehr Tilgung).
              </li>
            </ul>
          </div>

          {/* 3) KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <KpiCard
              label="Kapitalbedarf"
              value={eur0(kapitalbedarf)}
              hint="Kaufpreis + pauschale NK"
            />
            <KpiCard
              label="Darlehen"
              value={eur0(darlehen)}
              hint="Finanzierungsbedarf nach EK"
            />
            <KpiCard
              label="Monatsrate (Start)"
              value={eur(annuitaetMonat)}
              hint="Annäherung: Zins + anf. Tilgung"
            />
            <KpiCard
              label="Zinsen im 1. Jahr"
              value={eur0(nice(y1?.zinsen ?? 0))}
            />
            <KpiBadge
              label={`LTV ${(ltv * 100).toFixed(0)} %`}
              value={ltvState.label}
              color={ltvState.color}
              hint="Beleihungsauslauf = Darlehen / Kaufpreis"
            />
          </div>

          {/* 4) Schnellstart / Presets */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 8 }}>Schnellstart</div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, maxWidth: "48rem" }}>
              Mit einem Klick typische Finanzierungsszenarien durchspielen.
              Alle Eingaben lassen sich danach weiter anpassen.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Chip
                onClick={() => applyPreset("80")}
                color={COLORS.emerald}
              >
                Beispiel: 80% Finanzierung
              </Chip>
              <Chip
                onClick={() => applyPreset("90")}
                color={COLORS.amber}
              >
                Beispiel: 90% Finanzierung
              </Chip>
              <Chip
                onClick={() => applyPreset("100")}
                color={COLORS.rose}
              >
                Beispiel: 100% (inkl. NK)
              </Chip>
            </div>
          </div>

          {/* 5) Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 8 }}>
                Restschuld (Jahresende)
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={plan.map((r) => ({
                      name: `Y${r.jahr}`,
                      rest: nice(r.restschuld),
                    }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)"
                    />
                    <XAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} dataKey="name" />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <RTooltip
                      formatter={(v: any) => eur0(Number(v))}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e5e7eb",
                      }}
                    />
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

            <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 8 }}>
                Zinsen & Tilgung pro Jahr
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={plan.map((r) => ({
                      name: `Y${r.jahr}`,
                      zins: nice(r.zinsen),
                      tilg: nice(r.tilgung),
                    }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)"
                    />
                    <XAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} dataKey="name" />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <RTooltip
                      formatter={(v: any) => eur0(Number(v))}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e5e7eb",
                      }}
                    />
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
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
                Summe Planung: Zinsen {eur0(nice(totalZins))} · Tilgung{" "}
                {eur0(nice(totalTilg))}
              </div>
            </div>
          </section>

          {/* 6) Tabelle */}
          <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 8 }}>
              Jahresübersicht
            </div>
            <table style={{ width: "100%", fontSize: 13, minWidth: 680, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-2">Jahr</th>
                  <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-2">Kalenderjahr</th>
                  <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-2">Zinsen</th>
                  <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-2">Tilgung</th>
                  <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-2">Summe Raten</th>
                  <th style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11 }} className="py-1 pr-2">Restschuld (Ende)</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((r) => (
                  <tr key={r.jahr} className="border-b last:border-0">
                    <td className="py-1 pr-2">{r.jahr}</td>
                    <td className="py-1 pr-2">{r.kalenderjahr}</td>
                    <td className="py-1 pr-2">
                      {eur0(nice(r.zinsen))}
                    </td>
                    <td className="py-1 pr-2">
                      {eur0(nice(r.tilgung))}
                    </td>
                    <td className="py-1 pr-2">
                      {eur0(nice(r.rateSumme))}
                    </td>
                    <td className="py-1 pr-2">
                      {eur0(nice(r.restschuld))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            Vereinfachtes Modell: konstante Anfangs-Annuität (Sollzins +
            anfängliche Tilgung), nominal p.a.; keine Sondertilgung oder
            Zinswechsel. Keine Finanz- oder Rechtsberatung.
          </p>
        </div>

        {/* Glossar */}
        {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
      </div>
    </div>
  );
}

/* ================================
   UI-Bausteine
==================================*/
function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {hint && <Help title={hint} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function KpiBadge({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
        {label} {hint && <Help title={hint} />}
      </div>
      <div className="mt-1">
        <span
          style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 11, background: hexToRgba(color, 0.12), color }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function KpiPill({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, borderColor: hexToRgba(color, 0.3), background: hexToRgba(color, 0.08), color, border: `1px solid ${hexToRgba(color, 0.3)}` }}
    >
      {text}
    </span>
  );
}

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <svg
        viewBox="0 0 24 24"
        style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="sr-only">Hilfe</span>
    </span>
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
    "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all active:scale-[0.98] h-9";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow",
    secondary: " border  hover:bg-white/10",
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
      style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, background: "transparent", border: `1px solid ${hexToRgba(color, 0.5)}`, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
      onClick={onClick}
    >
      {children}
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
          style={{ width: "100%", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", transition: "all 0.15s", height: 40, boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
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
  hint,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  step?: number;
}) {
  return (
    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block" }}>
      <span className="inline-flex items-center">
        {label}
        {hint && <Help title={hint} />}
      </span>
      <input
        style={{ marginTop: 4, width: "100%", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", height: 40, boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
        type="number"
        step={step}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
      />
      {hint && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          {hint}
        </div>
      )}
    </label>
  );
}

/* Glossar */
function Glossary({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md  shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Glossar</h3>
          <button
            style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <dl style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <GlossTerm term="Kapitalbedarf">
            Kaufpreis plus pauschale Nebenkosten.
          </GlossTerm>
          <GlossTerm term="Darlehen">
            Kapitalbedarf minus Eigenkapital.
          </GlossTerm>
          <GlossTerm term="LTV (Beleihungsauslauf)">
            Verhältnis Darlehen / Kaufpreis. Niedriger ist komfortabler.
          </GlossTerm>
          <GlossTerm term="Sollzins">
            Nominaler Jahreszins deines Kredits.
          </GlossTerm>
          <GlossTerm term="Anfängliche Tilgung">
            Prozentualer Anfangsanteil zur Rückzahlung des Kredits.
          </GlossTerm>
          <GlossTerm term="Monatsrate">
            Annäherung: (Sollzins + anf. Tilgung) × Darlehen / 12.
          </GlossTerm>
          <GlossTerm term="Restschuld">
            Verbleibender Kreditbetrag am Jahresende.
          </GlossTerm>
        </dl>
        <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          Hinweis: vereinfachte Darstellung, keine Finanz- oder
          Rechtsberatung.
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
      <dt style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>{term}</dt>
      <dd className="">{children}</dd>
    </div>
  );
}

/* kleine Helfer */
function num(x: any, fb: number) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}
