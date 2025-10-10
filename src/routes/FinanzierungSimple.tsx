// src/routes/FinanzierungSimple.tsx
// v1.2 – gleiches Look&Feel wie Finanzierung (Pro), aber maximal simpel
import React, { useMemo, useState } from "react";
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

/* ================================
   Palette & Helpers (wie Pro)
==================================*/
const COLORS = {
  primary: "#2563eb",   // Linie Restschuld
  indigo: "#4f46e5",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
};

const eur0 = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
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
  nebenkostenPct: number;  // pauschal (z.B. 10 %)
  eigenkapital: number;
  sollzinsPct: number;     // p.a. z.B. 3,8 % = 0.038
  tilgungStartPct: number; // p.a. z.B. 2,0 % = 0.02
  horizontJahre: number;   // Anzeige-Horizont
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
   Component
==================================*/
export default function FinanzierungSimple() {
  const [input, setInput] = useState<Input>({
    kaufpreis: 400_000,
    nebenkostenPct: 0.10,
    eigenkapital: 100_000,
    sollzinsPct: 0.038,
    tilgungStartPct: 0.02,
    horizontJahre: 20,
  });
  const [showGlossary, setShowGlossary] = useState(false);

  // Kapitalbedarf & Darlehen
  const nebenkosten = useMemo(
    () => Math.max(0, input.kaufpreis * clamp(input.nebenkostenPct, 0, 0.2)),
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

  // Monatsrate (Annuität vereinfacht)
  const annuitaetMonat = useMemo(
    () => (darlehen * (input.sollzinsPct + input.tilgungStartPct)) / 12,
    [darlehen, input.sollzinsPct, input.tilgungStartPct]
  );

  // Tilgungsplan: monatlich rechnen, jährlich zeigen
  const plan = useMemo<JahresRow[]>(() => {
    const startYear = new Date().getFullYear();
    const H = clamp(Math.round(input.horizontJahre), 1, 50);
    const i_m = input.sollzinsPct / 12;
    const A = annuitaetMonat;

    let rest = darlehen;
    const jahre: JahresRow[] = [];

    for (let y = 1; y <= H; y++) {
      let zinsJ = 0, tilgJ = 0, rateJ = 0;

      for (let m = 1; m <= 12; m++) {
        if (rest <= 0.01) break;
        const z = rest * i_m;
        const tilg = Math.max(0, A - z);
        const newRest = Math.max(0, rest - tilg);
        zinsJ += z; tilgJ += tilg; rateJ += z + tilg;
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
            zinsen: 0, tilgung: 0, rateSumme: 0, restschuld: 0,
          });
        }
        break;
      }
    }
    return jahre;
  }, [darlehen, input.horizontJahre, input.sollzinsPct, annuitaetMonat]);

  // KPIs & States
  const y1 = plan[0];
  const totalZins = plan.reduce((s, r) => s + r.zinsen, 0);
  const totalTilg = plan.reduce((s, r) => s + r.tilgung, 0);
  const rateBadge = useMemo(() => {
    const z1 = y1?.zinsen ?? 0;
    const t1 = y1?.tilgung ?? 0;
    const total = z1 + t1;
    const shareZ = total > 0 ? z1 / total : 0;
    if (shareZ > 0.6) return { text: "Rate: überwiegend Zinsen", color: COLORS.rose };
    if (shareZ < 0.4) return { text: "Rate: überwiegend Tilgung", color: COLORS.emerald };
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
        const ek = Math.round(s.kaufpreis * 0.2 + s.kaufpreis * s.nebenkostenPct); // EK deckt NK
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Finanzierung (einfach)
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">v1.2</span>
          </h2>
          <p className="text-sm text-slate-600">Wenige Eingaben – klare Rate, Zinsen und Restschuld. Verständlich erklärt.</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn label="Glossar" variant="ghost" onClick={() => setShowGlossary(true)} />
        </div>
      </div>

      {/* Kurz erklärt */}
      <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-emerald-50 p-4 space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[11px]">i</span>
          Kurz erklärt
        </div>
        <ul className="text-sm text-slate-700 space-y-1 ml-1">
          <li>🏠 <b>Kapitalbedarf</b> = Kaufpreis + pauschale Nebenkosten.</li>
          <li>💶 <b>Darlehen</b> = Kapitalbedarf – Eigenkapital.</li>
          <li>🧮 <b>Monatsrate</b> ≈ (Sollzins + anf. Tilgung) × Darlehen / 12.</li>
          <li>📈 <b>Restschuld</b> sinkt jeden Monat – erst langsam (mehr Zinsen), später schneller (mehr Tilgung).</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <KpiCard label="Kapitalbedarf" value={eur0(kapitalbedarf)} hint="Kaufpreis + pauschale NK" />
        <KpiCard label="Darlehen" value={eur0(darlehen)} hint="Finanzierungsbedarf nach EK" />
        <KpiCard label="Monatsrate (Start)" value={eur(annuitaetMonat)} hint="Annäherung: Zins + anf. Tilgung" />
        <KpiCard label="Zinsen im 1. Jahr" value={eur0(nice(y1?.zinsen ?? 0))} />
        <KpiBadge label={`LTV ${(ltv * 100).toFixed(0)} %`} value={ltvState.label} color={ltvState.color} hint="Beleihungsauslauf = Darlehen / Kaufpreis" />
      </div>

      {/* Presets */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium mb-2">Schnellstart</div>
        <div className="flex gap-2 flex-wrap">
          <Chip onClick={() => applyPreset("80")} color={COLORS.emerald}>Beispiel: 80% Finanzierung</Chip>
          <Chip onClick={() => applyPreset("90")} color={COLORS.amber}>Beispiel: 90% Finanzierung</Chip>
          <Chip onClick={() => applyPreset("100")} color={COLORS.rose}>Beispiel: 100% (inkl. NK)</Chip>
        </div>
      </div>

      {/* Eingaben */}
      <div className="rounded-2xl bg-white border shadow-sm p-4 space-y-5">
        <div className="text-sm font-medium">Grunddaten</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumberField label="Kaufpreis (€)" value={input.kaufpreis} onChange={(v) => setInput((s) => ({ ...s, kaufpreis: v }))} />
          <PercentField label="Nebenkosten pauschal (%)" value={input.nebenkostenPct * 100} onChange={(p) => setInput((s) => ({ ...s, nebenkostenPct: clamp(p, 0, 100) / 100 }))} hint="Daumenregel: 8–12 %" />
          <NumberField label="Eigenkapital (€)" value={input.eigenkapital} onChange={(v) => setInput((s) => ({ ...s, eigenkapital: v }))} />
        </div>
        {eigenkapFehler && <div className="text-xs text-rose-600">Eigenkapital ist höher als der Kapitalbedarf – bitte prüfen.</div>}

        <div className="text-sm font-medium">Kredit</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PercentField label="Sollzins p.a. (%)" value={input.sollzinsPct * 100} step={0.01} onChange={(p) => setInput((s) => ({ ...s, sollzinsPct: clamp(p, 0, 100) / 100 }))} />
          <PercentField label="anfängliche Tilgung p.a. (%)" value={input.tilgungStartPct * 100} onChange={(p) => setInput((s) => ({ ...s, tilgungStartPct: clamp(p, 0, 100) / 100 }))} />
          <NumberField label="Horizont (Jahre)" value={input.horizontJahre} onChange={(v) => setInput((s) => ({ ...s, horizontJahre: clamp(Math.round(v), 1, 40) }))} />
        </div>
        <div className="flex items-center justify-end">
          <KpiPill text={rateBadge.text} color={rateBadge.color} />
        </div>
      </div>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="text-sm font-medium mb-2">Restschuld (Jahresende)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plan.map((r) => ({ name: `Y${r.jahr}`, rest: nice(r.restschuld) }))}>
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

        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="text-sm font-medium mb-2">Zinsen & Tilgung pro Jahr</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plan.map((r) => ({ name: `Y${r.jahr}`, zins: nice(r.zinsen), tilg: nice(r.tilgung) }))}>
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
      </section>

      {/* Tabelle */}
      <div className="rounded-2xl border p-4 bg-white shadow-sm overflow-x-auto">
        <div className="text-sm font-medium mb-2">Jahresübersicht</div>
        <table className="w-full text-sm min-w-[680px]">
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
            {plan.map((r) => (
              <tr key={r.jahr} className="border-b last:border-0">
                <td className="py-1 pr-2">{r.jahr}</td>
                <td className="py-1 pr-2">{r.kalenderjahr}</td>
                <td className="py-1 pr-2">{eur0(nice(r.zinsen))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.tilgung))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.rateSumme))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.restschuld))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Vereinfachtes Modell: konstante Anfangs-Annuität (Sollzins + anf. Tilgung), nominal p.a.; keine Sondertilgung/Zinswechsel. Keine Finanz-/Rechtsberatung.
      </p>

      {/* Glossar */}
      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
    </div>
  );
}

/* ================================
   UI-Bausteine (wie Pro)
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
      <div className="mt-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ background: hexToRgba(color, 0.12), color }}>
          ● {value}
        </span>
      </div>
    </div>
  );
}
function KpiPill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs border" style={{ borderColor: hexToRgba(color, 0.3), background: hexToRgba(color, 0.08), color }}>
      {text}
    </span>
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

/* Glossar */
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
          <GlossTerm term="Kapitalbedarf">Kaufpreis plus pauschale Nebenkosten.</GlossTerm>
          <GlossTerm term="Darlehen">Kapitalbedarf minus Eigenkapital.</GlossTerm>
          <GlossTerm term="LTV (Beleihungsauslauf)">Verhältnis Darlehen / Kaufpreis. Niedriger ist komfortabler.</GlossTerm>
          <GlossTerm term="Sollzins">Nominaler Jahreszins deines Kredits.</GlossTerm>
          <GlossTerm term="Anfängliche Tilgung">Prozentualer Anfangsanteil zur Rückzahlung des Kredits.</GlossTerm>
          <GlossTerm term="Monatsrate">Annäherung: (Sollzins + anf. Tilgung) × Darlehen / 12.</GlossTerm>
          <GlossTerm term="Restschuld">Verbleibender Kreditbetrag am Jahresende.</GlossTerm>
        </dl>
        <div className="mt-4 text-xs text-slate-500">Hinweis: vereinfachte Darstellung, keine Finanz-/Rechtsberatung.</div>
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
