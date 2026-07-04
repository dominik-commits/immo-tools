// src/routes/Portfolio.tsx
// Propora – Portfolio-Dashboard mit Status-Labels & Filter

import React, { useState } from "react";
import { usePortfolio, type PortfolioObject, type AnalyzerType } from "../hooks/usePortfolio";
import { Trash2, ExternalLink, TrendingUp, Home, Building2, Factory, Scale, RefreshCw, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtEur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${(v * 100).toFixed(2)} %`;

const ANALYZER_LABELS: Record<AnalyzerType, string> = {
  etw: "ETW", mfh: "MFH", efh: "EFH", gewerbe: "Gewerbe", mixeduse: "Mixed-Use",
};
const ANALYZER_ROUTES: Record<AnalyzerType, string> = {
  etw: "/wohnung", mfh: "/mfh", efh: "/efh",
  gewerbe: "/gewerbe", mixeduse: "/gemischte-immobilie",
};
const ANALYZER_ICONS: Record<AnalyzerType, React.ReactNode> = {
  etw: <Home size={13} />, mfh: <Building2 size={13} />, efh: <Home size={13} />,
  gewerbe: <Factory size={13} />, mixeduse: <Scale size={13} />,
};
const ANALYZER_COLORS: Record<AnalyzerType, string> = {
  etw: "#F5C842", mfh: "#4ade80", efh: "#60a5fa",
  gewerbe: "#f97316", mixeduse: "#a78bfa",
};

// ── Status-Definitionen ──────────────────────────────────────────────────────
export const STATUS_OPTIONS = [
  { value: "beobachtung",     label: "Beobachtung",        color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)"  },
  { value: "verhandlung",     label: "Verhandlung",        color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.25)"  },
  { value: "due_diligence",   label: "Due Diligence",      color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
  { value: "finanzierung",    label: "Finanzierung läuft", color: "#F5C842", bg: "rgba(245,200,66,0.12)",  border: "rgba(245,200,66,0.25)"  },
  { value: "gekauft",         label: "Gekauft",            color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
  { value: "abgelehnt",       label: "Abgelehnt",          color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" },
] as const;

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

function getStatus(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value) ?? STATUS_OPTIONS[0];
}

// ── StatusBadge ──────────────────────────────────────────────────────────────
function StatusDropdown({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const s = getStatus(current);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
        {s.label} <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 6, zIndex: 100, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", borderRadius: 7, border: "none", background: opt.value === current ? opt.bg : "transparent", cursor: "pointer", fontSize: 12, color: opt.color, fontWeight: opt.value === current ? 600 : 400 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KPI-Kachel ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "#e6edf3", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Objekt-Karte ─────────────────────────────────────────────────────────────
function ObjectCard({ obj, onDelete, onOpen, onStatusChange }: {
  obj: PortfolioObject;
  onDelete: (id: string) => void;
  onOpen: (type: AnalyzerType) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const cashflow = (obj.data.cashflowMonat ?? obj.data.monthlyCF ?? 0) as number;
  const noiYield = (obj.data.noiYield ?? 0) as number;
  const color = ANALYZER_COLORS[obj.analyzer_type];

  async function handleDelete() {
    if (!confirm(`"${obj.name}" wirklich löschen?`)) return;
    setDeleting(true);
    await onDelete(obj.id);
  }

  return (
    <div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", opacity: deleting ? 0.5 : 1, transition: "opacity 0.2s" }}>
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ color, flexShrink: 0 }}>{ANALYZER_ICONS[obj.analyzer_type]}</span>
              <span style={{ fontSize: 10, color, fontWeight: 600 }}>{ANALYZER_LABELS[obj.analyzer_type]}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{obj.name}</div>
            {obj.adresse && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{obj.adresse}{obj.plz ? ` · ${obj.plz}` : ""}</div>}
          </div>
          <div style={{ display: "flex", gap: 5, flexShrink: 0, marginLeft: 8 }}>
            <button onClick={() => onOpen(obj.analyzer_type)} title="Analyzer öffnen"
              style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
              <ExternalLink size={12} />
            </button>
            <button onClick={handleDelete} title="Löschen"
              style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f87171" }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Status-Dropdown */}
        <div style={{ marginBottom: 10 }}>
          <StatusDropdown current={obj.status ?? "beobachtung"} onChange={(v) => onStatusChange(obj.id, v)} />
        </div>

        {/* Kennzahlen */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[
            { label: "Kaufpreis", value: obj.kaufpreis ? fmtEur(obj.kaufpreis) : "–" },
            { label: "CF/Mo", value: fmtEur(cashflow), color: cashflow >= 0 ? "#4ade80" : "#f87171" },
            { label: "NOI-Rendite", value: noiYield > 0 ? fmtPct(noiYield) : "–", color: noiYield >= 0.05 ? "#4ade80" : noiYield >= 0.035 ? "#F5C842" : "rgba(255,255,255,0.5)" },
          ].map(k => (
            <div key={k.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "5px 7px" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: k.color || "rgba(255,255,255,0.7)" }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
          {new Date(obj.created_at).toLocaleDateString("de-DE")}
        </div>
      </div>
    </div>
  );
}

// ── Leer-Zustand ─────────────────────────────────────────────────────────────
function EmptyState({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Building2 size={28} style={{ color: "#F5C842", opacity: 0.6 }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Noch keine Objekte gespeichert</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24, lineHeight: 1.6 }}>
        Analysiere eine Immobilie und klicke auf „Speichern"<br />um sie hier zu sehen.
      </div>
      <button onClick={() => navigate("/wohnung")}
        style={{ padding: "10px 20px", borderRadius: 10, background: "#F5C842", border: "none", color: "#111", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
        Ersten Analyzer starten →
      </button>
    </div>
  );
}

// ── Hauptseite ───────────────────────────────────────────────────────────────
export default function Portfolio() {
  const { objects, loading, error, remove, reload, summary, updateStatus } = usePortfolio();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<AnalyzerType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusValue | "all">("all");

  const filtered = objects
    .filter(o => typeFilter === "all" || o.analyzer_type === typeFilter)
    .filter(o => statusFilter === "all" || (o.status ?? "beobachtung") === statusFilter);

  // Status-Zähler für Filter-Buttons
  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = objects.filter(o => (o.status ?? "beobachtung") === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TrendingUp size={20} color="#F5C842" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Mein Portfolio</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>
                {summary.objectCount} {summary.objectCount === 1 ? "Objekt" : "Objekte"} · {objects.filter(o => (o.status ?? "") === "gekauft").length} gekauft
              </p>
            </div>
          </div>
          <button onClick={reload} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Aktualisieren
          </button>
        </div>

        {/* KPI-Übersicht */}
        {summary.objectCount > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
            <KpiCard label="Gesamt Kaufpreis" value={fmtEur(summary.totalKaufpreis)} sub={`${summary.objectCount} Objekte`} />
            <KpiCard label="Cashflow gesamt/Mo" value={fmtEur(summary.totalCashflowMonat)}
              color={summary.totalCashflowMonat >= 0 ? "#4ade80" : "#f87171"} />
            <KpiCard label="Ø NOI-Rendite" value={fmtPct(summary.avgNoiYield)}
              color={summary.avgNoiYield >= 0.05 ? "#4ade80" : "#F5C842"} />
            <KpiCard label="Im Bestand" value={`${objects.filter(o => (o.status ?? "") === "gekauft").length} Obj.`}
              sub={`${objects.filter(o => (o.status ?? "") === "verhandlung").length} in Verhandlung`} />
          </div>
        )}

        {/* Status-Filter */}
        {summary.objectCount > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setStatusFilter("all")} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: statusFilter === "all" ? 600 : 400,
                background: statusFilter === "all" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                border: statusFilter === "all" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
                color: statusFilter === "all" ? "#e6edf3" : "rgba(255,255,255,0.4)",
              }}>Alle ({summary.objectCount})</button>
              {STATUS_OPTIONS.map(s => statusCounts[s.value] > 0 && (
                <button key={s.value} onClick={() => setStatusFilter(s.value as StatusValue)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: statusFilter === s.value ? 600 : 400,
                  background: statusFilter === s.value ? s.bg : "rgba(255,255,255,0.03)",
                  border: `1px solid ${statusFilter === s.value ? s.border : "rgba(255,255,255,0.07)"}`,
                  color: statusFilter === s.value ? s.color : "rgba(255,255,255,0.4)",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                  {s.label} ({statusCounts[s.value]})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typ-Filter */}
        {summary.objectCount > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Objekttyp</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["all", "etw", "mfh", "efh", "gewerbe", "mixeduse"] as const).map(t => {
                const count = t === "all" ? summary.objectCount : summary.byType[t];
                if (t !== "all" && count === 0) return null;
                return (
                  <button key={t} onClick={() => setTypeFilter(t)} style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                    background: typeFilter === t ? "#F5C842" : "rgba(255,255,255,0.04)",
                    border: typeFilter === t ? "none" : "1px solid rgba(255,255,255,0.07)",
                    color: typeFilter === t ? "#111" : "rgba(255,255,255,0.45)",
                    fontWeight: typeFilter === t ? 600 : 400,
                  }}>
                    {t === "all" ? `Alle` : ANALYZER_LABELS[t]} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Lade Portfolio…</div>}
        {!loading && objects.length === 0 && <EmptyState navigate={navigate} />}

        {/* Objekte Grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {filtered.map(obj => (
              <ObjectCard key={obj.id} obj={obj} onDelete={remove}
                onOpen={(type) => navigate(ANALYZER_ROUTES[type])}
                onStatusChange={updateStatus} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && objects.length > 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Keine Objekte mit diesem Filter gefunden.
          </div>
        )}
      </div>
    </div>
  );
}
