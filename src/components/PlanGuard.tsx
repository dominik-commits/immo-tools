// src/components/PlanGuard.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useUserPlan } from "@/hooks/useUserPlan";

type PlanLevel = "basis" | "pro";

interface PlanGuardProps {
  required: PlanLevel;
  children: React.ReactNode;
}

export default function PlanGuard({ required, children }: PlanGuardProps) {
  const plan = useUserPlan(); // z. B. "basis" | "pro" | null während Ladephase

  // Während der Plan noch geladen wird → nichts rendern (vermeidet Flackern)
  if (!plan) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        Lade Zugriffsdaten ...
      </div>
    );
  }

  // Wenn Feature PRO ist und Nutzer kein PRO → redirect
  if (required === "pro" && plan !== "pro") {
    return <Navigate to="/upgrade" replace />;
  }

  // Sonst normal rendern
  return <>{children}</>;
}
