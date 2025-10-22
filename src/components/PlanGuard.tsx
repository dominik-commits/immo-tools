// src/components/PlanGuard.tsx
import React from "react";
import { hasAccess } from "@/lib/userPlan";

type Props = {
  required: "basis" | "pro";
  children: React.ReactNode;
  title?: string;          // optional: individueller Titel
  description?: string;    // optional: individueller Text
  upgradeHref?: string;    // optional: eigener Upgrade-Link (Stripe)
};

export default function PlanGuard({
  required,
  children,
  title = "Funktion in Pro enthalten",
  description = "Diese Funktion ist im IMMO Analyzer Pro (199 €/Jahr) enthalten. Du kannst jederzeit upgraden.",
  upgradeHref = "/upgrade",
}: Props) {
  if (hasAccess(required)) return <>{children}</>;
  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="rounded-2xl border bg-card text-card-foreground p-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        <a
          href={upgradeHref}
          className="inline-flex items-center rounded-xl px-5 py-3 bg-[hsl(216.8_44.9%_19.2%)] text-white hover:opacity-90 transition"
        >
          Jetzt auf Pro upgraden
        </a>
      </div>
    </div>
  );
}
