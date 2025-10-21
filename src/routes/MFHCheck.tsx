// src/routes/MFHCheck.tsx
import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Gauge, Banknote, Sigma, Plus, Trash2, Info, RefreshCw, Download, Upload } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  LineChart, Line, CartesianGrid, Legend, LabelList, PieChart, Pie, Cell
} from "recharts";
import { eur, pct, calcMFH, type MFHInput, type MFHUnit } from "../core/calcs_mfh";

/* ---------- Brandfarben (Propora) ---------- */
const BRAND = "#1b2c47";   // Primary
const CTA = "#ffde59";     // Gelb
const ORANGE = "#ff914d";  // Orange

/* ---------------- Kleine UI-Atoms (einheitlicher Stil) ---------------- */

function Help({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center" title={title}>
      <Info className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}
function InfoBubble({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center ml-2 align-middle" title={text} aria-label={text}>
      <Info className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[var(--radius)] border border-border p-4 bg-card shadow-soft ${className}`}>{children}</div>;
}
function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-[11px] text-foreground bg-card shadow-soft" title={hint}>
      {icon} {text}
    </span>
  );
}
function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange:(n:number)=>void; step?:number }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-foreground">{label}</span>
      <input
        className="w-full rounded-[var(--radius)] border border-input bg-card text-foreground px-3 py-2"
        type="number" step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e)=>onChange(e.target.value===""?0:Number(e.target.value))}
      />
    </label>
  );
}
function PercentField({
  label, value, onChange, step = 0.001, min = 0, max = 0.95
}: { label: string; value:number; onChange:(n:number)=>void; step?:number; min?:number; max?:number }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e)=>onChange(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <span className="w-24 text-right tabular-nums text-foreground">{pct(value)}</span>
      </div>
    </label>
  );
}
function ScoreDonut({ scorePct, scoreColor, label, size = 56 }: { scorePct: number; scoreColor: string; label: "BUY"|"CHECK"|"NO"; size?: number }) {
  const rest = Math.max(0, 100 - scorePct);
  const inner = Math.round(size * 0.65);
  const outer = Math.round(size * 0.9);
  return (
    <div className="relative" style={{ width: size * 2, height: size * 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gradScoreMFH" x1="0" y1="0" x2="1" y2="1">
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
            <Cell fill="url(#gradScoreMFH)" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xl font-bold leading-5" style={{ color: scoreColor }}>{scorePct}%</div>
          <div className="text-[10px] text-muted-foreground">”ž{label}”œ</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Hauptkomponente ---------------- */

export default function MFHCheck() {
  // Eingaben (Defaults)
  const [kaufpreis, setKaufpreis] = React.useState(1_200_000);
  const [einheiten, setEinheiten] = React.useState<MFHUnit[]>([
    { name: "WE 1", flaecheM2: 60, mieteProM2: 12.5 },
    { name: "WE 2", flaecheM2: 55, mieteProM2: 12.0 },
    { name: "WE 3", flaecheM2: 70, mieteProM2: 11.8 },
  ]);
  const [leerstandPct, setLeerstandPct] = React.useState(0.05);
  const [opexUmPct, setOpexUmPct] = React.useState(0.18);
  const [opexNichtUmPct, setOpexNichtUmPct] = React.useState(0.10);
  const [capexResPEM, setCapexResPEM] = React.useState(25);
  const [sonstErtraegeJahr, setSonstErtraegeJahr] = React.useState(1200);

  // NK (Split)
  const [nkGrEStPct, setNkGrEStPct] = React.useState(0.065);
  const [nkNotarPct, setNkNotarPct] = React.useState(0.015);
  const [nkGrundbuchPct, setNkGrundbuchPct] = React.useState(0.005);
  const [nkMaklerPct, setNkMaklerPct] = React.useState(0.0357);
  const [nkSonstPct, setNkSonstPct] = React.useState(0);
  const nkPct = nkGrEStPct + nkNotarPct + nkGrundbuchPct + nkMaklerPct + nkSonstPct;

  // Finanzierung (Annuität ~ Zins+Tilgung)
  const [on, setOn] = React.useState(true);
  const [mode, setMode] = React.useState<"LTV"|"EK">("LTV");
  const [ltvPct, setLtvPct] = React.useState(0.8);
  const [ekEuro, setEkEuro] = React.useState(300_000);
  const [zinsPct, setZinsPct] = React.useState(0.039);
  const [tilgungPct, setTilgungPct] = React.useState(0.02);

  // Bewertung + Playground
  const [capRatePct, setCapRatePct] = React.useState(0.055);
  const [usePG, setUsePG] = React.useState(true);
  const [priceAdjPct, setPriceAdjPct] = React.useState(0);
  const [rentAdjPct, setRentAdjPct] = React.useState(0);
  const [vacAdjPct, setVacAdjPct] = React.useState(0);

  // Eingabemodell
  const input: MFHInput = {
    kaufpreis,
    einheiten,
    leerstandPct,
    opexUmlagefaehigPctBrutto: opexUmPct,
    opexNichtUmlagefaehigPctBrutto: opexNichtUmPct,
    capexReserveEuroProEinheitMonat: capexResPEM,
    sonstErtraegeEuroJahr: sonstErtraegeJahr,
    nkPct,
    finance: { mode, ltvPct, eigenkapitalEuro: ekEuro, zinsPct, tilgungPct, on },
    capRatePct,
    pg: { useInValuation: usePG, priceAdjPct, rentAdjPct, vacAdjPct },
  };

  // Result
  const view = React.useMemo(()=>calcMFH(input), [JSON.stringify(input)]);

  // Einheiten-Helpers
  function updUnit(idx:number, patch: Partial<MFHUnit>){
    setEinheiten(list => list.map((u,i)=> i===idx ? {...u, ...patch} : u));
  }
  function addUnit(){ setEinheiten(list => [...list, { name: `WE ${list.length+1}`, flaecheM2: 50, mieteProM2: 11 }]); }
  function delUnit(i:number){ setEinheiten(list => list.filter((_,idx)=>idx!==i)); }

  // Ableitungen für Anzeigen
  const totalUnits = view.einheiten.length;
  const totalM2 = view.einheiten.reduce((s,u)=>s+u.flaecheM2,0);
  const bruttoRentMonth = view.mieteJahrBrutto / 12;
  const effRentMonth = view.mieteJahrEff / 12;
  const avgRentPerM2 = totalM2>0 ? (bruttoRentMonth / totalM2) : 0;

  // Für Hilfetexte €/Monat
  const opexUmMonth = bruttoRentMonth * opexUmPct;
  const opexNichtUmMonth = bruttoRentMonth * opexNichtUmPct;

  // Score-Visual
  const scorePct = Math.round(
    (view.scoreLabel==="BUY" ? 0.75 : view.scoreLabel==="CHECK" ? 0.55 : 0.3) * 100
  );
  const scoreColor = view.scoreLabel==="BUY" ? "#16a34a" : view.scoreLabel==="CHECK" ? "#f59e0b" : "#ef4444";

  // Playground-Grenzen (Vac-Adj hängt von leerstandPct ab)
  React.useEffect(() => {
    const min = -leerstandPct;
    const max = 0.95 - leerstandPct;
    if (vacAdjPct < min) setVacAdjPct(min);
    if (vacAdjPct > max) setVacAdjPct(max);
  }, [leerstandPct]); // eslint-disable-line react-hooks/exhaustive-deps

  // Charts
  const gapPositive = view.priceGap >= 0;
  const valueChart = [{ name: "Objekt", Preis: Math.round(view.kaufpreisEff), Wert: Math.round(view.valueNOI) }];

  const projection = view.proj.map(p=>({
    year: p.year,
    Cashflow: Math.round(p.cf),
    Tilgung: Math.round(p.tilgung),
    VermÃgen: Math.round(p.vermoegen)
  }));

  // Export/Import (State)
  function exportJson() {
    const payload = {
      kaufpreis, einheiten,
      leerstandPct, opexUmPct, opexNichtUmPct, capexResPEM, sonstErtraegeJahr,
      nkGrEStPct, nkNotarPct, nkGrundbuchPct, nkMaklerPct, nkSonstPct,
      on, mode, ltvPct, ekEuro, zinsPct, tilgungPct,
      capRatePct, usePG, priceAdjPct, rentAdjPct, vacAdjPct
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mfh-check.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setKaufpreis(num(d.kaufpreis, kaufpreis));
        setEinheiten(Array.isArray(d.einheiten) ? d.einheiten.map((u:any)=>({
          name: String(u.name ?? "WE"), flaecheM2: num(u.flaecheM2, 0), mieteProM2: num(u.mieteProM2, 0)
        })) : einheiten);
        setLeerstandPct(num(d.leerstandPct, leerstandPct));
        setOpexUmPct(num(d.opexUmPct, opexUmPct));
        setOpexNichtUmPct(num(d.opexNichtUmPct, opexNichtUmPct));
        setCapexResPEM(num(d.capexResPEM, capexResPEM));
        setSonstErtraegeJahr(num(d.sonstErtraegeJahr, sonstErtraegeJahr));
        setNkGrEStPct(num(d.nkGrEStPct, nkGrEStPct));
        setNkNotarPct(num(d.nkNotarPct, nkNotarPct));
        setNkGrundbuchPct(num(d.nkGrundbuchPct, nkGrundbuchPct));
        setNkMaklerPct(num(d.nkMaklerPct, nkMaklerPct));
        setNkSonstPct(num(d.nkSonstPct, nkSonstPct));
        setOn(Boolean(d.on));
        setMode(d.mode==="EK"?"EK":"LTV");
        setLtvPct(num(d.ltvPct, ltvPct));
        setEkEuro(num(d.ekEuro, ekEuro));
        setZinsPct(num(d.zinsPct, zinsPct));
        setTilgungPct(num(d.tilgungPct, tilgungPct));
        setCapRatePct(num(d.capRatePct, capRatePct));
        setUsePG(Boolean(d.usePG));
        setPriceAdjPct(num(d.priceAdjPct, priceAdjPct));
        setRentAdjPct(num(d.rentAdjPct, rentAdjPct));
        setVacAdjPct(num(d.vacAdjPct, vacAdjPct));
      } catch { alert("Ungültige Datei"); }
    };
    r.readAsText(file);
  }

  function signedPct(x: number) {
    const v = Math.round(x * 100);
    return (x > 0 ? "+" : "") + v + "%";
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-surface text-foreground">
      {/* Inhalt: zusätzliches Padding unten für den sticky Footer */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-40">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-brand">Mehrfamilienhaus – Check</h1>
            <p className="text-sm text-muted-foreground">Rent Roll, Opex/CapEx, Finanzierung & Bewertung – alles reagiert live.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-[var(--radius)] text-sm inline-flex items-center gap-2 bg-card border border-border shadow-soft hover:shadow-medium transition"
              onClick={()=>{
                setKaufpreis(1_200_000);
                setEinheiten([
                  { name: "WE 1", flaecheM2: 60, mieteProM2: 12.5 },
                  { name: "WE 2", flaecheM2: 55, mieteProM2: 12.0 },
                  { name: "WE 3", flaecheM2: 70, mieteProM2: 11.8 },
                ]);
                setLeerstandPct(0.05); setOpexUmPct(0.18); setOpexNichtUmPct(0.10);
                setCapexResPEM(25); setSonstErtraegeJahr(1200);
                setNkGrEStPct(0.065); setNkNotarPct(0.015); setNkGrundbuchPct(0.005); setNkMaklerPct(0.0357); setNkSonstPct(0);
                setOn(true); setMode("LTV"); setLtvPct(0.8); setEkEuro(300000); setZinsPct(0.039); setTilgungPct(0.02);
                setCapRatePct(0.055); setUsePG(true); setPriceAdjPct(0); setRentAdjPct(0); setVacAdjPct(0);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Beispiel
            </button>
            <button className="px-3 py-2 rounded-[var(--radius)] text-sm inline-flex items-center gap-2 bg-card border border-border shadow-soft hover:shadow-medium transition" onClick={exportJson}>
              <Download className="h-4 w-4" /> Export
            </button>
            <label className="px-3 py-2 rounded-[var(--radius)] text-sm inline-flex items-center gap-2 bg-card border border-border shadow-soft hover:shadow-medium transition cursor-pointer">
              <Upload className="h-4 w-4" /> Import
              <input type="file" className="hidden" accept="application/json" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importJson(f);}} />
            </label>
          </div>
        </div>

        {/* Eingaben */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Eingaben</h2>
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis}/>
              {/* Leerstand */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Leerstand (Quote)</span>
                <InfoBubble text="Prozentualer Ertragsausfall auf die Bruttokaltmiete (z. B. Fluktuation, Neuvermietung)." />
              </div>
              <PercentField label="Leerstand" value={leerstandPct} onChange={setLeerstandPct} min={0} max={0.95}/>

              {/* Betriebskosten */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Umlagefähige BK (als Anteil der Bruttokaltmiete)</span>
                <InfoBubble text="Werden auf Mieter umgelegt (neutral für Eigentümer-CF). BezugsgrÃße: Bruttokaltmiete." />
              </div>
              <PercentField
                label={`Umlagefähige BK · ≈ ${eur(Math.round(opexUmMonth))} / Monat gesamt`}
                value={opexUmPct}
                onChange={setOpexUmPct}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Nicht umlagefähige BK (als Anteil der Bruttokaltmiete)</span>
                <InfoBubble text="Trägt der Eigentümer: Verwaltung, laufende Instandhaltung, Versicherungen etc. Wirkt auf NOI/CF." />
              </div>
              <PercentField
                label={`Nicht umlagefähige BK · ≈ ${eur(Math.round(opexNichtUmMonth))} / Monat gesamt`}
                value={opexNichtUmPct}
                onChange={setOpexNichtUmPct}
              />

              {/* CapEx-Reserve & Erträge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">CapEx-Reserve (€/Einheit/Monat)</span>
                <InfoBubble text="Rücklage für grÃßere Instandsetzungen (Dach, Heizung, Strangsanierung). Geht in den NOI ein." />
              </div>
              <NumberField label="CapEx-Reserve" value={capexResPEM} onChange={setCapexResPEM}/>

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Sonstige Erträge (€/Jahr)</span>
                <InfoBubble text="z. B. Stellplätze, Waschmarken, Antennen-/Werbeflächen, Dachpacht." />
              </div>
              <NumberField label="Betrag (€/Jahr)" value={sonstErtraegeJahr} onChange={setSonstErtraegeJahr}/>

              {/* NK-Split */}
              <div className="text-sm font-medium mt-1 text-foreground">Kaufnebenkosten (Split)</div>
              <PercentField label="Grunderwerbsteuer (%)" value={nkGrEStPct} onChange={setNkGrEStPct} step={0.0005}/>
              <PercentField label="Notar (%)" value={nkNotarPct} onChange={setNkNotarPct} step={0.0005}/>
              <PercentField label="Grundbuch (%)" value={nkGrundbuchPct} onChange={setNkGrundbuchPct} step={0.0005}/>
              <PercentField label="Makler (%)" value={nkMaklerPct} onChange={setNkMaklerPct} step={0.0005}/>
              <PercentField label="Sonstiges/Puffer (%)" value={nkSonstPct} onChange={setNkSonstPct} step={0.0005}/>
              <div className="text-xs text-muted-foreground">Summe NK: <b>{pct(nkPct)}</b></div>
            </div>
          </Card>

          {/* Rent Roll */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Einheiten (Rent Roll)</h3>
              <button onClick={addUnit} className="text-sm inline-flex items-center gap-2 px-2 py-1 rounded-[var(--radius)] border border-border bg-card hover:shadow-soft">
                <Plus className="h-4 w-4"/> Einheit hinzufügen
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {einheiten.map((u, i)=>(
                <div key={i} className="grid grid-cols-6 gap-2 items-end">
                  <label className="col-span-2 text-sm grid gap-1">
                    <span className="text-foreground">Name</span>
                    <input className="rounded-[var(--radius)] border border-input bg-card text-foreground px-3 py-2" value={u.name} onChange={(e)=>updUnit(i,{name:e.target.value})}/>
                  </label>
                  <NumberField label="m²" value={u.flaecheM2} onChange={(v)=>updUnit(i,{flaecheM2:v})}/>
                  <NumberField label="€/m²/Monat" value={u.mieteProM2} onChange={(v)=>updUnit(i,{mieteProM2:v})} step={0.1}/>
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">Miete (€/Monat)</div>
                    <div className="font-medium tabular-nums text-foreground">{eur(Math.round(u.flaecheM2*u.mieteProM2))}</div>
                  </div>
                  <button onClick={()=>delUnit(i)} className="justify-self-end inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded-[var(--radius)]">
                    <Trash2 className="h-4 w-4"/> Entfernen
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Zusammenfassung */}
          <Card>
            <div className="text-sm font-medium mb-2 text-foreground">Zusammenfassung</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[var(--radius)] border border-border p-3 bg-card shadow-soft">
                <div className="text-xs text-muted-foreground">Einheiten</div>
                <div className="text-lg font-semibold text-foreground">{totalUnits}</div>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-3 bg-card shadow-soft">
                <div className="text-xs text-muted-foreground">Gesamtfläche</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{totalM2.toLocaleString("de-DE")} m²</div>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-3 bg-card shadow-soft">
                <div className="text-xs text-muted-foreground">Ø Kaltmiete</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{avgRentPerM2.toFixed(2)} €/m²</div>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-3 bg-card shadow-soft">
                <div className="text-xs text-muted-foreground">Miete mtl. (brutto / effektiv)</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  {eur(Math.round(bruttoRentMonth))} <span className="text-xs text-muted-foreground">/</span> <span className="text-green-700">{eur(Math.round(effRentMonth))}</span>
                </div>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-3 bg-card shadow-soft">
                <div className="text-xs text-muted-foreground">Nebenkosten (NK)</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{eur(Math.round(view.nkSum))}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Quote: {pct(nkPct)}</div>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-3 bg-card shadow-soft">
                <div className="text-xs text-muted-foreground">All-in (Kaufpreis + NK)</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{eur(Math.round(view.kaufpreisEff + view.nkSum))}</div>
              </div>
            </div>
          </Card>

          {/* Finanzierung */}
          <Card>
            <div className="flex items-center justify-between">
              <label className="text-sm inline-flex items-center gap-2 text-foreground">
                <input type="checkbox" checked={on} onChange={(e)=>setOn(e.target.checked)}/>
                Finanzierung berücksichtigen
              </label>
              <div className="text-xs text-muted-foreground">Annuität ≈ (Zins + Tilgung) · Darlehen</div>
            </div>
            {on && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="flex items-center gap-4 text-sm">
                  <label className="inline-flex items-center gap-2 text-foreground">
                    <input type="radio" name="finmod" checked={mode==="LTV"} onChange={()=>setMode("LTV")}/> LTV
                  </label>
                  <label className="inline-flex items-center gap-2 text-foreground">
                    <input type="radio" name="finmod" checked={mode==="EK"} onChange={()=>setMode("EK")}/> Eigenkapital €
                  </label>
                </div>
                {mode==="LTV"
                  ? <PercentField label="LTV (%)" value={ltvPct} onChange={setLtvPct}/>
                  : <NumberField label="Eigenkapital (€)" value={ekEuro} onChange={setEkEuro}/>}
                <PercentField label="Zins p.a. (%)" value={zinsPct} onChange={setZinsPct}/>
                <PercentField label="Tilgung p.a. (%)" value={tilgungPct} onChange={setTilgungPct}/>
                <div className="text-xs text-muted-foreground">
                  Abgeleiteter LTV: <b>{pct(view.ltv)}</b> ”¢ Darlehen: <b>{eur(Math.round(view.darlehen))}</b> ”¢ NK: <b>{eur(Math.round(view.nkSum))}</b>
                </div>
              </div>
            )}
          </Card>

          {/* Bewertung & Profit-Spielplatz */}
          <Card>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Cap Rate
                  <InfoBubble text="Einfache Markt-Renditekennzahl: Wert ≈ NOI / Cap Rate. HÃhere Cap = niedrigerer Wert (c.p.)." />
                </span>
                <span className="text-xs text-muted-foreground">steigt ⇒ Wert sinkt</span>
              </div>
              <PercentField label="Cap Rate (%)" value={capRatePct} onChange={setCapRatePct} step={0.0005} min={0.02} max={0.12} />

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">Profit-Spielplatz</div>
                <label className="text-xs inline-flex items-center gap-2 text-foreground">
                  <input type="checkbox" checked={usePG} onChange={(e)=>setUsePG(e.target.checked)}/> in Bewertung verwenden
                </label>
              </div>

              <PercentField
                label={`Kaufpreis ±% · aktuell: ${eur(Math.round(view.kaufpreisEff))}`}
                value={priceAdjPct}
                onChange={setPriceAdjPct}
                step={0.005}
                min={-0.3}
                max={0.3}
              />
              <div className="text-xs text-muted-foreground -mt-2">{signedPct(priceAdjPct)} = {eur(Math.round(kaufpreis * (1 + priceAdjPct)))}</div>

              <PercentField
                label={`Mieten ±% · Ø jetzt: ${(avgRentPerM2).toFixed(2)} €/m²`}
                value={rentAdjPct}
                onChange={setRentAdjPct}
                step={0.005}
                min={-0.2}
                max={0.4}
              />
              <div className="text-xs text-muted-foreground -mt-2">{signedPct(rentAdjPct)} = {(avgRentPerM2 * (1 + rentAdjPct)).toFixed(2)} €/m²</div>

              <PercentField
                label="Leerstand ±%-Punkte"
                value={vacAdjPct}
                onChange={setVacAdjPct}
                step={0.005}
                min={-leerstandPct}
                max={0.95 - leerstandPct}
              />
              <div className="text-xs text-muted-foreground -mt-2">effektiv: {pct(Math.max(0, Math.min(0.95, leerstandPct + vacAdjPct)))}</div>
            </div>
          </Card>
        </section>

        {/* Wert vs. Kaufpreis */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Wert (NOI/Cap) vs. Kaufpreis</h2>
          <div className="relative">
            <Card className="overflow-hidden">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valueChart} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="gradPreis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} />
                        <stop offset="100%" stopColor="#2a446e" />
                      </linearGradient>
                      <linearGradient id="gradWert"  x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CTA} />
                        <stop offset="100%" stopColor={ORANGE} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v:any)=>v.toLocaleString("de-DE")} />
                    <RTooltip formatter={(v:any)=>eur(v)} />
                    <Legend />
                    <Bar dataKey="Preis" fill="url(#gradPreis)" radius={[10,10,0,0]}>
                      <LabelList dataKey="Preis" position="top" formatter={(v:any)=>eur(v)} />
                    </Bar>
                    <Bar dataKey="Wert"  fill="url(#gradWert)"  radius={[10,10,0,0]}>
                      <LabelList dataKey="Wert"  position="top" formatter={(v:any)=>eur(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <motion.span
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className={
                "absolute -top-3 right-3 px-2 py-1 rounded-full text-xs border " +
                (gapPositive ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")
              }
            >
              {gapPositive ? "Unter Wert" : "Über Wert"} · {eur(Math.abs(Math.round(view.priceGap)))}
            </motion.span>
          </div>
        </section>

        {/* Projektion */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Projektion (10 Jahre)</h2>
          <Card className="overflow-hidden">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v:any)=>v.toLocaleString("de-DE")} />
                  <RTooltip formatter={(v:any)=>eur(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Cashflow" name="Cashflow p.a." stroke={BRAND} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Tilgung"  name="Tilgung p.a."  stroke={CTA} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="VermÃgen" name="VermÃgenszuwachs p.a." stroke={ORANGE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Monatsrechnung (Y1) */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Monatsrechnung (Jahr 1)</h2>
          <Card>
            <ul className="text-sm text-foreground space-y-1">
              <li>Eff. Nettokaltmiete (mtl.): <b>{eur(Math.round(view.mieteJahrEff/12))}</b></li>
              <li>Nicht umlagefähige BK (mtl.): <b>{eur(Math.round(view.opexNichtUmJahr/12))}</b></li>
              <li>CapEx-Reserve (mtl.): <b>{eur(Math.round(view.capexReserveJahr/12))}</b></li>
              {view.sonstErtraegeJahr > 0 && (<li>Sonstige Erträge (mtl.): <b>{eur(Math.round(view.sonstErtraegeJahr/12))}</b></li>)}
              {view.annuitaetJahr > 0 && (
                <>
                  <li>Zinsen (mtl.): <b>{eur(Math.round(view.zinsJahr/12))}</b></li>
                  <li>Tilgung (mtl.): <b>{eur(Math.round(view.tilgungJahr/12))}</b></li>
                </>
              )}
              <li>= Cashflow operativ (mtl.): <b>{eur(Math.round(view.cfMonat))}</b></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Hinweis: NOI = Eff. Miete + sonst. Erträge ’ nicht umlagefähige BK ’ CapEx-Reserve (ohne Steuern).
            </p>
          </Card>
        </section>

        {/* Break-even & Zusatz-KPIs */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Break-even</h2>
          <Card>
            <div className="text-sm text-foreground mb-2">
              <p><b>Was bedeutet Break-even?</b> Ab dieser Grenze ist der monatliche Cashflow (vor Steuern) nicht negativ. Liegt der Kaufpreis darüber oder die Miete darunter, rutscht der Cashflow ins Minus.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-foreground">
              <div className="flex items-center justify-between">
                <span>Max. Kaufpreis für CF = 0</span>
                <b>{view.breakEvenPrice!=null? eur(view.breakEvenPrice) : "– (nur mit Finanzierung berechenbar)"}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>BenÃtigte Ø-Miete je m²</span>
                <b>{view.breakEvenRentPerM2.toFixed(2)} €/m²</b>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-sm text-foreground mb-2"><b>Weitere Bank-/EK-Kennzahlen</b></div>
            <div className="grid grid-cols-1 gap-2 text-sm text-foreground">
              <div className="flex items-center justify-between">
                <span>Debt Yield <InfoBubble text="NOI / Darlehen. HÃher = sicherer aus Sicht der Bank." /></span>
                <b>{view.debtYield!=null? pct(view.debtYield):"–"}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>Cash-on-Cash <InfoBubble text="Jährlicher Cashflow / (eingesetztes EK inkl. NK). Zeigt die EK-Rendite." /></span>
                <b>{view.cashOnCash!=null? pct(view.cashOnCash):"–"}</b>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* ---------- Sticky Ergebnis-Footer ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-[var(--radius)] border border-border shadow-lg bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="p-3 flex items-center justify-between gap-3">
              {/* Links: Entscheidung + Badges */}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Ergebnis <span className="text-[11px] text-muted-foreground">(live)</span></div>
                <div className="text-sm font-semibold truncate text-foreground">
                  Entscheidung: {view.scoreLabel==="BUY" ? "Kaufen (unter Vorbehalt)" : view.scoreLabel==="CHECK" ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge icon={<Banknote className="h-3.5 w-3.5" />} text={eur(Math.round(view.cfMonat)) + " mtl."} hint="Cashflow (Y1)" />
                  <Badge icon={<Gauge className="h-3.5 w-3.5" />} text={`NOI-Yield ${pct(view.noiYield)}`} hint="NOI / Kaufpreis" />
                  <Badge icon={<Sigma className="h-3.5 w-3.5" />} text={`DSCR ${view.dscr?view.dscr.toFixed(2):"–"}`} hint="NOI / Schuldienst" />
                </div>
              </div>
              {/* Rechts: Score-Donut */}
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={view.scoreLabel} size={42} />
            </div>
            {/* Progress-Bar als spielerisches Element */}
            <div className="h-1.5 w-full rounded-b-[var(--radius)] overflow-hidden bg-surface">
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
}

/* ---------------- Utils ---------------- */
function num(x:any, fb:number){ const v=Number(x); return Number.isFinite(v)?v:fb; }


