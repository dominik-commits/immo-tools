// src/hooks/useViewMode.ts
import * as React from "react";

export type ViewMode = "einfach" | "erweitert";

export function useViewMode(key: string = "propora.viewMode"): {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
} {
  const [mode, setModeState] = React.useState<ViewMode>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return (raw === "erweitert" || raw === "einfach") ? (raw as ViewMode) : "einfach";
  });

  const setMode = React.useCallback((m: ViewMode) => {
    setModeState(m);
    try { localStorage.setItem(key, m); } catch {}
  }, [key]);

  return { mode, setMode };
}
