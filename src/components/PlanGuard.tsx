// src/components/PlanGuard.tsx
import React from "react";
import { usePlan } from "../subscription/usePlan";
import type { Plan } from "../config/featureMatrix";
import { isAllowed } from "../config/featureMatrix";

type Props = {
  required: Plan;          // "basis" | "pro"
  children: React.ReactNode;
  title?: string;          // optional: Feature-Titel für Message
};

export default function PlanGuard({ required, children, title }: Props) {
  const { plan } = usePlan();

  if (isAllowed(plan, required)) {
    return <>{children}</>;
  }

  const label = required === "pro" ? "Pro" : "Basis";
  return (
    <div className="max-w-xl mx-auto mt-10 rounded-2xl border bg-card p-6 shadow-soft text-center">
      <h2 className="text-lg font-semibold">
        {title ?? "Dieses Modul"} ist nur im {label}-Paket verfügbar
      </h2>
      <p className="text-sm text-muted-foreground mt-2">
        Aktueller Plan: <b className="font-medium">{plan.toUpperCase()}</b>
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <a className="px-4 py-2 rounded-lg border bg-card hover:bg-surface" href="/pricing">
          Preise ansehen
        </a>
        {required === "pro" && (
          <a className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800" href="/upgrade">
            Jetzt auf Pro upgraden
          </a>
        )}
      </div>
    </div>
  );
}
