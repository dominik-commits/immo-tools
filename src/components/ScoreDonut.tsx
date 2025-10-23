import React from "react";

export type ScoreType = "BUY" | "CHECK" | "NO";

function colorFor(label: ScoreType) {
  switch (label) {
    case "BUY":
      return "#10B981"; // emerald-500
    case "CHECK":
      return "#F59E0B"; // amber-500
    default:
      return "#EF4444"; // red-500
  }
}

function toPct(score01: number) {
  const pct = Math.round(Math.max(0, Math.min(1, score01)) * 100);
  return { pct, pctStr: `${pct}%` };
}

/** Reiner Donut für BUY/CHECK/NO (keine Prozentanzeige) */
export function ScoreDonut({
  score,
  size = 120,
}: {
  score: ScoreType;
  size?: number;
}) {
  const pct =
    score === "BUY" ? 0.9 : score === "CHECK" ? 0.55 : 0.2; // feste Heuristik
  const color = colorFor(score);
  const bg = "#E5E7EB";

  const data = [
    { name: "score", value: pct },
    { name: "rest", value: 1 - pct },
  ];

  // Kein Recharts nötig: einfacher SVG-Donut → robust & leicht
  const R = size / 2;
  const r = R - 8;
  const C = 2 * Math.PI * r;
  const filled = C * pct;

  return (
    <div style={{ width: size, height: size }} className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle cx={R} cy={R} r={r} fill="none" stroke={bg} strokeWidth="12" />
        {/* Foreground arc */}
        <circle
          cx={R}
          cy={R}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${filled} ${C}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${R} ${R})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="text-xs uppercase text-gray-500">Score</div>
        <div className="text-sm font-semibold" style={{ color }}>
          {score}
        </div>
      </div>
    </div>
  );
}

export type ScoreCardProps = {
  /** numerischer Score 0..1 */
  score: number;
  /** optional Label-Override, sonst aus score abgeleitet */
  label?: ScoreType;
  /** Größe des Donuts in px (Kante) */
  donutSize?: number;
  className?: string;
};

/** Kompakte Karte mit Donut + Prozent + Label */
export default function ScoreCard({
  score,
  label,
  donutSize = 72,
  className = "",
}: ScoreCardProps) {
  const clamped = Math.max(0, Math.min(1, score));
  const { pct, pctStr } = toPct(clamped);
  const lbl: ScoreType =
    label ?? (clamped >= 0.7 ? "BUY" : clamped >= 0.5 ? "CHECK" : "NO");
  const color = colorFor(lbl);

  return (
    <div className={`rounded-xl border p-3 bg-card shadow-soft ${className}`}>
      <div className="text-[11px] text-muted-foreground mb-1">Score</div>
      <div className="flex items-center gap-3">
        <ScoreDonut score={lbl} size={donutSize} />
        <div>
          <div className="text-lg font-semibold tabular-nums" style={{ color }}>
            {pctStr}
          </div>
          <div className="text-[11px] text-muted-foreground">"{lbl}"</div>
        </div>
      </div>
    </div>
  );
}
