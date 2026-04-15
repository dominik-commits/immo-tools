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
import PlanGuard from "@/components/PlanGuard";

/* ----------------------------------------------------------------
 *  BRAND COLORS
 * ---------------------------------------------------------------- */

const BRAND = "#0F2C8A";
const CTA = "#FCDC45";
const ORANGE = "#ff914d";
const SURFACE = "#0d1117";
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
    <div className={`rounded-2xl border p-4  ${className}`}>{children}</div>
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
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px]  "
      title={hint}
    >
      {icon} {text}
    </span>
  );
}

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <div className="text-sm font-medium flex items-center gap-1" style={{ color: "rgba(255,255,255,0.6)" }}>
      <span>{label}</span>
      {help && <Help title={help} />}
    </div>
  );
}

function InputBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide" style={{ background: "rgba(252,220,69,0.12)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.25)" }}>EINGABE</span>
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
    <div className="rounded-2xl p-5" style={{ background: "rgba(252,220,69,0.03)", border: "1px solid rgba(252,220,69,0.12)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.88)" }}>{title}</div>
          {subtitle && (
            <div className="text-xs ">{subtitle}</div>
          )}
          {description && (
            <p className="text-xs mt-1 max-w-xl leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
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
  const [focused, setFocused] = React.useState(false);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
  const displayValue = focused
    ? String(rawValue)
    : rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type={focused ? "number" : "text"}
          step={step}
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")))}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        {suffix && <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{suffix}</span>}
      </div>
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
        <span className="w-24 text-right tabular-nums ">
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
  const r = size * 0.9;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(scorePct, 100)) * circ / 100;
  const cx = size;
  const cy = size;
  return (
    <div style={{ position: "relative", width: size * 2, height: size * 2 }}>
      <svg width={size * 2} height={size * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={Math.round(size * 0.18)} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={scoreColor} strokeWidth={Math.round(size * 0.18)}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: size * 0.45, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{scorePct}%</div>
        <div style={{ fontSize: size * 0.22, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

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
        <Download className="h-4 w-4" /> Export <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 220, background: "#161b22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Formate wählen</div>
          {[["JSON", json, setJson], ["CSV", csv, setCsv], ["PDF", pdf, setPdf]].map(([label, val, set]) => (
            <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
              <input type="checkbox" checked={val as boolean} onChange={e => (set as any)(e.target.checked)} />{label as string}
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "6px", borderRadius: 8, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Abbrechen</button>
            <button onClick={run} style={{ flex: 1, padding: "6px", borderRadius: 8, fontSize: 12, background: "#FCDC45", color: "#111", fontWeight: 600, border: "none", cursor: "pointer" }}>Export</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
 *  HAUPTKOMPONENTE (mit PlanGuard)
 * ---------------------------------------------------------------- */

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const short = text.length > 90;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
        {expanded || !short ? text : text.slice(0, 90) + "…"}
      </div>
      {short && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ marginTop: 4, fontSize: 10, color: "rgba(252,220,69,0.7)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 3 }}
        >
          {expanded ? "▲ Weniger" : "▼ Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

type ViewMode = "einfach" | "erweitert";

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
  const MODE_KEY = "efh.mode.v1";
  const [mode, setMode] = useState<ViewMode>(() => {
    try { const raw = localStorage.getItem(MODE_KEY); return raw === "erweitert" ? "erweitert" : "einfach"; }
    catch { return "einfach"; }
  });
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);

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
  const [pdfLoading, setPdfLoading] = useState(false);

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
<title>Einfamilienhaus-Rendite – Export</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica Neue,Arial,Noto Sans;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:16px 0 8px}
table{width:100%;border-collapse:collapse} th,td{padding:6px 8px} th{text-align:left}
tr+tr td{border-top:1px solid #eee} .meta{color:#555;font-size:12px;margin-bottom:12px} .right{text-align:right}
.badge{display:inline-block;border:1px solid #ddd;border-radius:9999px;padding:2px 8px;font-size:12px;margin-left:8px}
@media print { a[href]:after{content:""} }
</style></head><body>
<h1>Einfamilienhaus-Rendite – Export</h1>
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

async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  if (!f) return;
  e.target.value = "";
  const name = f.name.toLowerCase();
  const isPdf = f.type === "application/pdf" || name.endsWith(".pdf");
  const isJson = f.type === "application/json" || name.endsWith(".json");

  if (isPdf) {
    try {
      setPdfLoading(true);
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/import-expose-mfh", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Import fehlgeschlagen");
      const inp = json.data?.input ?? json.data ?? {};
      setKaufpreis(num(inp.kaufpreis, kaufpreis));
      if (inp.kaltmieteJahr) setJahreskaltmiete(num(inp.kaltmieteJahr, jahreskaltmiete));
      if (inp.leerstandPct) setMietausfallPct(num(inp.leerstandPct, mietausfallPct));
      if (typeof inp.bundesland === "string") {
        const presets: Record<string, number> = {
          "Baden-Württemberg": 0.05, "Bayern": 0.035, "Berlin": 0.06,
          "Brandenburg": 0.065, "Bremen": 0.05, "Hamburg": 0.055,
          "Hessen": 0.06, "Mecklenburg-Vorpommern": 0.06, "Niedersachsen": 0.05,
          "Nordrhein-Westfalen": 0.065, "Rheinland-Pfalz": 0.05,
          "Saarland": 0.065, "Sachsen": 0.035, "Sachsen-Anhalt": 0.05,
          "Schleswig-Holstein": 0.065, "Thüringen": 0.065,
        };
        if (presets[inp.bundesland]) setNkGrEStPct(presets[inp.bundesland]);
      }
    } catch (err) {
      console.error(err);
      alert("PDF-Import fehlgeschlagen. Bitte prüfe das Exposé oder nutze eine JSON-Datei.");
    } finally {
      setPdfLoading(false);
    }
    return;
  }

  if (isJson) {
    importJson(f);
    return;
  }

  alert("Dieses Dateiformat wird nicht unterstützt. Bitte JSON oder PDF hochladen.");
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
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 120px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M2 9L10 2L18 9V18H13.5V13.5H6.5V18H2V9Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="8" y="14.5" width="4" height="3.5" fill="#FCDC45" rx="0.5"/>
                <path d="M13 5V3H15V7" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e6edf3", margin: 0 }}>Einfamilienhaus-Rendite</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>Kaufpreis, Miete & Finanzierung eingeben – sofort sehen ob sich das EFH lohnt</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setMode("einfach")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "einfach" ? "#FCDC45" : "transparent", color: mode === "einfach" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Einfach</button>
              <button onClick={() => setMode("erweitert")} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: mode === "erweitert" ? "#FCDC45" : "transparent", color: mode === "erweitert" ? "#0d1117" : "rgba(255,255,255,0.5)" }}>Erweitert</button>
            </div>
            <ExportDropdown onRun={(opts) => { if (opts.json) handleExportJSON(); if (opts.csv) handleExportCSV(); }} />
            <label style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }} className={pdfLoading ? "opacity-60 pointer-events-none" : ""}>
              {pdfLoading ? (<><svg className="animate-spin" style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75"/></svg> Wird gelesen…</>) : (<><Upload size={14} /> Import</>)}
              <input type="file" className="hidden" accept=".json,application/json,.pdf,application/pdf" onChange={handleImport} disabled={pdfLoading} />
            </label>
          </div>
        </div>

        {/* Zwei-Spalten */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* LINKS: Eingaben */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Schritt 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 1 — Kaufpreis & Kosten</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Kaufpreis & Nebenkosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was kostet dich der Kauf insgesamt?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} step={1000} />
                <PercentField label="Grunderwerbsteuer" value={nkGrEStPct} onChange={setNkGrEStPct} />
                <PercentField label="Notar" value={nkNotarPct} onChange={setNkNotarPct} />
                <PercentField label="Grundbuch" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} />
                <PercentField label="Makler" value={nkMaklerPct} onChange={setNkMaklerPct} />
                {mode === "erweitert" && <PercentField label="Sonstiges/Puffer" value={nkSonstPct} onChange={setNkSonstPct} />}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Nebenkosten: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(nkBetrag)}</strong> · All-in: <strong style={{ color: "#FCDC45" }}>{eur(allIn)}</strong>
              </div>
            </div>

            {/* Schritt 2 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 2 — Miete & laufende Kosten</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Miete & laufende Kosten</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Was bringt das EFH an Einnahmen?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NumberField label="Jahreskaltmiete (€)" value={jahreskaltmiete} onChange={setJahreskaltmiete} step={100} />
                <PercentField label="Mietausfallwagnis" value={mietausfallPct} onChange={setMietausfallPct} help="Puffer für Leerstand und Zahlungsausfälle" />
                <NumberField label="Nicht-umlagef. Kosten p.a. (€)" value={nichtUmlagefaehigJahr} onChange={setNichtUmlagefaehigJahr} step={100} />
                <NumberField label="Instandhaltung p.a. (€)" value={instandhaltungJahr} onChange={setInstandhaltungJahr} step={100} />
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Effektivmiete: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(mieteEffektiv))}/Jahr</strong> · NOI: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(noiJahr))}/Jahr</strong>
              </div>
            </div>

            {/* Schritt 3 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Schritt 3 — Finanzierung</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(252,220,69,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Finanzierung</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Optional — wie finanzierst du?</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "rgba(252,220,69,0.1)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.2)" }}>EINGABE</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", marginBottom: 14 }}>
                <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                Finanzierung einbeziehen
              </label>
              {financingOn && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <PercentField label="Beleihungsquote (LTV)" value={ltvPct} onChange={setLtvPct} />
                  <PercentField label="Zinssatz p.a." value={zinsPct} onChange={setZinsPct} step={0.05} />
                  <NumberField label="Laufzeit (Jahre)" value={laufzeitYears} onChange={setLaufzeitYears} step={1} />
                </div>
              )}
              {financingOn && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  Darlehen: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{eur(Math.round(loan))}</strong> · Annuität: <strong style={{ color: "#FCDC45" }}>{eur(Math.round(annuityYear))}/Jahr</strong> ({eur(Math.round(annuityYear/12))}/Monat)
                </div>
              )}
            </div>

            {/* Spielwiese */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Was-wäre-wenn Spielwiese</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <style>{`.efh-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}.efh-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FCDC45;cursor:pointer;box-shadow:0 0 0 3px rgba(252,220,69,0.2)}.efh-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FCDC45;border:none}`}</style>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Preis & Miete anpassen</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Änderungen wirken live auf Score</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Kaufpreis anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: priceAdjPct < 0 ? "#4ade80" : priceAdjPct > 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}>{signedPct(priceAdjPct)}</span>
                  </div>
                  <input type="range" min={-0.3} max={0.3} step={0.005} value={priceAdjPct} onChange={(e) => setPriceAdjPct(Number(e.target.value))} className="efh-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+30%</span></div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Miete anpassen</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rentAdjPct > 0 ? "#4ade80" : rentAdjPct < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}>{signedPct(rentAdjPct)}</span>
                  </div>
                  <input type="range" min={-0.3} max={0.5} step={0.005} value={rentAdjPct} onChange={(e) => setRentAdjPct(Number(e.target.value))} className="efh-range" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.2)" }}><span>−30%</span><span>0</span><span>+50%</span></div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                  <input type="checkbox" checked={applyAdjustments} onChange={(e) => setApplyAdjustments(e.target.checked)} style={{ accentColor: "#FCDC45" }} />
                  Anpassungen in Bewertung berücksichtigen
                </label>
              </div>
            </div>

            {/* Erweiterte Parameter */}
            {mode === "erweitert" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Erweiterte Parameter</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 14 }}>Projektion & Bewertung</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <NumberField label="Mietsteigerung p.a. (%)" value={1} onChange={() => {}} step={0.1} />
                    <NumberField label="Kostensteigerung p.a. (%)" value={1.5} onChange={() => {}} step={0.1} />
                    <PercentField label="Cap Rate (Modellwert)" value={0.045} onChange={() => {}} step={0.0005} />
                  </div>
                </div>
              </>
            )}

            {/* Detailberechnungen */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Detailberechnungen</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Cashflow */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Monatliche Cashflow-Aufschlüsselung</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Effektive Nettokaltmiete", value: Math.round(mieteEffektiv / 12), positive: true },
                  { label: "Nicht-umlagef. Kosten", value: -Math.round(nichtUmlagefaehigJahr / 12), positive: false },
                  { label: "Instandhaltung", value: -Math.round(instandhaltungJahr / 12), positive: false },
                  ...(financingOn ? [{ label: "Zins + Tilgung", value: -Math.round(annuityYear / 12), positive: false }] : []),
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.positive ? "#4ade80" : "#f87171" }}>{row.positive ? "+" : ""}{eur(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: cashflowMonat >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, border: `1px solid ${cashflowMonat >= 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>= Cashflow pro Monat</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: cashflowMonat >= 0 ? "#4ade80" : "#f87171" }}>{eur(Math.round(cashflowMonat))}</span>
                </div>
              </div>
            </div>

            {/* Break-even & NK */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Kennzahlen</div>
                {[
                  { label: "Nettomietrendite", value: pct(noiYield), color: noiYield >= 0.05 ? "#4ade80" : noiYield >= 0.03 ? "#FCDC45" : "#f87171" },
                  { label: "DSCR", value: dscr ? dscr.toFixed(2) : "–", color: dscr && dscr >= 1.2 ? "#4ade80" : dscr && dscr >= 1.0 ? "#FCDC45" : "#f87171" },
                  { label: "NOI p.a.", value: eur(Math.round(noiJahr)), color: "rgba(255,255,255,0.75)" },
                  { label: "All-in Kaufpreis", value: eur(allIn), color: "rgba(255,255,255,0.75)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Kaufnebenkosten</div>
                {[
                  { label: "Grunderwerbsteuer", value: Math.round(KP * nkGrEStPct) },
                  { label: "Notar", value: Math.round(KP * nkNotarPct) },
                  { label: "Grundbuch", value: Math.round(KP * nkGrundbuchPct) },
                  { label: "Makler", value: Math.round(KP * nkMaklerPct) },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{eur(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, background: "rgba(252,220,69,0.05)", borderRadius: 8, border: "1px solid rgba(252,220,69,0.12)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Summe NK</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#FCDC45" }}>{eur(nkBetrag)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RECHTS: Ergebnis sticky */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ borderRadius: 16, padding: 20, background: "linear-gradient(135deg, rgba(15,44,138,0.85) 0%, rgba(124,58,237,0.65) 100%)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Dein Ergebnis (live)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7"
                      strokeDasharray={`${Math.round(201 * scorePct / 100)} 201`} strokeLinecap="round"/>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{scorePct}%</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Score</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Empfehlung</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: scoreLabel === "BUY" ? "#4ade80" : scoreLabel === "CHECK" ? "#FCDC45" : "#f87171", lineHeight: 1.1 }}>{decisionLabelText}</div>
                  <ExpandableText text={decisionText} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cashflow/Monat", value: eur(Math.round(cashflowMonat)), good: cashflowMonat >= 200, okay: cashflowMonat >= 0 },
                  { label: "Rendite (NOI)", value: pct(noiYield), good: noiYield >= 0.05, okay: noiYield >= 0.03 },
                  { label: "Schuldendeckung", value: dscr ? dscr.toFixed(2) : "–", good: !!dscr && dscr >= 1.2, okay: !!dscr && dscr >= 1.0 },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{kpi.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{kpi.value}</div>
                    <div style={{ marginTop: 6, display: "inline-block", padding: "2px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: kpi.good ? "rgba(74,222,128,0.15)" : kpi.okay ? "rgba(252,220,69,0.15)" : "rgba(248,113,113,0.15)", color: kpi.good ? "#4ade80" : kpi.okay ? "#FCDC45" : "#f87171" }}>
                      {kpi.good ? "Gut" : kpi.okay ? "Okay" : "Niedrig"}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: scoreColor, borderRadius: 2 }} />
              </div>
            </div>

            {/* Tipps */}
            {tips.length > 0 && (
              <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Schnelle Hebel</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tips.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "rgba(252,220,69,0.04)", borderRadius: 10, border: "1px solid rgba(252,220,69,0.1)" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FCDC45", flexShrink: 0, marginTop: 4 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{tip.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.5 }}>{tip.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Glossar */}
            <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Was bedeutet das?</div>
              {[
                { term: "Rendite (NOI)", def: "Dein Jahresgewinn aus Miete geteilt durch den Kaufpreis. Ziel: über 5%." },
                { term: "Cashflow", def: "Was nach Kosten & Kreditrate monatlich übrig bleibt. Positiv = gut." },
                { term: "DSCR", def: "Wie gut die Mieteinnahmen die Kreditrate decken. Über 1,2 ist solide." },
                { term: "All-in-Preis", def: "Kaufpreis + Nebenkosten. Was du wirklich bezahlst." },
              ].map((g) => (
                <div key={g.term} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{g.term}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.5 }}>{g.def}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 12px" }}>
          <div style={{ background: "rgba(13,17,23,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, backdropFilter: "blur(20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Ergebnis (live)</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>{decisionLabelText}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  {[
                    { label: `${eur(Math.round(cashflowMonat))} mtl.` },
                    { label: `Rendite ${pct(noiYield)}` },
                    { label: `DSCR ${dscr ? dscr.toFixed(2) : "–"}` },
                  ].map((b) => (
                    <span key={b.label} style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 20, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{b.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", width: 50, height: 50, flexShrink: 0 }}>
                <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
                  <circle cx="25" cy="25" r="20" fill="none" stroke={scoreColor} strokeWidth="5"
                    strokeDasharray={`${Math.round(125.6 * scorePct / 100)} 125.6`} strokeLinecap="round"/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{scorePct}%</span>
                </div>
              </div>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(4, scorePct)}%`, background: scoreColor }} />
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
      style={{ background: "linear-gradient(135deg, rgba(15,44,138,0.9) 0%, rgba(124,58,237,0.7) 100%)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "16px" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs opacity-80">
            Zwischenstand (auf Basis deiner Eingaben)
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
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
      <div className="flex items-center justify-between text-xs ">
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
