// src/components/RequirePlan.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useUserPlan } from "@/hooks/useUserPlan";

type Props = {
  need: "basis" | "pro";
  children: React.ReactNode;
};

export default function RequirePlan({ need, children }: Props) {
  const { isLoaded, isSignedIn } = useUser();
  const plan = useUserPlan(); // "basis" | "pro" | null
  const loc = useLocation();

  if (!isLoaded) return <div className="p-6">Lade …</div>;
  if (!isSignedIn) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Gast => treated as basis (kein Zugriff auf pro)
  const effectivePlan = plan ?? "basis";
  if (need === "pro" && effectivePlan !== "pro") {
    return <Navigate to="/preise" replace />;
  }

  return <>{children}</>;
}
