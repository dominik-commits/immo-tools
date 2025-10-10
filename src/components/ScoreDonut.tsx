import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export type ScoreType = "BUY" | "CHECK" | "NO";

export default function ScoreDonut({ score, size = 120 }: { score: ScoreType; size?: number }) {
  const pct = score === "BUY" ? 0.9 : score === "CHECK" ? 0.55 : 0.2;
  const color = score === "BUY" ? "#10B981" : score === "CHECK" ? "#F59E0B" : "#EF4444";
  const bg = "#E5E7EB";

  const data = [
    { name: "score", value: pct },
    { name: "rest", value: 1 - pct },
  ];

  return (
    <div style={{ width: size, height: size }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" startAngle={90} endAngle={-270}
               innerRadius={size / 2 - 14} outerRadius={size / 2} stroke="none">
            <Cell key="score" fill={color} />
            <Cell key="rest" fill={bg} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs uppercase text-gray-500">Score</div>
          <div className="text-lg font-semibold" style={{ color }}>{score}</div>
        </div>
      </div>
    </div>
  );
}
