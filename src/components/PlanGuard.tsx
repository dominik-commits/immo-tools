// src/components/PlanGuard.tsx
import React from "react";
import { Navigate, Link } from "react-router-dom";

type PlanLevel = "basis" | "pro";

interface PlanGuardProps {
  required: PlanLevel;
  children: React.ReactNode;
}

// TODO: später echten Nutzerplan aus Auth/Context holen
const currentPlan: PlanLevel = "basis";

export default function PlanGuard({ required, children }: PlanGuardProps) {
  // PRO-Feature und User ist nicht PRO → umleiten auf /upgrade
  if (required === "pro" && currentPlan !== "pro") {
    return <Navigate to="/upgrade" replace />;
  }

  // Basis-Feature oder User ist PRO → normal rendern
  return <>{children}</>;
}
