// src/components/StickyScoreBar.tsx
import React from "react";
import { Gauge, Banknote, Sigma } from "lucide-react";

export default function StickyScoreBar({
  label,              // "BUY" | "CHECK" | "NO"
  scorePct,           // 0..100 (gerundet)
  scoreColor,         // z.B. "#16a34a"
  cashflowText,       // z.B. "€ 235"
  noiYieldText,       // z.B. "5,8 %"
  dscrText,           // z.B. "1.23" | "–"
}: {
  label: "BUY" | "CHECK" | "NO";
  scorePct: number;
  scoreColor: string;
  cashflowText: string;
  noiYieldText: string;
  dscrText: string;
}) {
  const bg =
    label === "BUY"   ? "bg-emerald-50 border-emerald-200" :
    label === "CHECK" ? "bg-amber-50 border-amber-200" :
                        "bg-red-50 border-red-200";

  return (
    <div className={`fixed bottom-0 inset-x-0 z-50 border-t ${bg}`}>
      <div className="max-w-3xl md:max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        {/* Score + Label */}
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8" aria-label="Deal-Score">
            {/* Donut minimalistisch */}
            <svg viewBox="0 0 100 100" className="h-8 w-8">
              <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="12" fill="none" />
              <defs>
                <linearGradient id="gradScoreSticky" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={scoreColor} />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
              <circle
                cx="50" cy="50" r="40"
                stroke="url(#gradScoreSticky)"
                strokeWidth="12" fill="none"
                strokeDasharray={`${(scorePct/100)*2*Math.PI*40} ${2*Math.PI*40}`}
                transform="rotate(-90 50 50)"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-xs text-gray-600">Ergebnis</div>
            <div className="text-sm font-semibold" style={{ color: scoreColor }}>
              {label} · {scorePct}%
            </div>
          </div>
        </div>

        {/* KPIs kompakt */}
        <div className="flex items-center gap-3 text-[13px]">
          <div className="inline-flex items-center gap-1.5">
            <Banknote className="h-4 w-4" />
            <span>{cashflowText}/Monat</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Gauge className="h-4 w-4" />
            <span>NOI-Yield {noiYieldText}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Sigma className="h-4 w-4" />
            <span>DSCR {dscrText}</span>
          </div>
        </div>
      </div>
      {/* iOS Safe-Area Support */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
