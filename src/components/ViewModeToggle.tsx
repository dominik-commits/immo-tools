// src/components/ViewModeToggle.tsx
import * as React from "react";

export default function ViewModeToggle({
  mode,
  onChange,
  className = "",
}: {
  mode: "einfach" | "erweitert";
  onChange: (m: "einfach" | "erweitert") => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-xl border bg-white text-sm ${className}`}>
      <button
        onClick={() => onChange("einfach")}
        className={`px-3 py-1.5 rounded-lg ${
          mode === "einfach" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
        }`}
        aria-pressed={mode === "einfach"}
      >
        Einfach
      </button>
      <button
        onClick={() => onChange("erweitert")}
        className={`px-3 py-1.5 rounded-lg ${
          mode === "erweitert" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
        }`}
        aria-pressed={mode === "erweitert"}
      >
        Erweitert
      </button>
    </div>
  );
}
