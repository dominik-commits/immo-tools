// src/routes/Finanzierung.tsx
// Finanzierung (Propora PRO) – v1.5
// + Sondertilgung mit Bank-Grenzwert (% vom Ursprungsdarlehen p.a.)
// + Ziel-Restschuld zum Ende der Zinsbindung (KPI + Delta)

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Legend, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList
} from "recharts";
import PlanGuard from "@/components/PlanGuard";

/* ============ Farben & Helpers ============ */
const COLORS = {
  primary: "#2563eb", indigo: "#4f46e5",
  emerald: "#10b981", amber: "#f59e0b", rose: "#f43f5e",
  slate: "#64748b"
};
const eur0 = (n:number)=> n.toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const eur  = (n:number)=> n.toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:2});
const clamp = (n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const nice = (n:number)=>Math.round(n);

/* ============ Types ============ */
type JahresRow = {
  year:number; kalenderjahr:number;
  zins:number; tilgung:number; sonder:number;
  rateSum:number; restschuld:number;
};
type SonderMode = "EUR"|"PCT";
type Input = {
  // Kauf & NK
  kaufpreis:number; grunderwerbPct:number; notarPct:number; maklerPct:number; sonstKosten:number;
  eigenkapital:number;

  // Darlehen
  zinsSollPct:number; tilgungStartPct:number; zinsbindungJahre:number;

  // Planung
  laufzeitJahre:number;

  // Sondertilgung
  sonderOn:boolean; sonderMode:SonderMode; sonderAmount:number; // € p.a. ODER % (0..1)
  sonderStartYear:number; sonderEndYear:number;

  // NEU: Bank-Grenze
  sonderCapOn:boolean; sonderCapPct:number; // 0..1 (max % vom Ursprung p.a.)

  // NEU: Ziel-Restschuld zum Ende Zinsbindung
  zielRestAtFix:number; // € (0 = kein Ziel)
};

const DRAFT_KEY = "finance.tool.v1.5";

/* ============ Page Wrapper ============ */
export default function Finanzierung(){
  return (
    <PlanGuard required="pro">
      <FinanzierungInner/>
    </PlanGuard>
  );
}

/* ============ Component ============ */
function FinanzierungInner(){
  const [input,setInput] = useState<Input>(()=>{
    try{ const raw=localStorage.getItem(DRAFT_KEY); if(raw) return JSON.parse(raw) as Input; }catch{}
    return {
      kaufpreis:400_000, grunderwerbPct:0.05, notarPct:0.015, maklerPct:0, sonstKosten:2500,
      eigenkapital:120_000,
      zinsSollPct:0.038, tilgungStartPct:0.02, zinsbindungJahre:10,
      laufzeitJahre:30,

      sonderOn:false, sonderMode:"EUR", sonderAmount:5000,
      sonderStartYear:2, sonderEndYear:10,

      sonderCapOn:false, sonderCapPct:0.05,   // z. B. max. 5% p.a. der Bank
      zielRestAtFix:0
    };
  });
  const [showGlossary,setShowGlossary] = useState(false);
  useEffect(()=>{ try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(input)); }catch{} },[input]);

  /* === NK & Darlehen === */
  const nk = useMemo(()=>{
    const ge = input.kaufpreis * clamp(input.grunderwerbPct,0,0.15);
    const no = input.kaufpreis * clamp(input.notarPct,0,0.05);
    const ma = input.kaufpreis * clamp(input.maklerPct,0,0.08);
    return { ge,no,ma,total: ge+no+ma+Math.max(0,input.sonstKosten) };
  },[input]);
  const kapitalbedarf = useMemo(()=> input.kaufpreis + nk.total ,[input.kaufpreis, nk.total]);
  const darlehen      = useMemo(()=> Math.max(0, kapitalbedarf - Math.max(0,input.eigenkapital)),[kapitalbedarf,input.eigenkapital]);
  const ltv           = useMemo(()=> input.kaufpreis>0 ? darlehen/input.kaufpreis : 0 ,[darlehen,input.kaufpreis]);

  // vereinfachte Start-Annuität
  const annuitaetMonat = useMemo(()=> (darlehen*(input.zinsSollPct+input.tilgungStartPct))/12 ,[darlehen,input.zinsSollPct,input.tilgungStartPct]);

  /* === Tilgungsplan + Sonder (mit Bank-Grenze) === */
  const schedule = useMemo<JahresRow[]>(()=>{
    const principal0 = darlehen;
    const H = clamp(Math.round(input.laufzeitJahre),1,50);
    const startYear = new Date().getFullYear();
    const i_m = input.zinsSollPct/12;
    const A   = annuitaetMonat;

    const sonderPerYearAbs = (origin:number, year:number)=>{
      if(!input.sonderOn) return 0;
      if(year<input.sonderStartYear || year>input.sonderEndYear) return 0;
      let wish = (input.sonderMode==="EUR")
        ? Math.max(0,input.sonderAmount)
        : Math.max(0, origin * clamp(input.sonderAmount,0,1));
      if(input.sonderCapOn){
        const cap = origin * clamp(input.sonderCapPct,0,1);
        wish = Math.min(wish, cap);
      }
      return wish;
    };

    let rest = principal0;
    const years:JahresRow[] = [];

    for(let y=1; y<=H; y++){
      let zinsJ=0, tilgJ=0, rateJ=0;

      for(let m=1; m<=12; m++){
        if(rest<=0.01) break;
        const z = rest*i_m;
        const tilg = Math.max(0, A - z);
        rest = Math.max(0, rest - tilg);
        zinsJ += z; tilgJ += tilg; rateJ += z+tilg;
      }

      let sonder = 0;
      if(rest>0){
        const wish = sonderPerYearAbs(principal0, y);
        if(wish>0){ sonder = Math.min(rest, wish); rest = Math.max(0, rest - sonder); }
      }

      years.push({ year:y, kalenderjahr:startYear+(y-1), zins:zinsJ, tilgung:tilgJ, sonder, rateSum:rateJ, restschuld:rest });

      if(rest<=0.01){
        for(let k=y+1; k<=H; k++){
          years.push({ year:k, kalenderjahr:startYear+(k-1), zins:0, tilgung:0, sonder:0, rateSum:0, restschuld:0 });
        }
        break;
      }
    }
    return years;
  },[
    darlehen, input.laufzeitJahre, input.zinsSollPct, annuitaetMonat,
    input.sonderOn, input.sonderMode, input.sonderAmount,
    input.sonderStartYear, input.sonderEndYear, input.sonderCapOn, input.sonderCapPct
  ]);

  /* === KPIs === */
  const totalZins   = useMemo(()=> schedule.reduce((s,r)=>s+r.zins,0),[schedule]);
  const totalTilg   = useMemo(()=> schedule.reduce((s,r)=>s+r.tilgung,0),[schedule]);
  const totalSonder = useMemo(()=> schedule.reduce((s,r)=>s+r.sonder,0),[schedule]);

  const first = schedule[0];
  const rateBadge = useMemo(()=>{
    const z1=first?.zins??0, t1=first?.tilgung??0; const sum=z1+t1; const p=sum>0?z1/sum:0;
    if(p>0.6) return {text:"Rate: überwiegend Zinsen", color:COLORS.rose};
    if(p<0.4) return {text:"Rate: überwiegend Tilgung", color:COLORS.emerald};
    return {text:"Rate: ausgewogen", color:COLORS.amber};
  },[first]);

  const ltvState = useMemo(()=>{
    if(ltv<=0.6) return {label:"sehr komfortabel", color:COLORS.emerald};
    if(ltv<=0.8) return {label:"komfortabel",       color:COLORS.emerald};
    if(ltv<=0.9) return {label:"ok",                 color:COLORS.amber};
    return {label:"angespannt", color:COLORS.rose};
  },[ltv]);

  const bodenfehler = input.eigenkapital > kapitalbedarf;

  // NEU: Restschuld zum Ende Zinsbindung (+ Delta zum Ziel)
  const idxFix = clamp(Math.round(input.zinsbindungJahre),1, Math.max(1, schedule.length));
  const restAtFix = schedule[idxFix-1]?.restschuld ?? 0;
  const zielRest = Math.max(0, input.zielRestAtFix||0);
  const restDelta = zielRest>0 ? restAtFix - zielRest : 0; // >0 = über Ziel, <0 = unter Ziel
  const zielState = zielRest>0
    ? (restAtFix<=zielRest ? {label:"unter Ziel", color:COLORS.emerald} : {label:"über Ziel", color:COLORS.rose})
    : null;

  /* === Export === */
  function exportJson(){
    const blob=new Blob([JSON.stringify(input,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="finanzierung-config.json"; a.click(); URL.revokeObjectURL(url);
  }
  function exportCsv(){
    const header=["Jahr","Kalenderjahr","Zinsen","Tilgung","Sondertilgung","Summe Raten","Restschuld"];
    const rows = schedule.map(r=>[r.year,r.kalenderjahr,nice(r.zins),nice(r.tilgung),nice(r.sonder),nice(r.rateSum),nice(r.restschuld)]);
    const csv=[header.join(";")].concat(rows.map(cols=>cols.join(";"))).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="tilgungsplan.csv"; a.click(); URL.revokeObjectURL(url);
  }

  /* === UI === */
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Finanzierung
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">v1.5</span>
          </h2>
          <p className="text-sm text-muted-foreground">Kauf- & Nebenkosten, Annuität, Restschuld – inkl. Sondertilgung (mit Bank-Grenze) & Ziel-Restschuld.</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn label="Glossar" variant="ghost" onClick={()=>setShowGlossary(true)}/>
          <Btn label="JSON" leftIcon={<IconDownload/>} onClick={exportJson}/>
          <Btn label="CSV"  leftIcon={<IconDoc/>}      variant="secondary" onClick={exportCsv}/>
        </div>
      </div>

      {/* Kurz erklärt */}
      <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-emerald-50 p-4 space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#2563eb] text-white text-[11px]">i</span>
          Kurz erklärt
        </div>
        <ul className="text-sm text-foreground space-y-1 ml-1">
          <li><b>Kapitalbedarf</b> = Kaufpreis + Nebenkosten (Steuer, Notar, ggf. Makler).</li>
          <li><b>Darlehen</b> = Kapitalbedarf – Eigenkapital.</li>
          <li><b>Monatsrate</b> ≈ (Sollzins + anfängliche Tilgung) Ã— Darlehen / 12.</li>
          <li><b>Sondertilgung</b> reduziert die Restschuld am Jahresende; Bank-Grenze limitiert den Betrag (z. B. 5 % p.a.).</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <KpiCard label="Kapitalbedarf" value={eur0(kapitalbedarf)} />
        <KpiCard label="Eigenkapital" value={eur0(input.eigenkapital)} />
        <KpiCard label="Darlehen" value={eur0(darlehen)} />
        <KpiCard label="Monatsrate (Start)" value={eur(annuitaetMonat)} />
        <KpiBadge label={`LTV ${(ltv*100).toFixed(0)} %`} value={ltvState.label} color={ltvState.color}/>
      </div>

      {/* Schnellstart */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="text-sm font-medium mb-2">Schnellstart</div>
        <QuickChips setInput={setInput}/>
      </div>

      {/* Eingaben */}
      <div className="rounded-2xl bg-card border shadow-soft p-4 space-y-5">
        <div className="text-sm font-medium">Kauf & Nebenkosten</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NumberField label="Kaufpreis (€)" value={input.kaufpreis} onChange={(v)=>setInput(s=>({...s,kaufpreis:v}))}/>
          <PercentField label="Grunderwerbsteuer (%)" value={input.grunderwerbPct*100} onChange={(p)=>setInput(s=>({...s,grunderwerbPct:clamp(p,0,100)/100}))}/>
          <PercentField label="Notar/Grundbuch (%)" value={input.notarPct*100} onChange={(p)=>setInput(s=>({...s,notarPct:clamp(p,0,100)/100}))}/>
          <PercentField label="Makler (%)" value={input.maklerPct*100} onChange={(p)=>setInput(s=>({...s,maklerPct:clamp(p,0,100)/100}))}/>
          <NumberField label="Sonstige Kosten (€)" value={input.sonstKosten} onChange={(v)=>setInput(s=>({...s,sonstKosten:v}))}/>
        </div>
        <div className="text-xs text-muted-foreground">Nebenkosten ≈ {eur0(nk.total)} (GrESt {eur0(nk.ge)}, Notar {eur0(nk.no)}, Makler {eur0(nk.ma)}, sonst. {eur0(input.sonstKosten)})</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NumberField label="Eigenkapital (€)" value={input.eigenkapital} onChange={(v)=>setInput(s=>({...s,eigenkapital:v}))}/>
          {bodenfehler && <div className="md:col-span-3 text-xs text-rose-600 self-end">Eigenkapital übersteigt Kapitalbedarf – bitte prüfen.</div>}
        </div>

        <div className="text-sm font-medium mt-2">Darlehen</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <PercentField label="Sollzins p.a. (%)" value={input.zinsSollPct*100} onChange={(p)=>setInput(s=>({...s,zinsSollPct:clamp(p,0,100)/100}))} step={0.01}/>
          <PercentField label="anfängliche Tilgung p.a. (%)" value={input.tilgungStartPct*100} onChange={(p)=>setInput(s=>({...s,tilgungStartPct:clamp(p,0,100)/100}))}/>
          <NumberField label="Zinsbindung (Jahre)" value={input.zinsbindungJahre} onChange={(v)=>setInput(s=>({...s,zinsbindungJahre:clamp(Math.round(v),1,30)}))}/>
          <NumberField label="Planungshorizont (Jahre)" value={input.laufzeitJahre} onChange={(v)=>setInput(s=>({...s,laufzeitJahre:clamp(Math.round(v),1,50)}))}/>
          <KpiPill text={rateBadge.text} color={rateBadge.color}/>
        </div>

        {/* Sondertilgung */}
        <details className="rounded-xl border p-3 bg-surface">
          <summary className="cursor-pointer text-sm font-medium">Sondertilgung (optional)</summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
            <label className="text-sm text-foreground flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={input.sonderOn} onChange={(e)=>setInput(s=>({...s,sonderOn:e.target.checked}))}/>
              aktivieren
            </label>

            <SelectField<SonderMode>
              label="Modus"
              value={input.sonderMode}
              options={[{value:"EUR",label:"Fixbetrag (€ p.a.)"},{value:"PCT",label:"% vom Ursprungsdarlehen p.a."}]}
              onChange={(v)=>setInput(s=>({...s,sonderMode:v}))}
            />

            {input.sonderMode==="EUR"
              ? <NumberField label="Betrag (€ / Jahr)" value={input.sonderAmount} onChange={(v)=>setInput(s=>({...s,sonderAmount:Math.max(0,v)}))}/>
              : <PercentField label="% vom Ursprungsdarlehen / Jahr" value={(input.sonderAmount??0)*100} onChange={(p)=>setInput(s=>({...s,sonderAmount:clamp(p,0,100)/100}))} step={0.1}/>
            }

            <NumberField label="ab Jahr" value={input.sonderStartYear} onChange={(v)=>setInput(s=>({...s,sonderStartYear:clamp(Math.round(v),1,s.laufzeitJahre)}))}/>
            <NumberField label="bis Jahr" value={input.sonderEndYear} onChange={(v)=>setInput(s=>({...s,sonderEndYear:clamp(Math.round(v),1,s.laufzeitJahre)}))}/>

            {/* NEU: Bank-Grenzwert */}
            <div className="md:col-span-3 rounded-lg border p-3">
              <label className="text-xs text-foreground flex items-center gap-2">
                <input type="checkbox" checked={input.sonderCapOn} onChange={(e)=>setInput(s=>({...s,sonderCapOn:e.target.checked}))}/>
                Bank-Grenze anwenden
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <PercentField label="Max. % p.a. (vom Ursprungsdarlehen)" value={input.sonderCapPct*100} onChange={(p)=>setInput(s=>({...s,sonderCapPct:clamp(p,0,100)/100}))} step={0.1}/>
                <KpiCard label="Max. Betrag p.a." value={eur0(Math.round(darlehen * (input.sonderCapOn ? input.sonderCapPct : 0)))} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">Die Bank limitiert z. B. auf 5 % p.a. – dein Wunsch wird darauf begrenzt.</div>
            </div>
          </div>
        </details>

        {/* NEU: Ziel-Restschuld zum Ende Zinsbindung */}
        <div className="rounded-xl border p-3">
          <div className="text-sm font-medium mb-2">Ziel-Restschuld (Ende Zinsbindung)</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <NumberField label="Ziel-Restschuld (€)" value={input.zielRestAtFix} onChange={(v)=>setInput(s=>({...s,zielRestAtFix:Math.max(0,v)}))}/>
            <KpiCard label={`Restschuld in Y${input.zinsbindungJahre}`} value={eur0(Math.round(restAtFix))}/>
            {zielState
              ? <KpiBadge label="Status" value={`${zielState.label} (${restDelta>0?"+":""}${eur0(Math.abs(Math.round(restDelta)))})`} color={zielState.color}/>
              : <KpiBadge label="Status" value={"–"} color={COLORS.slate}/>
            }
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Tipp: Erhöhe Sondertilgung oder Tilgung, um das Ziel zu erreichen.</div>
        </div>
      </div>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 bg-card shadow-soft">
          <div className="text-sm font-medium mb-2">Zinsen, Tilgung & Sondertilgung pro Jahr</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schedule.map(r=>({name:`Y${r.year}`, zins:nice(r.zins), tilg:nice(r.tilgung), sonder:nice(r.sonder)}))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name"/><YAxis/>
                <RTooltip formatter={(v:any)=>eur0(Number(v))}/>
                <Legend/>
                <Bar dataKey="zins"   name="Zinsen"         fill={COLORS.amber}   radius={[6,6,0,0]}/>
                <Bar dataKey="tilg"   name="Tilgung"        fill={COLORS.emerald} radius={[6,6,0,0]}/>
                <Bar dataKey="sonder" name="Sondertilgung"  fill={COLORS.primary} radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Summe: Zinsen {eur0(nice(totalZins))} · Tilgung {eur0(nice(totalTilg))}{input.sonderOn?<> · Sondertilgung {eur0(nice(totalSonder))}</>:null}
          </div>
        </div>

        <div className="rounded-2xl border p-4 bg-card shadow-soft">
          <div className="text-sm font-medium mb-2">Restschuld (Jahresende)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={schedule.map(r=>({name:`Y${r.year}`, rest:nice(r.restschuld)}))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name"/><YAxis/>
                <RTooltip formatter={(v:any)=>eur0(Number(v))}/>
                <Legend/>
                <Line type="monotone" dataKey="rest" name="Restschuld" stroke={COLORS.primary} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Tabelle */}
      <div className="rounded-2xl border p-4 bg-card shadow-soft overflow-x-auto">
        <div className="text-sm font-medium mb-2">Tilgungsplan (jährlich)</div>
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-1 pr-2">Jahr</th><th className="py-1 pr-2">Kalenderjahr</th>
              <th className="py-1 pr-2">Zinsen</th><th className="py-1 pr-2">Tilgung</th>
              <th className="py-1 pr-2">Sondertilgung</th><th className="py-1 pr-2">Summe Raten</th>
              <th className="py-1 pr-2">Restschuld (Ende)</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(r=>(
              <tr key={r.year} className="border-b last:border-0">
                <td className="py-1 pr-2">{r.year}</td>
                <td className="py-1 pr-2">{r.kalenderjahr}</td>
                <td className="py-1 pr-2">{eur0(nice(r.zins))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.tilgung))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.sonder))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.rateSum))}</td>
                <td className="py-1 pr-2">{eur0(nice(r.restschuld))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Vereinfachtes Modell: konstante Start-Annuität (Sollzins + anf. Tilgung), Sondertilgung am Jahresende, keine Zinswechsel/Rate-Anpassungen. Keine Finanz-/Rechtsberatung.
      </p>

      {showGlossary && <Glossary onClose={()=>setShowGlossary(false)}/>}
    </div>
  );
}

/* ============ UI-Bausteine ============ */
function KpiCard({label,value}:{label:string;value:string}) {
  return (
    <div className="rounded-2xl border p-4 bg-gradient-to-br from-white to-slate-50 shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
function KpiBadge({label,value,color}:{label:string;value:string;color:string}) {
  return (
    <div className="rounded-2xl border p-4 bg-card shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
              style={{background:hexToRgba(color,0.12), color}}>
          • {value}
        </span>
      </div>
    </div>
  );
}
function KpiPill({text,color}:{text:string;color:string}) {
  return (
    <div className="self-end">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs border"
            style={{borderColor:hexToRgba(color,0.3),background:hexToRgba(color,0.08),color}}>
        {text}
      </span>
    </div>
  );
}
function Btn({label,onClick,variant="primary",leftIcon}:{label:string;onClick?:()=>void;variant?:"primary"|"secondary"|"ghost";leftIcon?:React.ReactNode;}){
  const base="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all active:scale-[0.98] h-9";
  const variants:Record<string,string>={
    primary:"bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-medium",
    secondary:"bg-card border text-foreground hover:bg-slate-50",
    ghost:"bg-transparent border border-transparent hover:border-slate-200 text-foreground",
  };
  return <button className={`${base} ${variants[variant]}`} onClick={onClick}>{leftIcon?<span className="opacity-90">{leftIcon}</span>:null}<span className="leading-none">{label}</span></button>;
}
function NumberField({label,value,onChange,step=1}:{label:string;value:number;onChange:(v:number)=>void;step?:number}){
  return (
    <label className="text-sm text-foreground block">
      <span>{label}</span>
      <input className="mt-1 w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
             type="number" step={step} inputMode="numeric"
             value={Number.isFinite(value)?value:0}
             onChange={e=>onChange(e.target.value===""?0:Number(e.target.value))}/>
    </label>
  );
}
function PercentField({label,value,onChange,step=0.1}:{label:string;value:number;onChange:(v:number)=>void;step?:number}){
  return (
    <label className="text-sm text-foreground block">
      <span>{label}</span>
      <input className="mt-1 w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
             type="number" step={step} inputMode="decimal"
             value={Number.isFinite(value)?value:0}
             onChange={e=>onChange(e.target.value===""?0:Number(e.target.value))}/>
    </label>
  );
}
function SelectField<T extends string>({label,value,options,onChange}:{label:string;value:T;options:{value:T;label:string}[];onChange:(v:T)=>void;}){
  return (
    <label className="text-sm text-foreground block">
      <span>{label}</span>
      <select className="mt-1 w-full border rounded-xl p-2 bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={value} onChange={e=>onChange(e.target.value as T)}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function Help({title}:{title:string}){ return (
  <span className="inline-flex items-center" title={title}>
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 ml-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  </span>
);}
function IconDownload(){ return (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);}
function IconDoc(){ return (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h10"/>
  </svg>
);}

/* Glossar */
function Glossary({onClose}:{onClose:()=>void}){
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Glossar</h3>
          <button className="text-muted-foreground hover:text-slate-900" onClick={onClose}>Schließen</button>
        </div>
        <dl className="space-y-3 text-sm text-foreground">
          <GlossTerm term="Sondertilgung">Außerplanmäßige Tilgung am Jahresende. Bank-Grenzen (z. B. 5 % p.a.) beachten.</GlossTerm>
          <GlossTerm term="Ziel-Restschuld">Wunsch-Restschuld zum Ende der Zinsbindung – hilfreich für Anschlussfinanzierung.</GlossTerm>
        </dl>
        <div className="mt-4 text-xs text-muted-foreground">Vereinfachte Darstellung, keine Finanz-/Rechtsberatung.</div>
      </div>
    </div>
  );
}
function GlossTerm({term,children}:{term:string;children:React.ReactNode}){
  return (<div><dt className="font-medium">{term}</dt><dd className="text-muted-foreground">{children}</dd></div>);
}

/* Utils */
function hexToRgba(hex:string,alpha=1){
  const m=hex.replace("#",""); const bigint=parseInt(m,16);
  const r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Presets */
type PresetKind="80"|"90"|"100";
function computePreset(kind:PresetKind,s:Input):Input{
  if(kind==="80"){
    const ek=Math.round(s.kaufpreis*0.2 + s.kaufpreis*(s.grunderwerbPct+s.notarPct+s.maklerPct) + s.sonstKosten);
    return {...s,eigenkapital:ek,tilgungStartPct:0.03};
  }else if(kind==="90"){
    return {...s,eigenkapital:Math.round(s.kaufpreis*0.1),tilgungStartPct:0.02};
  }
  return {...s,eigenkapital:0,tilgungStartPct:0.02};
}
function QuickChips({setInput}:{setInput:React.Dispatch<React.SetStateAction<Input>>}){
  return (
    <div className="flex gap-2 flex-wrap">
      <Chip color={COLORS.emerald} onClick={()=>setInput(s=>computePreset("80",s))}>Beispiel: 80% Finanzierung</Chip>
      <Chip color={COLORS.amber}   onClick={()=>setInput(s=>computePreset("90",s))}>Beispiel: 90% Finanzierung</Chip>
      <Chip color={COLORS.rose}    onClick={()=>setInput(s=>computePreset("100",s))}>Beispiel: 100% (inkl. NK)</Chip>
    </div>
  );
}
function Chip({children,onClick,color}:{children:React.ReactNode;onClick:()=>void;color:string}){
  return <button className="px-3 py-1.5 text-xs rounded-xl border bg-card hover:bg-slate-50 shadow-soft hover:shadow"
                 style={{borderColor:hexToRgba(color,0.5)}} onClick={onClick}>{children}</button>;
}
