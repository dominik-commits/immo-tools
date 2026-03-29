// src/routes/EinfamilienhausCheck.tsx
// Einfamilienhaus-Check (PRO)
// Fokus: einfaches, verständliches Tool für Buy-to-let EFH

import React, { useState } from "react";
import {
  Home,
  RefreshCw,
  Upload,
  Download,
  Gauge,
  Banknote,
  TrendingUp,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PlanGuard from "@/components/PlanGuard";

/* ----------------------------------------------------------------
 *  BRAND COLORS
 * ---------------------------------------------------------------- */

const BRAND = "#0F2C8A";
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

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

/* ----------------------------------------------------------------
 *  SMALL UI HELPERS
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
    <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>
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
        className="mt-1 w-full border rounded-2xl p-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
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
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={0.5}
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
  const rest = Math.max(0, 100 - scorePct);
  const inner = Math.round(size * 0.65);
  const outer = Math.round(size * 0.9);
  return (
    <div
      className="relative"
      style={{ width: size * 2, height: size * 2 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScoreEFH" x1="0" y1="0" x2="1" y2="1">
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
            innerRadius={inner}
            outerRadius={outer}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="url(#gradScoreEFH)" />
            <Cell fill={SURFACE_ALT} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
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
 *  HAUPTKOMPONENTE (mit PlanGuard)
 * ---------------------------------------------------------------- */

export default function EinfamilienhausCheck() {
  return (
    <PlanGuard required="pro">
      <PageInner />
    </PlanGuard>
  );
}

/* ----------------------------------------------------------------
 *  PAGE INNER – kompletter Tool-Content
 * ---------------------------------------------------------------- */

function PageInner() {
  // Basis-Eingaben
  const [kaufpreis, setKaufpreis] = useState(550_000);
  const [jahreskaltmiete, setJahreskaltmiete] = useState(27_000); // 2.250 mtl.
  const [mietausfallPct, setMietausfallPct] = useState(0.05);
  const [nichtUmlagefaehigJahr, setNichtUmlagefaehigJahr] = useState(2_000);
  const [instandhaltungJahr, setInstandhaltungJahr] = useState(3_000);

  const [nkGrEStPct, setNkGrEStPct] = useState(0.065);
  const [nkNotarPct, setNkNotarPct] = useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = useState(0.03);
  const [nkSonstPct, setNkSonstPct] = useState(0);

  // Finanzierung
  const [financingOn, setFinancingOn] = useState(true);
  const [ltvPct, setLtvPct] = useState(0.8);
  const [zinsPct, setZinsPct] = useState(0.042);
  const [laufzeitYears, setLaufzeitYears] = useState(30);

  // Spielwiese
  const [priceAdjPct, setPriceAdjPct] = useState(0);
  const [rentAdjPct, setRentAdjPct] = useState(0);
  const [applyAdjustments, setApplyAdjustments] = useState(true);

  const adjustedPrice = Math.round(kaufpreis * (1 + priceAdjPct));
  const KP = applyAdjustments ? adjustedPrice : kaufpreis;
  const jahresmieteAdj = jahreskaltmiete * (1 + rentAdjPct);

  // Ableitungen
  const mietausfall = jahresmieteAdj * mietausfallPct;
  const mieteEffektiv = jahresmieteAdj - mietausfall;
  const laufendeKostenJahr = nichtUmlagefaehigJahr + instandhaltungJahr;
  const noiJahr = mieteEffektiv - laufendeKostenJahr;

  const loan = financingOn ? KP * ltvPct : 0;
  const annuityYear = financingOn
    ? annuityExact(loan, zinsPct, laufzeitYears)
    : 0;
  const interestY1 = financingOn ? loan * zinsPct : 0;
  const principalY1 = financingOn ? Math.max(0, annuityYear - interestY1) : 0;

  const cashflowJahr = noiJahr - (financingOn ? annuityYear : 0);
  const cashflowMonat = cashflowJahr / 12;

  const noiYield = KP > 0 ? noiJahr / KP : 0;
  const dscr =
    financingOn && annuityYear > 0 ? noiJahr / annuityYear : null;

  const nkPct =
    nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;
  const nkBetrag = Math.round(KP * nkPct);
  const allIn = KP + nkBetrag;

  // Score (Ampel) – EFH eher konservativ
  const score =
    clamp01(scale(noiYield, 0.03, 0.06)) * 0.45 +
    clamp01(scale(dscr ?? 0, 1.1, 1.6)) * 0.35 +
    clamp01(scale(cashflowMonat, 0, 800)) * 0.2;

  const scorePct = Math.round(score * 100);
  const scoreLabel: "BUY" | "CHECK" | "NO" =
    score >= 0.7 ? "BUY" : score >= 0.5 ? "CHECK" : "NO";
  const scoreColor =
    score >= 0.7 ? "#16a34a" : score >= 0.5 ? "#f59e0b" : "#ef4444";

  const decisionLabelText =
    scoreLabel === "BUY"
      ? "Kaufen (unter Vorbehalt)"
      : scoreLabel === "CHECK"
      ? "Weiter prüfen"
      : "Eher Nein";

  let decisionText: string;
  if (scoreLabel === "BUY") {
    decisionText =
      "Miete, laufende Kosten und Finanzierung ergeben ein solides Chance-Risiko-Profil. Unter deinen Annahmen wirkt das Einfamilienhaus als Kapitalanlage tragfähig. Prüfe im Detail Lage, Objektzustand und Mieterbonität, bevor du final zusagst.";
  } else if (scoreLabel === "CHECK") {
    decisionText =
      "Die Kennzahlen liegen im mittleren Bereich. Der Deal kann funktionieren, hängt aber stark von deinen Annahmen zu Miete, Kosten und Instandhaltung ab. Spiele mehrere Szenarien durch und verhandle Preis oder Konditionen nach.";
  } else {
    decisionText =
      "Unter den aktuellen Annahmen ist die Rendite eher schwach oder der Cashflow angespannt. Du solltest hart verhandeln, Alternativen prüfen oder an deinen Annahmen drehen (Miete, Instandhaltung, Tilgung), bevor du dich bindest.";
  }

  const cashflowText =
    cashflowMonat >= 0
      ? `Cashflow mtl. nach Finanzierung: ${eur(
          Math.round(cashflowMonat)
        )} (positiv)`
      : `Cashflow mtl. nach Finanzierung: ${eur(
          Math.round(cashflowMonat)
        )} (negativ)`;

  // Tipps
  const tips: { label: string; detail: string }[] = [];
  if (noiYield < 0.035) {
    tips.push({
      label: "Kaufpreis verhandeln",
      detail:
        "Die Nettomietrendite liegt eher niedrig. Schon 5–10 % weniger Kaufpreis können den Deal deutlich verbessern.",
    });
  }
  if (cashflowMonat < 0) {
    tips.push({
      label: "Tilgung & Zinsstruktur prüfen",
      detail:
        "Ein geringerer Tilgungssatz oder längere Zinsbindung kann deinen monatlichen Cashflow entlasten. Sprich mit der Bank mehrere Varianten durch.",
    });
  }
  if (instandhaltungJahr < 2_000) {
    tips.push({
      label: "Realistische Instandhaltung ansetzen",
      detail:
        "Gerade bei älteren Einfamilienhäusern solltest du genug Puffer für Dach, Heizung und Fassade einplanen. Lieber konservativ kalkulieren.",
    });
  }
  if (!tips.length) {
    tips.push({
      label: "Feintuning",
      detail:
        "Die Kennzahlen wirken insgesamt rund. Über die Spielwiese kannst du gezielt testen, wie sich Kaufpreisnachlass oder höhere Mieten auswirken.",
    });
  }

  // Export-Handler
  function handleExportJSON() {
    const payload = {
      generatedAt: new Date().toISOString(),
      input: {
        kaufpreis: KP,
        jahreskaltmiete,
        mietausfallPct,
        nichtUmlagefaehigJahr,
        instandhaltungJahr,
        nkGrEStPct,
        nkNotarPct,
        nkGrundbuchPct,
        nkMaklerPct,
        nkSonstPct,
        financingOn,
        ltvPct,
        zinsPct,
        laufzeitYears,
        priceAdjPct,
        rentAdjPct,
        applyAdjustments,
      },
      output: {
        jahresmieteAdj,
        mietausfall,
        mieteEffektiv,
        laufendeKostenJahr,
        noiJahr,
        noiYield,
        dscr,
        loan,
        annuityYear,
        interestY1,
        principalY1,
        cashflowJahr,
        cashflowMonat,
        nkPct,
        nkBetrag,
        allIn,
        score,
        scorePct,
        scoreLabel,
      },
    };
    downloadBlob(
      `einfamilienhaus_export_${ts()}.json`,
      "application/json;charset=utf-8",
      JSON.stringify(payload, null, 2)
    );
  }

  function handleExportCSV() {
    const rows: (string | number)[][] = [
      ["Abschnitt", "Feld", "Wert"],
      ["Eingaben", "Kaufpreis (€)", KP],
      ["Eingaben", "Jahreskaltmiete (€)", jahreskaltmiete],
      ["Eingaben", "Mietausfallwagnis", pct(mietausfallPct)],
      ["Eingaben", "Nicht umlagefähige Kosten/Jahr", nichtUmlagefaehigJahr],
      ["Eingaben", "Instandhaltung/Jahr", instandhaltungJahr],
      [],
      ["Nebenkosten", "Grunderwerbsteuer", pct(nkGrEStPct)],
      ["Nebenkosten", "Notar", pct(nkNotarPct)],
      ["Nebenkosten", "Grundbuch", pct(nkGrundbuchPct)],
      ["Nebenkosten", "Makler", pct(nkMaklerPct)],
      ["Nebenkosten", "Sonstiges", pct(nkSonstPct)],
      ["Nebenkosten", "Summe NK (%)", pct(nkPct)],
      ["Nebenkosten", "Summe NK (€)", nkBetrag],
      ["Nebenkosten", "All-in-Kaufpreis", allIn],
      [],
      ["Finanzierung", "Aktiv", financingOn ? "Ja" : "Nein"],
      ["Finanzierung", "LTV", financingOn ? pct(ltvPct) : "-"],
      ["Finanzierung", "Zins p.a.", financingOn ? pct(zinsPct) : "-"],
      ["Finanzierung", "Laufzeit (J)", financingOn ? laufzeitYears : "-"],
      ["Finanzierung", "Darlehen (€)", Math.round(loan)],
      ["Finanzierung", "Annuität/Jahr", Math.round(annuityYear)],
      [],
      ["Ergebnis", "Effektive Jahresmiete", Math.round(mieteEffektiv)],
      ["Ergebnis", "Laufende Kosten/Jahr", laufendeKostenJahr],
      ["Ergebnis", "NOI/Jahr", Math.round(noiJahr)],
      ["Ergebnis", "NOI-Yield", pct(noiYield)],
      ["Ergebnis", "DSCR", dscr ? dscr.toFixed(2) : "-"],
      ["Ergebnis", "Cashflow/Jahr", Math.round(cashflowJahr)],
      ["Ergebnis", "Cashflow/Monat", Math.round(cashflowMonat)],
      ["Ergebnis", "Score (%)", scorePct],
      ["Ergebnis", "Ampel", scoreLabel],
    ];

    const csv =
      rows
        .map((r) =>
          r
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(";")
        )
        .join("\n") + "\n";
    const csvWithBom = "\uFEFF" + csv;
    downloadBlob(
      `einfamilienhaus_export_${ts()}.csv`,
      "text/csv;charset=utf-8",
      csvWithBom
    );
  }

  function handleExportPDF() {
    const html = `
<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Einfamilienhaus – Export</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica Neue,Arial,Noto Sans;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:16px 0 8px}
table{width:100%;border-collapse:collapse} th,td{padding:6px 8px} th{text-align:left}
tr+tr td{border-top:1px solid #eee} .meta{color:#555;font-size:12px;margin-bottom:12px} .right{text-align:right}
.badge{display:inline-block;border:1px solid #ddd;border-radius:9999px;padding:2px 8px;font-size:12px;margin-left:8px}
@media print { a[href]:after{content:""} }
</style></head><body>
<h1>Einfamilienhaus-Check – Export</h1>
<div class="meta">Erstellt am ${new Date().toLocaleString("de-DE")}</div>

<h2>Eingaben</h2>
<table>
<tr><th>Kaufpreis (bewertet)</th><td class="right">${eur(KP)}</td></tr>
<tr><th>Jahreskaltmiete</th><td class="right">${eur(jahreskaltmiete)}</td></tr>
<tr><th>Mietausfallwagnis</th><td class="right">${pct(mietausfallPct)}</td></tr>
<tr><th>Nicht umlagefähige Kosten/Jahr</th><td class="right">${eur(
      nichtUmlagefaehigJahr
    )}</td></tr>
<tr><th>Instandhaltung/Jahr</th><td class="right">${eur(
      instandhaltungJahr
    )}</td></tr>
<tr><th>Kaufnebenkosten gesamt</th><td class="right">${pct(
      nkPct
    )} (${eur(nkBetrag)})</td></tr>
<tr><th>All-in-Kaufpreis</th><td class="right">${eur(allIn)}</td></tr>
<tr><th>Finanzierung</th><td class="right">${
      financingOn
        ? `Ja – LTV ${pct(ltvPct)}, Zins ${pct(zinsPct)}, Laufzeit ${laufzeitYears} J.`
        : "Nein"
    }</td></tr>
</table>

<h2>Ergebnis (Jahr 1)</h2>
<table>
<tr><th>Effektive Jahresmiete</th><td class="right">${eur(
      Math.round(mieteEffektiv)
    )}</td></tr>
<tr><th>Laufende Kosten/Jahr</th><td class="right">${eur(
      laufendeKostenJahr
    )}</td></tr>
<tr><th>NOI/Jahr</th><td class="right">${eur(Math.round(noiJahr))}</td></tr>
<tr><th>NOI-Yield</th><td class="right">${pct(noiYield)}</td></tr>
<tr><th>DSCR</th><td class="right">${dscr ? dscr.toFixed(2) : "–"}</td></tr>
<tr><th>Cashflow/Jahr</th><td class="right">${eur(
      Math.round(cashflowJahr)
    )}</td></tr>
<tr><th>Cashflow/Monat</th><td class="right">${eur(
      Math.round(cashflowMonat)
    )}</td></tr>
<tr><th>Score</th><td class="right">${scorePct} % (${scoreLabel})</td></tr>
</table>
</body></html>
    `.trim();

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        try {
          w.print();
        } catch {
          // ignore
        }
      }, 200);
    }
  }

  function runSelectedExports(opts: {
    json: boolean;
    csv: boolean;
    pdf: boolean;
  }) {
    if (opts.json) handleExportJSON();
    if (opts.csv) handleExportCSV();
    if (opts.pdf) handleExportPDF();
  }

  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setKaufpreis(num(d.kaufpreis, kaufpreis));
        setJahreskaltmiete(num(d.jahreskaltmiete, jahreskaltmiete));
        setMietausfallPct(num(d.mietausfallPct, mietausfallPct));
        setNichtUmlagefaehigJahr(
          num(d.nichtUmlagefaehigJahr, nichtUmlagefaehigJahr)
        );
        setInstandhaltungJahr(
          num(d.instandhaltungJahr, instandhaltungJahr)
        );
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
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  /* ---------------- Render ---------------- */

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: SURFACE }}
    >
      {/* Inhalt mit extra Bottom-Padding für den Sticky Footer */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-40">
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
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Einfamilienhaus-Check
              </h1>
              <p className="text-muted-foreground text-sm">
                Schnelle Einschätzung, ob sich ein Einfamilienhaus als Kapitalanlage lohnt –
                mit Fokus auf Cashflow, Rendite und Bankfähigkeit.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Trage Kaufpreis, Miete, laufende Kosten und Finanzierung ein. Score, Ampel
                und Cashflow zeigen dir, ob der Deal eher Richtung „kaufen“, „weiter
                prüfen“ oder „eher lassen“ geht.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-card border hover:shadow transition"
              onClick={() => {
                setKaufpreis(550_000);
                setJahreskaltmiete(27_000);
                setMietausfallPct(0.05);
                setNichtUmlagefaehigJahr(2_000);
                setInstandhaltungJahr(3_000);
                setNkGrEStPct(0.065);
                setNkNotarPct(0.015);
                setNkGrundbuchPct(0.005);
                setNkMaklerPct(0.03);
                setNkSonstPct(0);
                setFinancingOn(true);
                setLtvPct(0.8);
                setZinsPct(0.042);
                setLaufzeitYears(30);
                setPriceAdjPct(0);
                setRentAdjPct(0);
                setApplyAdjustments(true);
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

        {/* 2-Spalten-Layout: Main + Glossar */}
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
                  Starte mit Kaufpreis, Miete und laufenden Kosten. Optional kannst du die
                  Finanzierung aktivieren. Alle Kennzahlen berechnen sich live.
                </p>
              </div>

              {/* Kaufpreis & Miete */}
              <InputCard
                title="Kaufpreis & Miete"
                subtitle="Was kostet das Haus und was kommt an Miete rein?"
                description="Hier legst du den Einstiegspreis und die Nettokaltmiete fest. Daraus berechnen wir die effektive Jahresmiete nach Mietausfall und den Netto-Mietertrag."
              >
                <NumberField
                  label="Kaufpreis des Einfamilienhauses (€)"
                  value={kaufpreis}
                  onChange={setKaufpreis}
                  help="Kaufpreis für das Haus ohne Nebenkosten (Notar, Steuer, Makler)."
                />
                <NumberField
                  label="Jahreskaltmiete (€)"
                  value={jahreskaltmiete}
                  onChange={setJahreskaltmiete}
                  help="Gesamte Nettokaltmiete pro Jahr (Miete pro Monat × 12)."
                />
                <PercentField
                  label="Mietausfallwagnis (Leerstand, Ausfall, etc.)"
                  value={mietausfallPct}
                  onChange={setMietausfallPct}
                  help="Konservative Annahme für Leerstand, Zahlungsausfälle und nicht gezahlte Miete."
                />
              </InputCard>

              {/* Laufende Kosten & NK */}
              <InputCard
                title="Laufende Kosten & Nebenkosten"
                subtitle="Was bleibt realistisch an dir hängen?"
                description="Berücksichtige alle Kosten, die du als Eigentümer selbst tragen musst – plus die einmaligen Kaufnebenkosten."
              >
                <NumberField
                  label="Nicht umlagefähige Kosten/Jahr (€)"
                  value={nichtUmlagefaehigJahr}
                  onChange={setNichtUmlagefaehigJahr}
                  help="Verwaltung, Versicherungen, Teile der Grundsteuer oder sonstige Kosten, die du nicht auf den Mieter umlegen kannst."
                />
                <NumberField
                  label="Instandhaltungspuffer/Jahr (€)"
                  value={instandhaltungJahr}
                  onChange={setInstandhaltungJahr}
                  help="Rücklage für Reparaturen, Modernisierung, Dach, Heizung etc."
                />
                <PercentField
                  label="Grunderwerbsteuer (%)"
                  value={nkGrEStPct}
                  onChange={setNkGrEStPct}
                  help="Je nach Bundesland meist 3,5–6,5 %."
                />
                <PercentField
                  label="Notar & Grundbuch (zusammen, % vom Kaufpreis)"
                  value={nkNotarPct + nkGrundbuchPct}
                  onChange={(v) => {
                    // simple Aufteilung 2/3 Notar, 1/3 Grundbuch
                    setNkNotarPct(v * (2 / 3));
                    setNkGrundbuchPct(v * (1 / 3));
                  }}
                  help="Typisch ca. 1,5–2 % vom Kaufpreis."
                />
                <PercentField
                  label="Maklercourtage (% vom Kaufpreis)"
                  value={nkMaklerPct}
                  onChange={setNkMaklerPct}
                  help="Nur falls Makler im Spiel ist."
                />
              </InputCard>

              {/* Finanzierung */}
              <InputCard
                title="Finanzierung"
                subtitle="Wie viel Kredit, zu welchen Konditionen?"
                description="Wenn du die Finanzierung aktivierst, berechnen wir automatisch die jährliche Kreditrate (Annuität) und zeigen dir DSCR und Cashflow nach Finanzierung."
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={financingOn}
                      onChange={(e) => setFinancingOn(e.target.checked)}
                    />
                    Finanzierung berücksichtigen
                  </label>
                  <span className="text-xs text-muted-foreground text-right max-w-xs">
                    Kreditrate ergibt sich aus Darlehenshöhe, Zinssatz und Laufzeit. Du
                    trägst nur die Parameter ein.
                  </span>
                </div>
                {financingOn && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <PercentField
                      label="Fremdkapitalanteil (LTV, % vom Kaufpreis)"
                      value={ltvPct}
                      onChange={setLtvPct}
                    />
                    <PercentField
                      label="Sollzins p.a. (%)"
                      value={zinsPct}
                      onChange={setZinsPct}
                      step={0.001}
                    />
                    <NumberField
                      label="Laufzeit des Kredits (Jahre)"
                      value={laufzeitYears}
                      step={1}
                      onChange={setLaufzeitYears}
                    />
                  </div>
                )}
              </InputCard>

              {/* Spielwiese */}
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Profit-Spielwiese: Preis & Miete testen
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Spiele durch, wie sich dein Deal verändert, wenn du den Kaufpreis
                      herunterhandelst oder von anderen Mieten ausgehst. Die Auswirkungen
                      siehst du sofort im Zwischenstand.
                    </p>
                  </div>
                  <label className="text-xs text-foreground inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyAdjustments}
                      onChange={(e) => setApplyAdjustments(e.target.checked)}
                    />
                    Anpassungen in der Bewertung berücksichtigen
                  </label>
                </div>

                <div className="space-y-4">
                  <SliderRow
                    label="Kaufpreis-Anpassung"
                    value={priceAdjPct}
                    min={-0.25}
                    max={0.25}
                    step={0.01}
                    right={`${signedPct(priceAdjPct)} = ${eur(adjustedPrice)}`}
                    onChange={setPriceAdjPct}
                  />
                  <SliderRow
                    label="Miete-Anpassung (Jahreskaltmiete)"
                    value={rentAdjPct}
                    min={-0.25}
                    max={0.25}
                    step={0.01}
                    right={`${signedPct(rentAdjPct)} = ${eur(
                      Math.round(jahresmieteAdj)
                    )}`}
                    onChange={setRentAdjPct}
                  />
                </div>
              </Card>
            </section>

            {/* Zwischenstand & Empfehlung */}
            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Zwischenstand & Empfehlung
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Hier siehst du auf einen Blick, wie dein Einfamilienhaus-Deal aktuell
                  dasteht: Score, Ampel, Cashflow und Rendite zusammengefasst inklusive
                  konkreter Hebel.
                </p>
              </div>

              <EinfamilienhausDecisionSummary
                scorePct={scorePct}
                scoreLabel={scoreLabel}
                scoreColor={scoreColor}
                decisionLabelText={decisionLabelText}
                decisionText={decisionText}
                cashflowText={cashflowText}
                noiJahr={noiJahr}
                annuityYear={annuityYear}
                allIn={allIn}
                tips={tips}
              />
            </section>

            {/* Ergebnisse & Details */}
            <section className="space-y-6 pt-4">
              <h2 className="text-sm font-semibold text-foreground">
                Ergebnisse & Details
              </h2>

              {/* Kostenaufteilung */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">
                  Einnahmen & laufende Kosten im ersten Jahr
                </div>
                <p className="text-xs text-muted-foreground mb-2 max-w-xl">
                  Wie verteilt sich der Kuchen im ersten Jahr? Die Grafik zeigt dir, wie
                  viel von der Miete wirklich bei dir ankommt.
                </p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Effektive Miete", value: mieteEffektiv },
                          {
                            name: "Laufende Kosten",
                            value: laufendeKostenJahr,
                          },
                          { name: "NOI", value: Math.max(noiJahr, 0) },
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={BRAND} />
                        <Cell fill={CTA} />
                        <Cell fill={ORANGE} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  NOI (Net Operating Income) ist der Netto-Mietertrag nach laufenden
                  Kosten und Instandhaltung, aber vor Finanzierung.
                </p>
              </Card>

              {/* NK-Detail */}
              <Card>
                <div className="text-sm font-medium mb-2 text-foreground">
                  Kaufnebenkosten – dein echter Einstieg
                </div>
                <p className="text-xs text-muted-foreground mb-2 max-w-xl">
                  Neben dem Kaufpreis fallen einmalige Nebenkosten an. Diese erhöhen deinen
                  effektiven Einstieg und sollten bei der Rendite immer mitgedacht werden.
                </p>
                <ul className="text-sm text-foreground space-y-1">
                  <li>
                    Grunderwerbsteuer: {pct(nkGrEStPct)} ={" "}
                    {eur(Math.round(KP * nkGrEStPct))}
                  </li>
                  <li>
                    Notar: {pct(nkNotarPct)} ={" "}
                    {eur(Math.round(KP * nkNotarPct))}
                  </li>
                  <li>
                    Grundbuch: {pct(nkGrundbuchPct)} ={" "}
                    {eur(Math.round(KP * nkGrundbuchPct))}
                  </li>
                  <li>
                    Makler: {pct(nkMaklerPct)} ={" "}
                    {eur(Math.round(KP * nkMaklerPct))}
                  </li>
                  {nkSonstPct > 0 && (
                    <li>
                      Sonstiges/Puffer: {pct(nkSonstPct)} ={" "}
                      {eur(Math.round(KP * nkSonstPct))}
                    </li>
                  )}
                  <li className="mt-2">
                    <b>Summe Nebenkosten</b>: {pct(nkPct)} ={" "}
                    <b>{eur(nkBetrag)}</b>
                  </li>
                  <li className="text-xs text-muted-foreground pt-1">
                    <b>All-in-Kaufpreis</b> = Kaufpreis + Nebenkosten ={" "}
                    <b>{eur(allIn)}</b>.
                  </li>
                </ul>
              </Card>
            </section>
          </div>

          {/* Glossar Sidebar */}
          <aside className="hidden xl:block space-y-4 sticky top-6 h-fit">
            <Card>
              <h3 className="text-sm font-semibold">Glossar – kurz erklärt</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <b>Jahreskaltmiete</b> – Nettokaltmiete aller Wohnungen im Jahr,
                  ohne Nebenkosten.
                </li>
                <li>
                  <b>Mietausfallwagnis</b> – Puffer für Leerstand und
                  Zahlungsausfälle.
                </li>
                <li>
                  <b>NOI (Net Operating Income)</b> – Netto-Mietertrag nach laufenden
                  Kosten und Instandhaltung, vor Finanzierung.
                </li>
                <li>
                  <b>NOI-Yield</b> – NOI im Verhältnis zum Kaufpreis (NOI ÷ Kaufpreis).
                </li>
                <li>
                  <b>DSCR</b> – Verhältnis von NOI zur jährlichen Kreditrate. Ab ca.
                  1,1–1,2 aufwärts wird es für Banken interessant.
                </li>
                <li>
                  <b>Cashflow</b> – Geld, das nach allen Kosten und der Rate übrig
                  bleibt bzw. fehlt.
                </li>
                <li>
                  <b>All-in-Kaufpreis</b> – Kaufpreis plus Nebenkosten. Das ist dein
                  realer Einstieg.
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
                  <span className="text-[11px] text-muted-foreground">
                    (live)
                  </span>
                </div>
                <div className="text-sm font-semibold truncate text-foreground">
                  Entscheidung: {decisionLabelText}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    text={eur(Math.round(cashflowMonat)) + " mtl."}
                    hint="Cashflow (Y1) nach Finanzierung"
                  />
                  <Badge
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    text={`NOI-Yield ${pct(noiYield)}`}
                    hint="NOI / Kaufpreis"
                  />
                  <Badge
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    text={dscr ? dscr.toFixed(2) : "–"}
                    hint="DSCR (Y1)"
                  />
                </div>
              </div>

              {/* Rechts: Score-Donut */}
              <ScoreDonut
                scorePct={scorePct}
                scoreColor={scoreColor}
                label={scoreLabel}
                size={42}
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
 *  Entscheidungs-Komponente
 * ---------------------------------------------------------------- */

function EinfamilienhausDecisionSummary({
  scorePct,
  scoreLabel,
  scoreColor,
  decisionLabelText,
  decisionText,
  cashflowText,
  noiJahr,
  annuityYear,
  allIn,
  tips,
}: any) {
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
          <div className="text-lg font-semibold">
            {decisionLabelText}
          </div>

          <div className="text-sm opacity-90 max-w-xl">
            {decisionText}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div>{cashflowText}</div>
            <div>
              Jährlicher Netto-Mietertrag (NOI): {eur(Math.round(noiJahr))}
            </div>
            {annuityYear > 0 && (
              <div>
                Jährliche Kreditrate (inkl. Zins & Tilgung):{" "}
                {eur(Math.round(annuityYear))}
              </div>
            )}
            <div>
              All-in-Kaufpreis (inkl. NK): {eur(Math.round(allIn))}
            </div>
            <div className="text-xs opacity-80 pt-1">
              NOI = Netto-Mietertrag nach laufenden Kosten und
              Instandhaltung, vor Finanzierung.
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

      {/* Hebel */}
      <div className="mt-4">
        <div className="text-xs opacity-80 mb-1">
          Schnelle Hebel für diesen Deal
        </div>
        <ul className="text-sm space-y-2">
          {tips.map((t: any, i: number) => (
            <li key={i}>
              <b>{t.label}:</b> {t.detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  SliderRow
 * ---------------------------------------------------------------- */

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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {right && <span>{right}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

/* ----------------------------------------------------------------
 *  ANNUNITY HELPER
 * ---------------------------------------------------------------- */

function annuityExact(loan: number, r: number, years: number) {
  if (loan <= 0 || r <= 0 || years <= 0) return 0;
  const n = Math.round(years);
  const ann = (loan * r) / (1 - Math.pow(1 + r, -n));
  return ann;
}
