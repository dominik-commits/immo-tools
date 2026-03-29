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
  const { plan, isLoading } = useUserPlan();
  const loc = useLocation();

  if (!isLoaded || isLoading) return <div className="p-6">Lade …</div>;

  if (!isSignedIn) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (need === "pro" && plan !== "pro") {
    return <Navigate to="/preise" replace />;
  }

  if (need === "basis" && plan === "free") {
    return <Navigate to="/preise" replace />;
  }

  return <>{children}</>;
}