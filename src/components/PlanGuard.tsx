import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useUserPlan } from "@/hooks/useUserPlan";

/**
 * required = "any"   → nur Login nötig, kein Plan
 * required = "basis" → Basis ODER Pro
 * required = "pro"   → nur Pro
 */
export type RequiredPlan = "any" | "basis" | "pro";

export default function PlanGuard({
  required,
  children,
}: {
  required: RequiredPlan;
  children: React.ReactNode;
}) {
  const { isSignedIn } = useUser();
  const plan = useUserPlan(); // "basis" | "pro" | null (während Laden)
  const location = useLocation();

  const next =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : location.pathname + location.search;

  // ---------------------------
  // 1) Ladezustand
  // ---------------------------
  if (plan === null) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        Lade Zugriffsdaten ...
      </div>
    );
  }

  // ---------------------------
  // 2) Login-Zwang für ALLE Tools
  // ---------------------------
  if (!isSignedIn) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  // ---------------------------
  // 3) FREE-Tools
  // required === "any"
  // Nur Login nötig → direkt durchlassen
  // ---------------------------
  if (required === "any") {
    return <>{children}</>;
  }

  const hasPaidPlan = plan === "basis" || plan === "pro";

  // ---------------------------
  // 4) Basis-Tools → Basis oder Pro
  // ---------------------------
  if (required === "basis" && !hasPaidPlan) {
    return (
      <Navigate
        to="/preise"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ---------------------------
  // 5) Pro-Tools
  // ---------------------------
  if (required === "pro" && plan !== "pro") {
    return (
      <Navigate
        to="/upgrade"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ---------------------------
  // 6) Zugriff erlaubt
  // ---------------------------
  return <>{children}</>;
}
