// src/components/PlanGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useUserPlan } from "@/hooks/useUserPlan";

export type RequiredPlan = "any" | "basis" | "pro";

export default function PlanGuard({
  required,
  children,
}: {
  required: RequiredPlan;
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded: authLoaded } = useUser();
  const { plan, isLoading } = useUserPlan();
  const location = useLocation();
  const next =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : location.pathname + location.search;

  // 1) Noch am Laden
  if (!authLoaded || isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        Lade Zugriffsdaten ...
      </div>
    );
  }

  // 2) Nicht eingeloggt → Login
  if (!isSignedIn) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  // 3) "any" = nur Login nötig → alle eingeloggten User durch
  if (required === "any") {
    return <>{children}</>;
  }

  // 4) Basis-Tools → free User werden zu Preisseite geschickt
  if (required === "basis" && plan === "free") {
    return (
      <Navigate
        to="/preise"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // 5) Pro-Tools → nur Pro durch
  if (required === "pro" && plan !== "pro") {
    return (
      <Navigate
        to="/upgrade"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // 6) Zugriff erlaubt
  return <>{children}</>;
}