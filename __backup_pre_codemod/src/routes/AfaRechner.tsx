// src/routes/AfaRechner.tsx (Propora v3.2 – branding + tidy UI)
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

/* ---------- Propora Branding ---------- */
const BRAND = "#1b2c47";   // Primary
const CTA = "#ffde59";     // Yellow
const ORANGE = "#ff914d";  // Orange
const SURFACE_ALT = "#EAEAEE";

/* ---- Palette für Charts ---- */
const COLORS = {
  primary: BRAND,
  primaryAlt: "#2a446e",
  accent: CTA,
  accentAlt: "#ffe68d",
  warn: ORANGE,
  warnAlt: "#ffc19c",
  slate: "#64748b",
};

// ---- Utils ----
const eur0 = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

// ---- Types ----
type AfAMethod = "linear" | "degressiv" | "kombiniert";

type Modernisierung = {
  id: string;
  title: string;
  amount: number;
  capitalize: boolean;
  method: AfAMethod;
  years?: number;
  ratePct?: number;
  proratOn?: boolean;
  startMonat?: number; // 1..12
  startJahrOffset?: number;
};

type SonderPosten = {
  id: string;
  title: string;
  amount: number;
  years: number;
  proratOn?: boolean;
  startMonat?: number;
  startJahrOffset?: number;
};

type AfaInput = {
  kaufpreis: number;
  bodenwert: number;

  method: AfAMethod;
  years?: number;
  ratePct?: number;
  kombiYears?: number;
  kombiRatePct?: number;

  switchYears?: number;
  horizonYears: number;

  proratOn: boolean;
  anschaffungsMonat: number;

  modernisierungen: Modernisierung[];
  sonder: SonderPosten[];

  taxOn: boolean;
  marginalTaxPct: number; // 0..1

  autoSwitchDegToLin: boolean;
};

type AfaYearRow = {
  yearIndex: number; // 1..H
  kalenderjahr: number;
  afaSum: number;
  parts: {
    haupt: number;
    modernisierungen: { id: string; value: number }[];
    sonder: { id: string; value: number }[];
  };
  taxSaving: number;
};

// ---- Rechenlogik ----
function gebaeudeAnteil(kaufpreis: number, bodenwert: number) {
  return Math.max(0, kaufpreis - Math.max(0, bodenwert));
}
function afaLinear(amount: number, years: number) {
  if (amount <= 0 || years <= 0) return 0;
  return amount / years;
}
function afaDegressiv(amount: number, rate: number, t: number) {
  if (amount <= 0 || rate <= 0) return 0;
  return amount * rate * Math.pow(1 - rate, t - 1);
}
function distributeLinear(amount: number, years: number) {
  if (amount <= 0 || years <= 0) return [];
  const p = amount / years;
  return Array.from({ length: years }, () => p);
}
function monthsFactor(monat: number) {
  const m = clamp(Math.round(monat), 1, 12);
  const monate = 12 - (m - 1);
  return monate / 12;
}

const DRAFT_KEY = "afa.rechner.v3.2";

export default function AfaRechner() {
  const [mode, setMode] = useState<"basic" | "pro">("basic");

  const [input, setInput] = useState<AfaInput>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as AfaInput;
    } catch {}
    return {
      kaufpreis: 350_000,
      bodenwert: 70_000,
      method: "linear",
      years: 50,
      ratePct: 0.05,
      kombiYears: 5,
      kombiRatePct: 0.05,
      switchYears: 50,
      autoSwitchDegToLin: true,
      horizonYears: 10,
      proratOn: true,
      anschaffungsMonat: 7,
      modernisierungen: [
        {
          id: rid(),
          title: "Bad-Modernisierung",
          amount: 15_000,
          capitalize: true,
          method: "linear",
          years: 10,
          proratOn: true,
          startMonat: 9,
          startJahrOffset: 0,
        },
      ],
      sonder: [
        { id: rid(), title: "Sonder-AfA Beispiel", amount: 10_000, years: 4, proratOn: true, startMonat: 3, startJahrOffset: 0 },
      ],
      taxOn: true,
      marginalTaxPct: 0.35,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(input));
    } catch {}
  }, [input]);

  // Presets
  const PRESETS: Record<string, Partial<AfaInput>> = {
    "Neubau 2015": { method: "linear", years: 50, proratOn: true, anschaffungsMonat: 7, modernisierungen: [], sonder: [] },
    "Altbau 1955": {
      method: "linear",
      years: 50,
      proratOn: true,
      anschaffungsMonat: 3,
      modernisierungen: [{ id: rid(), title: "Fenster", amount: 12_000, capitalize: true, method: "linear", years: 10, proratOn: true, startMonat: 4 }],
      sonder: [],
    },
    "Buy & Hold 30J": { method: "linear", years: 50, horizonYears: 30, proratOn: true, anschaffungsMonat: 6, sonder: [] },
    "Fix & Flip (Demo)": {
      method: "degressiv",
      ratePct: 0.05,
      horizonYears: 5,
      proratOn: true,
      anschaffungsMonat: 2,
      modernisierungen: [{ id: rid(), title: "Küche", amount: 8_000, capitalize: true, method: "linear", years: 8, proratOn: true, startMonat: 3 }],
      sonder: [],
    },
  };

  const gebAnteil = useMemo(() => gebaeudeAnteil(input.kaufpreis, input.bodenwert), [input.kaufpreis, input.bodenwert]);
  const bodenFehler = input.bodenwert > input.kaufpreis;
  const proratY1Main = useMemo(() => (input.proratOn ? monthsFactor(input.anschaffungsMonat) : 1), [input.proratOn, input.anschaffungsMonat]);

  // ---- Jahresreihen ----
  const out = useMemo<AfaYearRow[]>(() => {
    const H = clamp(Math.round(input.horizonYears), 1, 40);
    const baseYear = new Date().getFullYear();

    const mainPerYear: number[] = Array(H).fill(0);
    if (input.method === "linear") {
      const y = clamp(Math.round(input.years ?? 50), 1, 100);
      const pa = afaLinear(gebAnteil, y);
      for (let t = 0; t < H; t++) mainPerYear[t] = pa * (t === 0 ? proratY1Main : 1);
    } else if (input.method === "degressiv") {
      const r = Math.max(0, input.ratePct ?? 0.05);
      for (let t = 0; t < H; t++) {
        const nominal = afaDegressiv(gebAnteil, r, t + 1);
        mainPerYear[t] = nominal * (t === 0 ? proratY1Main : 1);
      }
    } else {
      const N = clamp(Math.round(input.kombiYears ?? 5), 1, 100);
      const r = Math.max(0, input.kombiRatePct ?? 0.05);
      const pa = afaLinear(gebAnteil, N);
      for (let t = 0; t < Math.min(H, N); t++) {
        mainPerYear[t] = pa * (t === 0 ? proratY1Main : 1);
      }
      const rest = Math.max(0, gebAnteil - pa * N);
      for (let t = N; t < H; t++) {
        const yearInDeg = t - N + 1;
        const val = afaDegressiv(rest, r, yearInDeg);
        mainPerYear[t] = val;
      }
    }

    // Modernisierungen
    const modMap: Record<string, number[]> = {};
    for (const m of input.modernisierungen) {
      const arr = Array(H).fill(0);
      const amount = m.capitalize ? m.amount : 0;
      if (amount > 0) {
        const factorY1 = m.proratOn ? monthsFactor(m.startMonat ?? 1) : 1;
        if (m.method === "linear") {
          const yrs = clamp(Math.round(m.years ?? 10), 1, 100);
          const pa = afaLinear(amount, yrs);
          for (let t = 0; t < Math.min(H, yrs); t++) arr[t] = pa * (t === 0 ? factorY1 : 1);
        } else if (m.method === "degressiv") {
          const r = Math.max(0, m.ratePct ?? 0.05);
          for (let t = 0; t < H; t++) {
            const nominal = afaDegressiv(amount, r, t + 1);
            arr[t] = nominal * (t === 0 ? factorY1 : 1);
          }
        } else {
          const N = clamp(Math.round(m.years ?? 5), 1, 100);
          const r = Math.max(0, m.ratePct ?? 0.05);
          const pa = afaLinear(amount, N);
          for (let t = 0; t < Math.min(H, N); t++) arr[t] = pa * (t === 0 ? factorY1 : 1);
          const rest = Math.max(0, amount - pa * N);
          for (let t = N; t < H; t++) arr[t] = afaDegressiv(rest, r, t - N + 1);
        }
      }
      modMap[m.id] = arr;
    }

    // Sonder-AfA linear
    const sonderMap: Record<string, number[]> = {};
    for (const s of input.sonder) {
      const yrs = clamp(Math.round(s.years), 1, 100);
      const dist = distributeLinear(s.amount, yrs);
      const factorY1 = s.proratOn ? monthsFactor(s.startMonat ?? 1) : 1;
      const arr = Array(H).fill(0);
      for (let t = 0; t < Math.min(H, yrs); t++) arr[t] = (dist[t] ?? 0) * (t === 0 ? factorY1 : 1);
      sonderMap[s.id] = arr;
    }

    // Aggregation
    const rows: AfaYearRow[] = Array.from({ length: H }, (_, i) => {
      const haupt = mainPerYear[i] ?? 0;
      const modernisierungen = Object.entries(modMap).map(([id, a]) => ({ id, value: a[i] ?? 0 }));
      const sonder = Object.entries(sonderMap).map(([id, a]) => ({ id, value: a[i] ?? 0 }));
      const sum = haupt + modernisierungen.reduce((s, v) => s + v.value, 0) + sonder.reduce((s, v) => s + v.value, 0);
      const taxSaving = input.taxOn ? sum * (input.marginalTaxPct ?? 0) : 0;
      return { yearIndex: i + 1, kalenderjahr: baseYear + i, afaSum: sum, parts: { haupt, modernisierungen, sonder }, taxSaving };
    });

    return rows;
  }, [input, gebAnteil, proratY1Main]);

  const totalAfa = useMemo(() => out.reduce((s, r) => s + r.afaSum, 0), [out]);
  const totalTaxSave = useMemo(() => out.reduce((s, r) => s + r.taxSaving, 0), [out]);

  // Split Jahr 1 – Werte runden, keine Label auf der Torte
  const y1 = out[0];
  const pieData = useMemo(() => {
    if (!y1) return [] as { name: string; value: number }[];
    const mods = y1.parts.modernisierungen.reduce((s, a) => s + a.value, 0);
    const sond = y1.parts.sonder.reduce((s, a) => s + a.value, 0);
    return [
      { name: "Haupt", value: Math.round(Math.max(0, y1.parts.haupt)) },
      { name: "Modernisierungen", value: Math.round(Math.max(0, mods)) },
      { name: "Sonder-AfA", value: Math.round(Math.max(0, sond)) },
    ];
  }, [y1]);

  // ---- Export/Import ----
  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afa-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportCsv() {
    const header = ["Jahr", "Kalenderjahr", "AfA gesamt", "davon Haupt", "Modernisierungen", "Sonder", "Steuerersparnis"];
    const rows = out.map((r) => {
      const mods = r.parts.modernisierungen.reduce((s, a) => s + a.value, 0);
      const sond = r.parts.sonder.reduce((s, a) => s + a.value, 0);
      return [r.yearIndex, r.kalenderjahr, Math.round(r.afaSum), Math.round(r.parts.haupt), Math.round(mods), Math.round(sond), Math.round(r.taxSaving)];
    });
    const csv = [header.join(";")].concat(rows.map((cols) => cols.join(";"))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afa-tabelle.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result)) as AfaInput;
        setInput(obj);
      } catch {
        alert("Ungültige Datei");
      }
    };
    r.readAsText(file);
  }

  // ---- UI ----
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: BRAND }}>
            AfA-Rechner
            <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ background: SURFACE_ALT, borderColor: SURFACE_ALT, color: BRAND }}>
              v3.2
            </span>
          </h2>
          <p className="text-sm text-slate-600">Gebäudeanteil, Modernisierungen, Sonder-AfA – mit Pro-rata & einfacher Steuerwirkung.</p>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} setMode={setMode} />
          <Btn label="JSON" leftIcon={<IconDownload />} onClick={exportJson} />
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
            <Btn label="Import" leftIcon={<IconDownload />} variant="secondary" />
          </label>
          <Btn label="CSV" leftIcon={<IconDoc />} onClick={exportCsv} variant="secondary" />
        </div>
      </div>

      {/* Sticky Summary */}
      <StickySummary y1Afa={y1?.afaSum ?? 0} y1Tax={y1?.taxSaving ?? 0} totalAfa={totalAfa} horizon={input.horizonYears} />

      {/* Onboarding & Presets */}
      <div className="rounded-2xl border p-4 space-y-3 shadow-sm" style={{ background: `linear-gradient(135deg, ${SURFACE_ALT}, #ffffff)` }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded" style={{ background: BRAND, color: "#fff", fontSize: 11 }}>i</span>
            So nutzt du den AfA-Rechner
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" label="Zurücksetzen" onClick={() => { localStorage.removeItem(DRAFT_KEY); window.location.reload(); }} />
          </div>
        </div>
        <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-1">
          <li>Trage <b>Kaufpreis</b> und <b>Bodenwert</b> ein (nur der Gebäudeanteil ist abschreibbar).</li>
          <li>Wähle die <b>AfA-Methode</b> (linear ist Standard).</li>
          <li>Optional: Füge <b>Modernisierungen</b> / <b>Sonder-AfA</b> hinzu.</li>
        </ol>
        <PresetPicker presets={PRESETS} apply={(p) => setInput((s) => ({ ...s, ...p }))} />
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="Gebäudeanteil" value={eur0(gebAnteil)} />
        <KpiCard label={`AfA Jahr 1`} value={eur0(Math.round(y1?.afaSum ?? 0))} />
        <KpiCard label={`Summe AfA Y1–Y${input.horizonYears}`} value={eur0(Math.round(totalAfa))} />
        <KpiCard label="Steuerersparnis gesamt" value={eur0(Math.round(totalTaxSave))} />
      </div>

      {/* Eingaben */}
      <div className="rounded-2xl bg-white border shadow-sm p-4 space-y-4">
        <div className="text-sm font-medium">Objektbasis</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumberField label="Kaufpreis (€)" value={input.kaufpreis} onChange={(v) => setInput((s) => ({ ...s, kaufpreis: v }))} help="Gesamtkaufpreis inkl. Grundstück; der Boden wird separat ausgewiesen." />
          <NumberField label="Bodenwert (nicht abschreibbar) (€)" value={input.bodenwert} onChange={(v) => setInput((s) => ({ ...s, bodenwert: v }))} help={bodenFehler ? "Bitte prüfen: Bodenwert sollte ≤ Kaufpreis sein." : "Boden ist nicht abschreibbar."} />
          <NumberField label="Horizont (Jahre)" value={input.horizonYears} onChange={(v) => setInput((s) => ({ ...s, horizonYears: clamp(Math.round(v), 1, 40) }))} help="Wie viele Prognosejahre möchtest du sehen?" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <SelectField
            label="AfA-Methode"
            value={input.method}
            options={[{ value: "linear", label: "Linear" }, { value: "degressiv", label: "Degressiv" }, { value: "kombiniert", label: "Kombiniert" }]}
            onChange={(v) => setInput((s) => ({ ...s, method: v as AfAMethod }))}
            help="Grundprinzip, wie abgeschrieben wird."
          />
          {input.method === "linear" && (
            <NumberField label="Nutzungsdauer (Jahre)" value={input.years ?? 50} onChange={(v) => setInput((s) => ({ ...s, years: clamp(Math.round(v), 1, 100) }))} help="Bei linearer AfA wird der Gebäudeanteil gleichmäßig verteilt." />
          )}
          {input.method === "degressiv" && (
            <PercentField label="Degressiver Satz (%)" value={(input.ratePct ?? 0.05) * 100} onChange={(p) => setInput((s) => ({ ...s, ratePct: p / 100 }))} step={0.1} help="Prozentsatz vom jeweiligen Restbuchwert pro Jahr (typisch 2–5 %)." />
          )}
          {input.method === "kombiniert" && (
            <>
              <NumberField label="Lineare Vorphase (Jahre)" value={input.kombiYears ?? 5} onChange={(v) => setInput((s) => ({ ...s, kombiYears: clamp(Math.round(v), 1, 100) }))} help="So lange wird zunächst linear abgeschrieben." />
              <PercentField label="Degressiver Satz danach (%)" value={(input.kombiRatePct ?? 0.05) * 100} onChange={(p) => setInput((s) => ({ ...s, kombiRatePct: p / 100 }))} step={0.1} help="Anschließend degressiv auf den Restbuchwert." />
            </>
          )}

          <div className="md:col-span-2 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                <input type="checkbox" className="mr-2" checked={input.proratOn} onChange={(e) => setInput((s) => ({ ...s, proratOn: e.target.checked }))} />
                Pro-rata im Anschaffungsjahr (Hauptobjekt)
              </label>
              <div className="text-xs text-gray-500">{input.proratOn ? `Monate in Y1: ${Math.round(proratY1Main * 12)}` : "aus"}</div>
            </div>
            {input.proratOn && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumberField label="Anschaffungsmonat (1–12)" value={input.anschaffungsMonat} onChange={(v) => setInput((s) => ({ ...s, anschaffungsMonat: clamp(Math.round(v), 1, 12) }))} help="Ab diesem Monat zählt die AfA anteilig." />
                <div className="text-xs text-gray-500 self-end">AfA in Y1 = Jahres-AfA × {Math.round(proratY1Main * 12)}/12</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modernisierungen */}
      {mode === "pro" ? (
        <ModernisierungenBlock input={input} setInput={setInput} />
      ) : (
        <details className="rounded-2xl bg-white border shadow-sm p-4 space-y-3">
          <summary className="cursor-pointer text-sm font-medium">Modernisierungen / HK (optional)</summary>
          <div className="pt-3"><ModernisierungenBlock input={input} setInput={setInput} /></div>
        </details>
      )}

      {/* Sonder-AfA */}
      {mode === "pro" ? (
        <SonderBlock input={input} setInput={setInput} />
      ) : (
        <details className="rounded-2xl bg-white border shadow-sm p-4 space-y-3">
          <summary className="cursor-pointer text-sm font-medium">Sonder-AfA (optional)</summary>
          <div className="pt-3"><SonderBlock input={input} setInput={setInput} /></div>
        </details>
      )}

      {/* Steuerwirkung */}
      <div className="rounded-2xl bg-white border shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Steuerwirkung (vereinfacht)</div>
          <label className="text-xs text-gray-700 flex items-center">
            <input type="checkbox" className="mr-2" checked={input.taxOn} onChange={(e) => setInput((s) => ({ ...s, taxOn: e.target.checked }))} />
            berücksichtigen
          </label>
        </div>
        {input.taxOn && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PercentField label="Grenzsteuersatz (%)" value={input.marginalTaxPct * 100} onChange={(p) => setInput((s) => ({ ...s, marginalTaxPct: clamp(p, 0, 100) / 100 }))} step={0.5} help="Persönlicher Steuersatz am Rand (vereinfachte Annahme)." />
            <KpiCard label="Y1 Steuerersparnis" value={eur0(Math.round(y1?.taxSaving ?? 0))} />
            <KpiCard label={`Summe Y1–Y${input.horizonYears}`} value={eur0(Math.round(totalTaxSave))} />
          </div>
        )}
      </div>

      {/* Ergebnisse */}
      <section className="space-y-4">
        {/* Stacked Bar with Gradients */}
        <div className="rounded-2xl border p-4 bg-white shadow-sm overflow-x-auto">
          <div className="text-sm font-medium mb-2">AfA-Zeitverlauf (gestapelt nach Quellen)</div>
          <div className="h-60 min-w-[720px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={out.map((r) => {
                  const mods = r.parts.modernisierungen.reduce((s, a) => s + a.value, 0);
                  const sond = r.parts.sonder.reduce((s, a) => s + a.value, 0);
                  return { name: `Y${r.yearIndex}`, haupt: Math.round(r.parts.haupt), mods: Math.round(mods), sond: Math.round(sond) };
                })}
              >
                <defs>
                  <linearGradient id="gradHaupt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primaryAlt} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.95} />
                  </linearGradient>
                  <linearGradient id="gradMods" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.accentAlt} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.95} />
                  </linearGradient>
                  <linearGradient id="gradSond" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.warnAlt} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS.warn} stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RTooltip formatter={(v: any) => eur(v)} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} iconType="circle" />
                <Bar dataKey="haupt" name="Haupt" stackId="1" fill="url(#gradHaupt)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mods" name="Modernisierungen" stackId="1" fill="url(#gradMods)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sond" name="Sonder-AfA" stackId="1" fill="url(#gradSond)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tabelle */}
          <div className="rounded-2xl border p-4 bg-white shadow-sm">
            <div className="text-sm font-medium mb-2">AfA (Y1–Y{input.horizonYears}) – Tabelle</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1 pr-2">Jahr</th>
                    <th className="py-1 pr-2">Kalenderjahr</th>
                    <th className="py-1 pr-2">AfA gesamt</th>
                    <th className="py-1 pr-2">davon Haupt</th>
                    <th className="py-1 pr-2">Modernisierungen</th>
                    <th className="py-1 pr-2">Sonder</th>
                    <th className="py-1 pr-2">Steuerersparnis</th>
                  </tr>
                </thead>
                <tbody>
                  {out.map((r) => {
                    const mods = r.parts.modernisierungen.reduce((s, a) => s + a.value, 0);
                    const sond = r.parts.sonder.reduce((s, a) => s + a.value, 0);
                    const aboveAvg = r.afaSum > totalAfa / out.length;
                    return (
                      <tr key={r.yearIndex} className={`border-b last:border-0 ${aboveAvg ? "bg-emerald-50/40" : ""}`}>
                        <td className="py-1 pr-2">{r.yearIndex}</td>
                        <td className="py-1 pr-2">{r.kalenderjahr}</td>
                        <td className="py-1 pr-2 font-medium">{eur(Math.round(r.afaSum))}</td>
                        <td className="py-1 pr-2">{eur(Math.round(r.parts.haupt))}</td>
                        <td className="py-1 pr-2">{eur(Math.round(mods))}</td>
                        <td className="py-1 pr-2">{eur(Math.round(sond))}</td>
                        <td className="py-1 pr-2">{eur(Math.round(r.taxSaving))}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td className="py-1 pr-2" colSpan={2}>Summe</td>
                    <td className="py-1 pr-2">{eur(Math.round(totalAfa))}</td>
                    <td className="py-1 pr-2" colSpan={3}></td>
                    <td className="py-1 pr-2">{eur(Math.round(totalTaxSave))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie */}
          <div className="rounded-2xl border p-4 bg-white shadow-sm">
            <div className="text-sm font-medium mb-2">Split Jahr 1</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} label={false}>
                    <Cell fill={COLORS.primary} />
                    <Cell fill={COLORS.accent} />
                    <Cell fill={COLORS.warn} />
                  </Pie>
                  <RTooltip formatter={(v: any) => eur0(Number(v))} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-500">Hinweis: Vereinfachtes Modell. Keine Steuer-/Rechtsberatung. Detailregeln (AfA-Sätze, Umqualifizierung Erhaltungs-/HK etc.) sind bewusst vereinfacht.</p>
    </div>
  );
}

// ---- Sticky Summary ----
function StickySummary({ y1Afa, y1Tax, totalAfa, horizon }: { y1Afa: number; y1Tax: number; totalAfa: number; horizon: number }) {
  return (
    <div className="sticky top-0 z-20 border-b" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)" }}>
      <div className="max-w-5xl mx-auto px-4 py-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="AfA Jahr 1" value={eur0(Math.round(y1Afa))} />
        <KpiCard label="Steuerersparnis Y1" value={eur0(Math.round(y1Tax))} />
        <KpiCard label={`Summe AfA Y1–Y${horizon}`} value={eur0(Math.round(totalAfa))} />
        <div className="flex items-center justify-end gap-2">
          <Btn variant="ghost" label="PDF (bald)" />
          <Btn variant="ghost" label="Teilen (bald)" />
        </div>
      </div>
    </div>
  );
}

// ---- Icons ----
function IconDownload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h10" />
    </svg>
  );
}

// ---- Buttons ----
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
    primary: "text-white shadow hover:shadow-md",
    secondary: "bg-white border text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent border border-transparent hover:border-slate-200 text-slate-700",
  };
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: `linear-gradient(90deg, ${BRAND}, ${ORANGE})` }
      : variant === "ghost"
      ? {}
      : {};
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} style={style}>
      {leftIcon ? <span className="opacity-90">{leftIcon}</span> : null}
      <span className="leading-none">{label}</span>
    </button>
  );
}

// ---- Preset Picker ----
function PresetPicker({ presets, apply }: { presets: Record<string, Partial<AfaInput>>; apply: (p: Partial<AfaInput>) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.keys(presets).map((k, i) => (
        <button
          key={k}
          className="px-3 py-1.5 text-xs rounded-xl border bg-white hover:bg-slate-50 shadow-sm hover:shadow"
          style={{ borderColor: i % 2 === 0 ? COLORS.primaryAlt : COLORS.accentAlt }}
          onClick={() => apply(presets[k])}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ---- Mode Toggle ----
function ModeToggle({ mode, setMode }: { mode: "basic" | "pro"; setMode: (m: "basic" | "pro") => void }) {
  return (
    <div className="inline-flex rounded-2xl border overflow-hidden bg-white shadow-sm">
      <button
        className={`px-3 py-1.5 text-xs ${mode === "basic" ? "text-white" : ""}`}
        style={mode === "basic" ? { background: BRAND } : {}}
        onClick={() => setMode("basic")}
        aria-pressed={mode === "basic"}
      >
        Einsteiger
      </button>
      <button
        className={`px-3 py-1.5 text-xs border-l ${mode === "pro" ? "text-slate-900" : ""}`}
        style={mode === "pro" ? { background: CTA } : {}}
        onClick={() => setMode("pro")}
        aria-pressed={mode === "pro"}
      >
        Pro
      </button>
    </div>
  );
}

// ---- Modernisierungen Block ----
function ModernisierungenBlock({ input, setInput }: { input: AfaInput; setInput: React.Dispatch<React.SetStateAction<AfaInput>> }) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Modernisierungen / HK</div>
        <div className="flex items-center gap-2">
          <Btn
            variant="secondary"
            label="+ Position"
            onClick={() =>
              setInput((s) => ({
                ...s,
                modernisierungen: [
                  ...s.modernisierungen,
                  { id: rid(), title: "Neu", amount: 5_000, capitalize: true, method: "linear" as AfAMethod, years: 10, proratOn: true, startMonat: 7 },
                ],
              }))
            }
          />
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-gray-500">Schnellvorlagen:</span>
            <button className="px-2 py-1 text-xs border rounded bg-white hover:bg-slate-50" onClick={() => setInput((s) => ({ ...s, modernisierungen: [...s.modernisierungen, { id: rid(), title: "Bad", amount: 10_000, capitalize: true, method: "linear", years: 10, proratOn: true, startMonat: 3 }] }))}>Bad (10J)</button>
            <button className="px-2 py-1 text-xs border rounded bg-white hover:bg-slate-50" onClick={() => setInput((s) => ({ ...s, modernisierungen: [...s.modernisierungen, { id: rid(), title: "Fenster", amount: 12_000, capitalize: true, method: "linear", years: 12, proratOn: true, startMonat: 4 }] }))}>Fenster (12J)</button>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {input.modernisierungen.map((m) => (
          <div key={m.id} className="border rounded-xl p-3">
            <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
              <TextField label="Titel" value={m.title} onChange={(v) => updateMod(m.id, { title: v }, setInput)} />
              <NumberField label="Betrag (€)" value={m.amount} onChange={(v) => updateMod(m.id, { amount: v }, setInput)} />
              <SelectField label="Methode" value={m.method} options={[{ value: "linear" as AfAMethod, label: "Linear" }, { value: "degressiv" as AfAMethod, label: "Degressiv" }, { value: "kombiniert" as AfAMethod, label: "Kombiniert" }]} onChange={(v) => updateMod(m.id, { method: v as AfAMethod }, setInput)} />
              {m.method === "linear" && <NumberField label="Jahre" value={m.years ?? 10} onChange={(v) => updateMod(m.id, { years: clamp(Math.round(v), 1, 100) }, setInput)} />}
              {m.method === "degressiv" && <PercentField label="Satz (%)" value={(m.ratePct ?? 0.05) * 100} onChange={(p) => updateMod(m.id, { ratePct: p / 100 }, setInput)} step={0.1} />}
              {m.method === "kombiniert" && (<><NumberField label="Linear (Jahre)" value={m.years ?? 5} onChange={(v) => updateMod(m.id, { years: clamp(Math.round(v), 1, 100) }, setInput)} /><PercentField label="Danach (%)" value={(m.ratePct ?? 0.05) * 100} onChange={(p) => updateMod(m.id, { ratePct: p / 100 }, setInput)} step={0.1} /></>)}
              <label className="text-xs text-gray-700 flex items-center"><input type="checkbox" className="mr-2" checked={!!m.capitalize} onChange={(e) => updateMod(m.id, { capitalize: e.target.checked }, setInput)} />kapitalisieren</label>
              <div className={`border rounded-lg p-2 ${m.capitalize ? "" : "opacity-50 pointer-events-none"}`}>
                <label className="text-xs text-gray-700 flex items-center"><input type="checkbox" className="mr-2" checked={!!m.proratOn} onChange={(e) => updateMod(m.id, { proratOn: e.target.checked }, setInput)} />pro-rata</label>
                <NumberField label="Startmonat (1–12)" value={m.startMonat ?? 1} onChange={(v) => updateMod(m.id, { startMonat: clamp(Math.round(v), 1, 12) }, setInput)} />
                <div className="text-[11px] text-gray-500 mt-1">AfA in Y1 = Jahres-AfA × {(m.proratOn ? Math.round(monthsFactor(m.startMonat ?? 1) * 12) : 12)}/12</div>
              </div>
              <div className="flex justify-end"><button className="px-2 py-1 text-xs border rounded hover:bg-slate-50" onClick={() => setInput((s) => ({ ...s, modernisierungen: s.modernisierungen.filter((x) => x.id !== m.id) }))}>Entfernen</button></div>
            </div>
          </div>
        ))}
        {input.modernisierungen.length === 0 && <p className="text-xs text-gray-500">Keine Positionen hinzugefügt.</p>}
      </div>
    </div>
  );
}

// ---- Sonder Block ----
function SonderBlock({ input, setInput }: { input: AfaInput; setInput: React.Dispatch<React.SetStateAction<AfaInput>> }) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Sonder-AfA (linear verteilt)</div>
        <Btn variant="secondary" label="+ Posten" onClick={() => setInput((s) => ({ ...s, sonder: [...s.sonder, { id: rid(), title: "Sonder", amount: 4_000, years: 4, proratOn: true, startMonat: 5 }] }))} />
      </div>
      <div className="space-y-3">
        {input.sonder.map((p) => (
          <div key={p.id} className="border rounded-xl p-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <TextField label="Titel" value={p.title} onChange={(v) => updateSonder(p.id, { title: v }, setInput)} />
              <NumberField label="Betrag (€)" value={p.amount} onChange={(v) => updateSonder(p.id, { amount: v }, setInput)} />
              <NumberField label="Jahre" value={p.years} onChange={(v) => updateSonder(p.id, { years: clamp(Math.round(v), 1, 100) }, setInput)} />
              <div className={`border rounded-lg p-2 ${p ? "" : "opacity-50 pointer-events-none"}`}>
                <label className="text-xs text-gray-700 flex items-center"><input type="checkbox" className="mr-2" checked={!!p.proratOn} onChange={(e) => updateSonder(p.id, { proratOn: e.target.checked }, setInput)} />pro-rata</label>
                <NumberField label="Startmonat (1–12)" value={p.startMonat ?? 1} onChange={(v) => updateSonder(p.id, { startMonat: clamp(Math.round(v), 1, 12) }, setInput)} />
                <div className="text-[11px] text-gray-500 mt-1">AfA in Y1 = Jahres-AfA × {(p.proratOn ? Math.round(monthsFactor(p.startMonat ?? 1) * 12) : 12)}/12</div>
              </div>
              <div className="flex justify-end"><button className="px-2 py-1 text-xs border rounded hover:bg-slate-50" onClick={() => setInput((s) => ({ ...s, sonder: s.sonder.filter((x) => x.id !== p.id) }))}>Entfernen</button></div>
            </div>
          </div>
        ))}
        {input.sonder.length === 0 && <p className="text-xs text-gray-500">Keine Sonder-AfA angesetzt.</p>}
      </div>
    </div>
  );
}

// ---- Kleine UI-Bausteine ----
function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: COLORS.slate }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>
  );
}
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm" style={{ background: `linear-gradient(135deg, #fff, ${SURFACE_ALT})` }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: BRAND }}>{value}</div>
    </div>
  );
}
function NumberField({ label, value, onChange, step = 1, help }: { label: string; value: number; onChange: (v: number) => void; step?: number; help?: string }) {
  return (
    <label className="text-sm text-gray-700 block">
      <span className="inline-flex items-center">{label}{help && <Help title={help} />}</span>
      <input
        className="mt-1 w-full border rounded-xl p-2 focus:outline-none"
        style={{ boxShadow: "inset 0 0 0 2px transparent", transition: "box-shadow 120ms" }}
        onFocus={(e)=>{ e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${CTA}55`; }}
        onBlur={(e)=>{ e.currentTarget.style.boxShadow = "inset 0 0 0 2px transparent"; }}
        type="number" step={step} inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}
function PercentField({ label, value, onChange, step = 0.1, help }: { label: string; value: number; onChange: (v: number) => void; step?: number; help?: string }) {
  return (
    <label className="text-sm text-gray-700 block">
      <span className="inline-flex items-center">{label}{help && <Help title={help} />}</span>
      <input
        className="mt-1 w-full border rounded-xl p-2 focus:outline-none"
        style={{ boxShadow: "inset 0 0 0 2px transparent", transition: "box-shadow 120ms" }}
        onFocus={(e)=>{ e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${ORANGE}55`; }}
        onBlur={(e)=>{ e.currentTarget.style.boxShadow = "inset 0 0 0 2px transparent"; }}
        type="number" step={step} inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}
function TextField({ label, value, onChange, help }: { label: string; value: string; onChange: (v: string) => void; help?: string }) {
  return (
    <label className="text-sm text-gray-700 block">
      <span className="inline-flex items-center">{label}{help && <Help title={help} />}</span>
      <input
        className="mt-1 w-full border rounded-xl p-2 focus:outline-none"
        style={{ boxShadow: "inset 0 0 0 2px transparent", transition: "box-shadow 120ms" }}
        onFocus={(e)=>{ e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${BRAND}44`; }}
        onBlur={(e)=>{ e.currentTarget.style.boxShadow = "inset 0 0 0 2px transparent"; }}
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function SelectField<T extends string>({ label, value, options, onChange, help }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; help?: string }) {
  return (
    <label className="text-sm text-gray-700 block">
      <span className="inline-flex items-center">{label}{help && <Help title={help} />}</span>
      <select
        className="mt-1 w-full border rounded-xl p-2 bg-white focus:outline-none"
        style={{ boxShadow: "inset 0 0 0 2px transparent", transition: "box-shadow 120ms" }}
        onFocus={(e)=>{ e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${CTA}55`; }}
        onBlur={(e)=>{ e.currentTarget.style.boxShadow = "inset 0 0 0 2px transparent"; }}
        value={value} onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ---- kleine Helfer ----
function updateMod(id: string, patch: Partial<Modernisierung>, setInput: React.Dispatch<React.SetStateAction<AfaInput>>) {
  setInput((s) => ({ ...s, modernisierungen: s.modernisierungen.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
}
function updateSonder(id: string, patch: Partial<SonderPosten>, setInput: React.Dispatch<React.SetStateAction<AfaInput>>) {
  setInput((s) => ({ ...s, sonder: s.sonder.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}
function rid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}
