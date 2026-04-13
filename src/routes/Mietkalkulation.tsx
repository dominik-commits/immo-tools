// src/routes/Mietkalkulation.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { Calculator, Gauge, Banknote, Sigma, TrendingUp, RefreshCw, Download, Upload } from "lucide-react";
import PlanGuard from "@/components/PlanGuard";
import { Link } from "react-router-dom";

/* ── Dark Theme Tokens ─────────────────────────────────────── */
const BG        = "#0d1117";
const BG_CARD   = "rgba(22,27,34,0.9)";
const BG_INPUT  = "rgba(255,255,255,0.05)";
const BORDER    = "rgba(255,255,255,0.08)";
const TEXT      = "rgba(255,255,255,0.88)";
const TEXT_MUTED= "rgba(255,255,255,0.5)";
const TEXT_DIM  = "rgba(255,255,255,0.32)";
const YELLOW    = "#FCDC45";

const C_KALT    = "#3b6bdb";
const C_UMLAGE  = "#6366f1";
const C_NOI     = "#22c55e";

/* ── Utils ─────────────────────────────────────────────────── */
const eur  = (v: number) => v.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const pct  = (x: number) => (x * 100).toFixed(1).replace(".0", "") + " %";
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const num  = (x: any, fb: number) => { const v = Number(x); return Number.isFinite(v) ? v : fb; };

/* ── Canvas Bar Chart (Monatsmix) ───────────────────────────── */
function BarChartCanvas({ data }: { data: { name: string; Kalt: number; Umlage: number; NOI: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pL = 60, pR = 20, pT = 20, pB = 30;
    const cW = W - pL - pR, cH = H - pT - pB;
    const series = [
      { key: "Kalt", color: C_KALT },
      { key: "Umlage", color: C_UMLAGE },
      { key: "NOI", color: C_NOI },
    ];
    const maxVal = Math.max(...data.flatMap(d => [d.Kalt, d.Umlage, d.NOI]), 1);
    const groupW = cW / data.length;
    const barW = Math.max(8, groupW / series.length * 0.7);
    const totalBarW = barW * series.length;
    const startX = (groupW - totalBarW) / 2;

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pT + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
      ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "right";
      const v = (maxVal * i / 4);
      ctx.fillText(v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)), pL - 5, y + 3);
    }

    data.forEach((d, gi) => {
      series.forEach(({ key, color }, si) => {
        const val = (d as any)[key] ?? 0;
        const bH = (val / maxVal) * cH;
        const x = pL + gi * groupW + startX + si * barW;
        const y = pT + cH - bH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, barW - 2, bH, [3, 3, 0, 0]);
        ctx.fill();
        // Value label on top
        if (bH > 20) {
          ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
          ctx.fillText(eur(Math.round(val)), x + (barW - 2) / 2, y - 3);
        }
      });
      // X label
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText(d.name, pL + gi * groupW + groupW / 2, H - pB + 14);
    });
  }, [data]);

  return (
    <div>
      <div style={{ width: "100%", height: 200 }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        {[["Kaltmiete", C_KALT], ["Umlagen", C_UMLAGE], ["NOI", C_NOI]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Canvas Line Chart (Projektion) ─────────────────────────── */
function LineChartCanvas({ data }: { data: { year: number; KaltmieteJahr: number; UmlageJahr: number; NOIJahr: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pL = 64, pR = 20, pT = 20, pB = 30;
    const cW = W - pL - pR, cH = H - pT - pB;

    const series = [
      { key: "KaltmieteJahr", label: "Kaltmiete p.a.", color: C_KALT },
      { key: "UmlageJahr",    label: "Umlagen p.a.",   color: C_UMLAGE },
      { key: "NOIJahr",       label: "NOI p.a.",        color: C_NOI },
    ];

    const allVals = data.flatMap(d => series.map(s => (d as any)[s.key] ?? 0));
    const maxVal = Math.max(...allVals, 1);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pT + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
      ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "right";
      const v = maxVal * i / 4;
      ctx.fillText(v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)), pL - 5, y + 3);
    }

    // X labels
    data.forEach((d, i) => {
      const x = pL + (i / (data.length - 1)) * cW;
      ctx.fillStyle = TEXT_DIM; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText(`J${d.year}`, x, H - pB + 14);
    });

    // Lines
    series.forEach(({ key, color }) => {
      ctx.beginPath();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round";
      data.forEach((d, i) => {
        const x = pL + (i / (data.length - 1)) * cW;
        const y = pT + cH - ((d as any)[key] / maxVal) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, [data]);

  return (
    <div>
      <div style={{ width: "100%", height: 220 }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        {[["Kaltmiete p.a.", C_KALT], ["Umlagen p.a.", C_UMLAGE], ["NOI p.a.", C_NOI]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Score Donut ────────────────────────────────────────────── */
function ScoreDonut({ scorePct, scoreColor, label }: { scorePct: number; scoreColor: string; label: "BUY" | "CHECK" | "NO" }) {
  const r = 38, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const dash = (scorePct / 100) * circ;
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={scoreColor} strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor, lineHeight: 1.1 }}>{scorePct}%</div>
          <div style={{ fontSize: 10, color: TEXT_MUTED }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Form Fields ────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, borderRadius: 10, padding: "0 12px",
  background: BG_INPUT, border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: 13, boxSizing: "border-box", outline: "none",
};
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginBottom: 5, display: "block" };

function NumberField({ label, value, onChange, step = 1, suffix }: {
  label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input style={inputStyle} type="number" step={step} value={Number.isFinite(value) ? value : 0}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          onWheel={e => (e.currentTarget as HTMLInputElement).blur()} />
        {suffix && <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange, step = 0.001, min = 0, max = 0.3 }: {
  label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        <span style={{ fontSize: 12, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{pct(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: YELLOW }} />
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, ...style }}>{children}</div>;
}

/* ── Badge ──────────────────────────────────────────────────── */
function Badge({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <span title={hint} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, border: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_MUTED, background: BG_INPUT }}>
      {icon}{text}
    </span>
  );
}

/* ── Hauptkomponente ────────────────────────────────────────── */
export default function Mietkalkulation() {
  return (
    <PlanGuard required="basis">
      <PageInner />
    </PlanGuard>
  );
}

function PageInner() {
  const DRAFT_KEY = "mietkalkulator.v4";

  const [flaecheM2,          setFlaecheM2]          = React.useState(68);
  const [mieteProM2Monat,    setMieteProM2Monat]    = React.useState(12.5);
  const [umlagefaehigProM2,  setUmlagefaehigProM2]  = React.useState(2.8);
  const [nichtUmlagefaehigPct, setNichtUmlagefaehigPct] = React.useState(0.05);
  const [leerstandPct,       setLeerstandPct]       = React.useState(0.06);
  const [mietsteigerungPct,  setMietsteigerungPct]  = React.useState(0.02);
  const [kostensteigerungPct,setKostensteigerungPct]= React.useState(0.02);

  // Laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      setFlaecheM2(num(d.flaecheM2, 68));
      setMieteProM2Monat(num(d.mieteProM2Monat, 12.5));
      setUmlagefaehigProM2(num(d.umlagefaehigProM2, 2.8));
      setNichtUmlagefaehigPct(num(d.nichtUmlagefaehigPct, 0.05));
      setLeerstandPct(num(d.leerstandPct, 0.06));
      setMietsteigerungPct(num(d.mietsteigerungPct, 0.02));
      setKostensteigerungPct(num(d.kostensteigerungPct, 0.02));
    } catch {}
  }, []);

  // Speichern
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ flaecheM2, mieteProM2Monat, umlagefaehigProM2, nichtUmlagefaehigPct, leerstandPct, mietsteigerungPct, kostensteigerungPct })); } catch {}
  }, [flaecheM2, mieteProM2Monat, umlagefaehigProM2, nichtUmlagefaehigPct, leerstandPct, mietsteigerungPct, kostensteigerungPct]);

  /* Ableitungen */
  const kalt               = flaecheM2 * mieteProM2Monat;
  const umlage             = flaecheM2 * umlagefaehigProM2;
  const warm               = kalt + umlage;
  const leerstandEuro      = kalt * leerstandPct;
  const nichtUmlagefaehigEuro = kalt * nichtUmlagefaehigPct;
  const noiMonat           = kalt * (1 - leerstandPct) - nichtUmlagefaehigEuro;
  const noiYield           = kalt > 0 ? clamp(noiMonat / kalt, -5, 5) : 0;

  const scoreRaw   = clamp(0.75 * (1 - leerstandPct) + 0.25 * (1 - nichtUmlagefaehigPct) - 0.05 * Math.max(0, umlagefaehigProM2 - 3), 0, 1);
  const scorePct   = Math.round(scoreRaw * 100);
  const scoreColor = scoreRaw >= 0.7 ? "#22c55e" : scoreRaw >= 0.5 ? "#f59e0b" : "#ef4444";
  const scoreLabel: "BUY" | "CHECK" | "NO" = scoreRaw >= 0.7 ? "BUY" : scoreRaw >= 0.5 ? "CHECK" : "NO";

  const projection = useMemo(() => {
    let cold = kalt * 12, opUml = umlage * 12, nonRec = nichtUmlagefaehigEuro * 12;
    return Array.from({ length: 10 }, (_, i) => {
      if (i > 0) { cold *= (1 + mietsteigerungPct); opUml *= (1 + kostensteigerungPct); nonRec *= (1 + kostensteigerungPct); }
      return { year: i + 1, KaltmieteJahr: Math.round(cold), UmlageJahr: Math.round(opUml), NOIJahr: Math.round(cold * (1 - leerstandPct) - nonRec) };
    });
  }, [kalt, umlage, nichtUmlagefaehigEuro, mietsteigerungPct, kostensteigerungPct, leerstandPct]);

  const mixData = [{ name: "Monat 1", Kalt: Math.round(kalt), Umlage: Math.round(umlage), NOI: Math.round(noiMonat) }];

  /* Export / Import */
  function exportJson() {
    const blob = new Blob([JSON.stringify({ flaecheM2, mieteProM2Monat, umlagefaehigProM2, nichtUmlagefaehigPct, leerstandPct, mietsteigerungPct, kostensteigerungPct }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "mietkalkulator.json" });
    a.click(); URL.revokeObjectURL(a.href);
  }
  function importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        setFlaecheM2(num(d.flaecheM2, 68)); setMieteProM2Monat(num(d.mieteProM2Monat, 12.5));
        setUmlagefaehigProM2(num(d.umlagefaehigProM2, 2.8)); setNichtUmlagefaehigPct(num(d.nichtUmlagefaehigPct, 0.05));
        setLeerstandPct(num(d.leerstandPct, 0.06)); setMietsteigerungPct(num(d.mietsteigerungPct, 0.02));
        setKostensteigerungPct(num(d.kostensteigerungPct, 0.02));
      } catch { alert("Ungültige Datei"); }
    };
    r.readAsText(file);
  }
  function resetExample() {
    setFlaecheM2(68); setMieteProM2Monat(12.5); setUmlagefaehigProM2(2.8);
    setNichtUmlagefaehigPct(0.05); setLeerstandPct(0.06);
    setMietsteigerungPct(0.02); setKostensteigerungPct(0.02);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 140px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #3b6bdb, #6366f1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Calculator size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Mietkalkulator</h1>
              <p style={{ fontSize: 13, color: TEXT_MUTED, margin: "2px 0 0" }}>Warmmiete, Umlagen &amp; NOI auf einen Blick – mit 10-Jahres-Projektion.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetExample}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              <RefreshCw size={14} /> Beispiel
            </button>
            <button onClick={exportJson}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              <Download size={14} /> Export
            </button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 13, background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: "pointer" }}>
              <Upload size={14} /> Import
              <input type="file" style={{ display: "none" }} accept="application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
            </label>
          </div>
        </div>

        {/* Upgrade Banner */}
        <div style={{ background: "rgba(252,220,69,0.07)", border: "1px solid rgba(252,220,69,0.2)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: TEXT_MUTED }}>Mehr Module &amp; Funktionen in <b style={{ color: YELLOW }}>PROPORA PRO</b>.</span>
          <Link to="/preise" style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, background: YELLOW, color: "#111", fontWeight: 600, textDecoration: "none" }}>Upgraden</Link>
        </div>

        {/* Eingaben */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: TEXT }}>Eingaben</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <NumberField label="Wohnfläche" value={flaecheM2} onChange={setFlaecheM2} suffix="m²" />
                <NumberField label="Kaltmiete" value={mieteProM2Monat} onChange={setMieteProM2Monat} step={0.1} suffix="€/m²/Monat" />
                <NumberField label="Umlagefähige BK" value={umlagefaehigProM2} onChange={setUmlagefaehigProM2} step={0.1} suffix="€/m²/Monat" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
                <SliderField label="Nicht umlagefähige Kosten" value={nichtUmlagefaehigPct} onChange={setNichtUmlagefaehigPct} min={0} max={0.2} />
                <SliderField label="Leerstand" value={leerstandPct} onChange={setLeerstandPct} min={0} max={0.3} />
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Projektion (10 Jahre)</span>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>Wachstumsannahmen</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <SliderField label="Mietsteigerung p.a." value={mietsteigerungPct} onChange={setMietsteigerungPct} min={0} max={0.06} />
                <SliderField label="Kostensteigerung p.a." value={kostensteigerungPct} onChange={setKostensteigerungPct} min={0} max={0.06} />
              </div>
            </Card>
          </div>
        </div>

        {/* Monatsmix Chart */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: TEXT }}>
            <TrendingUp size={16} /> Monatsmix
          </h2>
          <Card><BarChartCanvas data={mixData} /></Card>
        </div>

        {/* Projektion Chart */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: TEXT }}>Projektion (10 Jahre)</h2>
          <Card><LineChartCanvas data={projection} /></Card>
        </div>

        {/* Monatsrechnung */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: TEXT }}>Monatsrechnung (Jahr 1)</h2>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Kaltmiete (mtl.)", eur(Math.round(kalt)), false],
                ["Umlagefähige BK (mtl.)", eur(Math.round(umlage)), false],
                ["Warmmiete (mtl.)", eur(Math.round(warm)), false],
                ["Leerstand (Abzug, mtl.)", `−${eur(Math.round(leerstandEuro))}`, false],
                ["Nicht umlagefähig (mtl.)", `−${eur(Math.round(nichtUmlagefaehigEuro))}`, false],
                ["= NOI (mtl., vereinfacht)", eur(Math.round(noiMonat)), true],
              ].map(([label, value, accent]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: accent ? 700 : 500, color: accent ? YELLOW : TEXT, fontVariantNumeric: "tabular-nums" }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 12 }}>Vereinfachtes Modell zur Mieteinnahmen-Kalkulation, ohne Steuern/Finanzierung.</p>
          </Card>
        </div>

        {/* Glossar */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: TEXT }}>Glossar</h2>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Bruttokaltmiete", "Kaltmiete ohne Heiz-/Warmwasserkosten, inkl. kalter Betriebskosten."],
                ["Umlagefähige Kosten", "Betriebskosten, die laut BetrKV auf Mieter umlegbar sind."],
                ["NOI (Net Operating Income)", "Eff. Mietertrag abzüglich nicht umlagefähiger Kosten (vereinfacht)."],
                ["Leerstand", "Zeiträume ohne Vermietung bzw. Mietausfallquote."],
              ].map(([term, def]) => (
                <div key={term as string}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{term}: </span>
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>{def}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>

      {/* Sticky Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, pointerEvents: "none" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 16px", pointerEvents: "auto" }}>
          <div style={{ background: "rgba(13,17,23,0.95)", border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)" }}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: TEXT_DIM }}>Ergebnis (Aktuell)</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginTop: 2 }}>
                  Entscheidung: {scoreRaw >= 0.7 ? "Kaufen (unter Vorbehalt)" : scoreRaw >= 0.5 ? "Weiter prüfen" : "Eher Nein"}
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Badge icon={<Banknote size={12} />} text={`${eur(Math.round(noiMonat))} NOI mtl.`} hint="NOI (Monat 1)" />
                  <Badge icon={<Gauge size={12} />} text={`NOI-Yield ${pct(noiYield)}`} hint="NOI / Bruttokaltmiete" />
                  <Badge icon={<Sigma size={12} />} text={`Leerstand ${pct(leerstandPct)}`} hint="Mietausfallquote" />
                </div>
              </div>
              <ScoreDonut scorePct={scorePct} scoreColor={scoreColor} label={scoreLabel} />
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ height: "100%", width: `${Math.max(4, Math.min(100, scorePct))}%`, background: `linear-gradient(90deg, ${scoreColor}, #60a5fa)`, transition: "width 0.3s ease" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
