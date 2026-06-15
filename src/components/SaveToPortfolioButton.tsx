/**
 * SaveToPortfolioButton – Objekt im Portfolio speichern
 * Einbinden in jeden Analyzer direkt neben dem Bankbericht-Button
 */

import React, { useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { usePortfolio, type AnalyzerType } from "../hooks/usePortfolio";

interface Props {
  analyzerType: AnalyzerType;
  name: string;           // z.B. "ETW Musterstr. 1" oder adresse
  adresse?: string;
  plz?: string;
  kaufpreis?: number;
  data: Record<string, unknown>;
}

export function SaveToPortfolioButton({ analyzerType, name, adresse, plz, kaufpreis, data }: Props) {
  const { save } = usePortfolio();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    if (state === "saving" || state === "saved") return;
    setState("saving");
    const ok = await save({ analyzer_type: analyzerType, name: name || `${analyzerType.toUpperCase()} Objekt`, adresse, plz, kaufpreis, data });
    setState(ok ? "saved" : "error");
    if (ok) setTimeout(() => setState("idle"), 3000);
  }

  const bg = state === "saved" ? "rgba(74,222,128,0.15)" : state === "error" ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.06)";
  const border = state === "saved" ? "1px solid rgba(74,222,128,0.3)" : state === "error" ? "1px solid rgba(248,113,113,0.3)" : "1px solid rgba(255,255,255,0.09)";
  const color = state === "saved" ? "#4ade80" : state === "error" ? "#f87171" : "rgba(255,255,255,0.7)";

  return (
    <button onClick={handleSave} disabled={state === "saving"}
      title="Im Portfolio speichern"
      style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: state === "saving" ? "wait" : "pointer", background: bg, border, color, display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
      {state === "saved"
        ? <><Check size={14} /> Gespeichert</>
        : state === "saving"
        ? <><svg className="animate-spin" style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75" /></svg> Speichern…</>
        : state === "error"
        ? "Fehler – erneut versuchen"
        : <><BookmarkPlus size={14} /> Speichern</>
      }
    </button>
  );
}
