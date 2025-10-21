// src/routes/Finanzierung.tsx
// v1.3 – Preset-Bugfix (Chips), kleine UI-Politur
import React, { useEffect, useMemo, useState } from "react";
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

/* ================================
   Farb-Palette & kleine Helpers
==================================*/
const COLORS = {
  primary: "#2563eb",      // Blau
  indigo: "#4f46e5",
  emerald: "#10b981",
  emeraldSoft: "#86efac",
  amber: "#f59e0b",
  amberSoft: "#fde68a",
  rose: "#f43f5e",
  slate: "#64748b",
  slateLight: "#94a3b8",
};

const eur0 = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const nice = (n: number) => Math.round(n);

/* ================================
   Types
==================================*/
type JahresRow = {
  year: number;              // 1..H
  kalenderjahr: number;
  zins: number;              // Summe Zinsen im Jahr
  tilgung: number;           // planmäßige Tilgung
  sonder: number;            // Sondertilgung (optional, hier 0 – reserviert)
  rateSum: number;           // Summe Monatsraten
  restschuld: number;        // Ende Jahr
};

type Input = {
  // Kauf & Nebenkosten
  kaufpreis: number;
  grunderwerbPct: number; // 0..1
  notarPct: number;       // 0..1
  maklerPct: number;      // 0..1
  sonstKosten: number;

  eigenkapital: number;

  // Darlehen
  zinsSollPct: number;      // p.a. nominal 0..1
  tilgungStartPct: number;  // anfängliche Tilgung p.a. 0..1
  zinsbindungJahre: number; // nur Info-KPI

  // Planung
  laufzeitJahre: number;    // Gesamthorizont
};

const DRAFT_KEY = "finance.tool.v1.3";

/* ================================
   Component
==================================*/
export default function Finanzierung() {
  const [input, setInput] = useState<Input>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as Input;
    } catch {}
    return {
      kaufpreis: 400_000,
      grunderwerbPct: 0.05,
      notarPct: 0.015,
      maklerPct: 0.0,
      sonstKosten: 2500,
      eigenkapital: 120_000,
      zinsSollPct: 0.038,     // 3,8 %
      tilgungStartPct: 0.02,  // 2,0 %
      zinsbindungJahre: 10,
      laufzeitJahre: 30,
    };
  });

  const [showGlossary, setShowGlossary] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(input)); } catch {}
  }, [input]);

  /* ================================
     Nebenkosten & Darlehensbedarf
  ==================================*/
  const nk = useMemo(() => {
    const ge = input.kaufpreis * clamp(input.grunderwerbPct, 0, 0.15);
    const no = input.kaufpreis * clamp(input.notarPct, 0, 0.05);
    const ma = input.kaufpreis * clamp(input.maklerPct, 0, 0.08);
    const total = ge + no + ma + Math.max(0, input.sonstKosten);
    return { ge, no, ma, total };
  }, [input]);

  const kapitalbedarf = useMemo(() => input.kaufpreis + nk.total, [input.kaufpreis, nk.total]);
  const darlehen = useMemo(() => Math.max(0, kapitalbedarf - Math.max(0, input.eigenkapital)), [kapitalbedarf, input.eigenkapital]);
  const ltv = useMemo(() => (input.kaufpreis > 0 ? darlehen / input.kaufpreis : 0), [darlehen, input.kaufpreis]);

  // Annuität (einfach erklärt): Monatsrate = (Sollzins + anf. Tilgung) × Darlehen / 12
  const annuitaetMonat = useMemo(
    () => (darlehen * (input.zinsSollPct + input.tilgungStartPct)) / 12,
    [darlehen, input.zinsSollPct, input.tilgungStartPct]
  );

  /* ================================
     Tilgungsplan (monatlich -> jährlich)
  ==================================*/
  const schedule = useMemo<JahresRow[]>(() => {
    const principal0 = darlehen;
    const H = clamp(Math.round(input.laufzeitJahre), 1, 50);
    const startYear = new Date().getFullYear();
    const i_m = input.zinsSollPct / 12;
    const A = annuitaetMonat;

    let rest = principal0;
    const years: JahresRow[] = [];

    for (let y = 1; y <= H; y++) {
      let zinsJ = 0, tilgJ = 0, rateJ = 0;

      for (let m = 1; m <= 12; m++) {
        if (rest <= 0.01) break;
        const z = rest * i_m;
        const tilg = Math.max(0, A - z);
        const newRest = Math.max(0, rest - tilg);
        zinsJ += z;
        tilgJ += tilg;
        rateJ += z + tilg;
        rest = newRest;
      }

      years.push({
        year: y,
        kalenderjahr: startYear + (y - 1),
        zins: zinsJ,
        tilgung: tilgJ,
        sonder: 0,
        rateSum: rateJ,
        restschuld: rest,
      });

      if (rest <= 0.01) {
        // Restjahre füllen
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
  }, [darlehen, input.laufzeitJahre, input.zinsSollPct, annuitaetMonat]);

  /* ================================
     KPIs & Ableitungen
  ==================================*/
  const first = schedule[0];
  const totalZins = useMemo(() => schedule.reduce((s, r) => s + r.zins, 0), [schedule]);
  const totalTilg = useMemo(() => schedule.reduce((s, r) => s + r.tilgung, 0), [schedule]);
  const rateBadge = useMemo(() => {
    const z1 = first?.zins ?? 0;
    const t1 = first?.tilgung ?? 0;
    const total = z1 + t1;
    const shareZ = total > 0 ? z1 / total : 0;
    if (shareZ > 0.6) return { text: "Rate: überwiegend Zinsen", color: COLORS.rose };
    if (shareZ < 0.4) return { text: "Rate: überwiegend Tilgung", color: COLORS.emerald };
    return { text: "Rate: ausgewogen", color: COLORS.amber };
  }, [first]);

  // LTV Ampel
  const ltvState = useMemo(() => {
    if (ltv <= 0.6) return { label: "sehr komfortabel", color: COLORS.emerald };
    if (ltv <= 0.8) return { label: "komfortabel", color: COLORS.emerald };
    if (ltv <= 0.9) return { label: "ok", color: COLORS.amber };
    return { label: "angespannt", color: COLORS.rose };
  }, [ltv]);

  const bodenfehler = input.eigenkapital > kapitalbedarf;

  /* ================================
     Export
  ==================================*/
  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "finanzierung-config.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function exportCsv() {
    const header = ["Jahr", "Kalenderjahr", "Zinsen", "Tilgung", "Summe Raten", "Restschuld"];
    const rows = schedule.map((r) => [
      r.year, r.kalenderjahr, nice(r.zins), nice(r.tilgung), nice(r.rateSum), nice(r.restschuld),
    ]);
    const csv = [header.join(";")].concat(rows.map((cols) => cols.join(";"))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tilgungsplan.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  /* ================================
     UI
  ==================================*/
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Finanzierung
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">v1.3</span>
          </h2>
          <p className="text-sm text-slate-600">Kauf- & Nebenkosten, Darlehensrate, Restschuld. Klar & verständlich erklärt.</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn label="Glossar" variant="ghost" onClick={() => setShowGlossary(true)} />
          <Btn label="JSON" leftIcon={<IconDownload />} onClick={exportJson} />
          <Btn label="CSV" leftIcon={<IconDoc />} variant="secondary" onClick={exportCsv} />
        </div>
      </div>

      {/* "Kurz erklärt" */}
      <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-emerald-50 p-4 space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[11px]">i</span>
          Kurz erklärt
        </div>
        <ul className="text-sm text-slate-700 space-y-1 ml-1">
          <li>🏠 <b>Kapitalbedarf</b> = Kaufpreis + Nebenkosten (Steuer, Notar, ggf. Makler).</li>
          <li>💶 <b>Darlehen</b> = Kapitalbedarf – Eigenkapital.</li>
          <li>📉 <b>Monatsrate</b> ≈ (Sollzins + anfängliche Tilgung) × Darlehen / 12.</li>
          <li>📈 <b>Restschuld</b> sinkt mit jedem Monat – anfangs langsam (mehr Zinsen), später schneller (mehr Tilgung).</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <KpiCard label="Kapitalbedarf" value={eur0(kapitalbedarf)} hint="Kaufpreis + Nebenkosten (geschätzt aus Angaben)" />
        <KpiCard label="Eigenkapital" value={eur0(input.eigenkapital)} hint="Bargeld, Bausparer etc." />
        <KpiCard label="Darlehen" value={eur0(darlehen)} hint="Finanzierungsbedarf nach Eigenkapital" />
        <KpiCard label="Monatsrate (Start)" value={eur(annuitaetMonat)} hint="Annäherung: Zins + anf. Tilgung" />
        <KpiBadge
          label={`LTV ${(ltv * 100).toFixed(0)} %`}
          value={ltvState.label}
          color={ltvState.color}
          hint="Beleihungsauslauf = Darlehen / Kaufpreis"
        />
      </div>

      {/* Quick Presets (FIX: nutzt jetzt QuickChips mit korrekt verdrahteter Logik) */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium mb-2">Schnellstart</div>
        <QuickChips setInput={setInput} />
      </div>

      {/* Eingaben */}
      <div className="rounded-2xl bg-white border shadow-sm p-4 space-y-5">
        <div className="text-sm font-medium">Kauf & Nebenkosten</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NumberField label="Kaufpreis (€)" value={input.kaufpreis} onChange={(v) => setInput((s) => ({ ...s, kaufpreis: v }))} />
          <PercentField label="Grunderwerbsteuer (%)" value={input.grunderwerbPct * 100} onChange={(p) => setInput((s) => ({ ...s, grunderwerbPct: clamp(p, 0, 100) / 100 }))} hint="je nach Bundesland ~3,5–6,5 %" />
          <PercentField label="Notar/Grundbuch (%)" value={input.notarPct * 100} onChange={(p) => setInput((s) => ({ ...s, notarPct: clamp(p, 0, 100) / 100 }))} hint="Daumenregel ~1,5 %" />
          <PercentField label="Makler (%)" value={input.maklerPct * 100} onChange={(p) => setInput((s) => ({ ...s, maklerPct: clamp(p, 0, 100) / 100 }))} hint="wenn anfällt" />
          <NumberField label="Sonstige Kosten (€)" value={input.sonstKosten} onChange={(v) => setInput((s) => ({ ...s, sonstKosten: v }))} />
        </div>
        <div className="text-xs text-slate-500">
          Nebenkosten ≈ {eur0(nk.total)} (GrESt {eur0(nk.ge)}, Notar {eur0(nk.no)}, Makler {eur0(nk.ma)}, sonst. {eur0(input.sonstKosten)})
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NumberField label="Eigenkapital (€)" value={input.eigenkapital} onChange={(v) => setInput((s) => ({ ...s, eigenkapital: v }))} />
          {bodenfehler && <div className="md:col-span-3 text-xs text-rose-600 self-end">Eigenkapital übersteigt Kapitalbedarf – bitte prüfen.</div>}
        </div>

        <div className="text-sm font-medium mt-2">Darlehen</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <PercentField label="Sollzins p.a. (%)" value={input.zinsSollPct * 100} onChange={(p) => setInput((s) => ({ ...s, zinsSollPct: clamp(p, 0, 100) / 100 }))} step={0.01} />
          <PercentField label="anfängliche Tilgung p.a. (%)" value={input.tilgungStartPct * 100} onChange={(p) => setInput((s) => ({ ...s, tilgungStartPct: clamp(p, 0, 100) / 100 }))} />
          <NumberField label="Zinsbindung (Jahre)" value={input.zinsbindungJahre} onChange={(v) => setInput((s) => ({ ...s, zinsbindungJahre: clamp(Math.round(v), 1, 30) }))} hint="Info-KPI (vereinfacht)" />
          <NumberField label="Planungshorizont (Jahre)" value={input.laufzeitJahre} onChange={(v) => setInput((s) => ({ ...s, laufzeitJahre: clamp(Math.round(v), 1, 50) }))} />
          <KpiPill text={rateBadge.text} color={rateBadge.color} />
        </div>
      </div>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gestapelte Jahresbalken */}
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="text-sm font-medium mb-2">Zinsen & Tilgung pro Jahr</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schedule.map((r) => ({ name: `Y${r.year}`, zins: nice(r.zins), tilg: nice(r.tilgung) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <RTooltip formatter={(v: any) => eur0(Number(v))} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                <Legend />
                <Bar dataKey="zins" name="Zinsen" fill={COLORS.amber} radius={[6, 6, 0, 0]} />
                <Bar dataKey="tilg" name="Tilgung" fill={COLORS.emerald} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Summe Planung: Zinsen {eur0(nice(totalZins))} • Tilgung {eur0(nice(totalTilg))}
          </div>
        </div>

        {/* Restschuld */}
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="text-sm font-medium mb-2">Restschuld (Jahresende)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={schedule.map((r) => ({ name: `Y${r.year}`, rest: nice(r.restschuld) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <RTooltip formatter={(v: any) => eur0(Number(v))} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                <Legend />
                <Line type="monotone" dataKey="rest" name="Restschuld" stroke={COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Tabelle */}
      <div className="rounded-2xl border p-4 bg-white shadow-sm overflow-x-auto">
        <div className="text-sm font-medium mb-2">Tilgungsplan (jährlich)</div>
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-1 pr-2">Jahr</th>
              <th className="py-1 pr-2">Kalenderjahr</th>
              <th className="py-1 pr-2">Zinsen</th>
              <th className="py-1 pr-2">Tilgung</th>
              <th className="py-1 pr-2">Summe Raten</th>
              <th className="py-1 pr-2">Restschuld (Ende)</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((r) => (
              <tr key={r.year} className="border-b last:border-0">
                <td className="py-1 pr-2">{r.year}</td>
                <td className="py-1 pr-2">{r.kalenderjahr}</td>
                <td className="py-1 pr-2">{eur0(nice(r.zins))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.tilgung))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.rateSum))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.restschuld))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Vereinfachtes Modell: konstante Anfangs-Annuität (Sollzins + anf. Tilgung), nominal p.a.; keine Sondertilgung/Zinsänderungen. Keine Finanz-/Rechtsberatung.
      </p>

      {/* Glossar Drawer */}
      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
    </div>
  );
}

/* ================================
   Presets
==================================*/
function applyPreset(kind: "80" | "90" | "100") {
  // Wird in Chip onClick via setState-Callback verwendet
  return (setInput: React.Dispatch<React.SetStateAction<Input>>, s: Input) => {
    if (kind === "80") {
      // 80% FK → EK ~20% Kaufpreis + NK (konservativ)
      const ek = Math.round(s.kaufpreis * 0.2 + s.kaufpreis * (s.grunderwerbPct + s.notarPct + s.maklerPct) + s.sonstKosten);
      setInput({ ...s, eigenkapital: ek, tilgungStartPct: 0.03 });
    } else if (kind === "90") {
      // 90% FK → EK ~10% Kaufpreis, NK teils finanziert
      const ek = Math.round(s.kaufpreis * 0.1);
      setInput({ ...s, eigenkapital: ek, tilgungStartPct: 0.02 });
    } else {
      // 100% inkl. NK (max. Hebel)
      const ek = 0;
      setInput({ ...s, eigenkapital: ek, tilgungStartPct: 0.02, maklerPct: s.maklerPct });
    }
  };
}

/* ================================
   UI-Bausteine
==================================*/
function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border p-4 bg-gradient-to-br from-white to-slate-50 shadow-sm">
      <div className="text-xs text-slate-500 flex items-center gap-1">
        {label}
        {hint && <Help title={hint} />}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function KpiBadge({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-xs text-slate-500 flex items-center gap-1">
        {label} {hint && <Help title={hint} />}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ background: `${hexToRgba(color, 0.12)}`, color }}>
          ● {value}
        </span>
      </div>
    </div>
  );
}

function KpiPill({ text, color }: { text: string; color: string }) {
  return (
    <div className="self-end">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs border" style={{ borderColor: hexToRgba(color, 0.3), background: hexToRgba(color, 0.08), color }}>
        {text}
      </span>
    </div>
  );
}

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 ml-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
  const base = "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all active:scale-[0.98] h-9";
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-md",
    secondary: "bg-white border text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent border border-transparent hover:border-slate-200 text-slate-700",
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick}>
      {leftIcon ? <span className="opacity-90">{leftIcon}</span> : null}
      <span className="leading-none">{label}</span>
    </button>
  );
}

function Chip({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color: string }) {
  return (
    <button
      className="px-3 py-1.5 text-xs rounded-xl border bg-white hover:bg-slate-50 shadow-sm hover:shadow"
      style={{ borderColor: hexToRgba(color, 0.5) }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NumberField({ label, value, onChange, hint, step = 1 }: { label: string; value: number; onChange: (v: number) => void; hint?: string; step?: number }) {
  return (
    <label className="text-sm text-slate-700 block">
      <span className="inline-flex items-center">{label}</span>
      <input
        className="mt-1 w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        type="number"
        step={step}
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}
function PercentField({ label, value, onChange, hint, step = 0.1 }: { label: string; value: number; onChange: (v: number) => void; hint?: string; step?: number }) {
  return (
    <label className="text-sm text-slate-700 block">
      <span className="inline-flex items-center">{label}{hint && <Help title={hint} />}</span>
      <input
        className="mt-1 w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        type="number"
        step={step}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}

/* Icons */
function IconDownload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h10" />
    </svg>
  );
}

/* Glossar Drawer */
function Glossary({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Glossar</h3>
          <button className="text-slate-600 hover:text-slate-900" onClick={onClose}>Schließen</button>
        </div>
        <dl className="space-y-3 text-sm text-slate-700">
          <GlossTerm term="Kapitalbedarf">Summe aus Kaufpreis und allen Nebenkosten (Steuer, Notar/Grundbuch, ggf. Makler, Sonstiges).</GlossTerm>
          <GlossTerm term="Darlehen">Kapitalbedarf abzüglich deines Eigenkapitals.</GlossTerm>
          <GlossTerm term="LTV (Beleihungsauslauf)">Verhältnis Darlehen / Kaufpreis. Niedriger LTV = komfortabler.</GlossTerm>
          <GlossTerm term="Sollzins">Nominaler Jahreszins deines Kredits (ohne weitere Kosten).</GlossTerm>
          <GlossTerm term="Anfängliche Tilgung">Prozentualer Jahresanteil, mit dem das Darlehen zu Beginn getilgt wird.</GlossTerm>
          <GlossTerm term="Monatsrate">Annäherung: (Sollzins + anfängliche Tilgung) × Darlehen / 12.</GlossTerm>
          <GlossTerm term="Restschuld">Verbleibender Kreditbetrag nach einem Jahr (hier jeweils am Jahresende).</GlossTerm>
        </dl>
        <div className="mt-4 text-xs text-slate-500">
          Hinweis: vereinfachte Darstellung, keine Finanz-/Rechtsberatung.
        </div>
      </div>
    </div>
  );
}
function GlossTerm({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{term}</dt>
      <dd className="text-slate-600">{children}</dd>
    </div>
  );
}

/* Utils */
function hexToRgba(hex: string, alpha = 1) {
  const m = hex.replace("#", "");
  const bigint = parseInt(m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Preset Hook-Wrapper (damit Chips einfach bleiben) */
function applyPresetFactory(kind: "80" | "90" | "100", setInput: React.Dispatch<React.SetStateAction<Input>>) {
  return () => setInput((s) => {
    const fn = applyPreset(kind);
    fn(setInput, s);
    return s; // setInput bereits in fn ausgeführt
  });
}
function usePresetAppliers(setInput: React.Dispatch<React.SetStateAction<Input>>) {
  return {
    apply80: applyPresetFactory("80", setInput),
    apply90: applyPresetFactory("90", setInput),
    apply100: applyPresetFactory("100", setInput),
  };
}
function ChipPreset({ color, children, action }: { color: string; children: React.ReactNode; action: () => void }) {
  return <Chip color={color} onClick={action}>{children}</Chip>;
}
function QuickChips({ setInput }: { setInput: React.Dispatch<React.SetStateAction<Input>> }) {
  const { apply80, apply90, apply100 } = usePresetAppliers(setInput);
  return (
    <div className="flex gap-2 flex-wrap">
      <ChipPreset color={COLORS.emerald} action={apply80}>Beispiel: 80% Finanzierung</ChipPreset>
      <ChipPreset color={COLORS.amber} action={apply90}>Beispiel: 90% Finanzierung</ChipPreset>
      <ChipPreset color={COLORS.rose} action={apply100}>Beispiel: 100% (inkl. NK)</ChipPreset>
    </div>
  );
}
