// src/subscription/usePlan.ts
import * as React from "react";
import type { Plan } from "../config/featureMatrix";

function readInitialPlan(): Plan {
  // 1) URL-Override: ?plan=basis|pro
  const sp = new URLSearchParams(window.location.search);
  const fromUrl = sp.get("plan");
  if (fromUrl === "basis" || fromUrl === "pro") {
    localStorage.setItem("plan", fromUrl);
    return fromUrl;
  }
  // 2) Persistenz
  const saved = localStorage.getItem("plan");
  if (saved === "basis" || saved === "pro") return saved;
  // 3) Default
  return "basis";
}

export function usePlan() {
  const [plan, setPlanState] = React.useState<Plan>(() => readInitialPlan());

  const setPlan = React.useCallback((p: Plan) => {
    localStorage.setItem("plan", p);
    setPlanState(p);
  }, []);

  return { plan, setPlan } as const;
}
