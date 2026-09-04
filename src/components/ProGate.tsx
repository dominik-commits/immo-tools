// src/components/ProGate.tsx
// Wiederverwendbarer Gate für PRO-only Feature-Abschnitte innerhalb einer Seite.
// Anders als PlanGuard/RequirePlan (die eine ganze Route sperren), blurrt ProGate
// nur den betroffenen Abschnitt und zeigt einen Upgrade-CTA darüber.
//
// Wichtig: ProGate ist reine UI. Für Daten, die Free-User nie im Netzwerk-Response
// sehen dürfen, muss die Redaktion serverseitig passieren (siehe /api/analyze/*) –
// ProGate darf dann nur mit Platzhalter-/Beispieldaten als children befüllt werden,
// niemals mit den echten, ungefilterten Werten. Diese Platzhalter dürfen aus
// bereits frei sichtbaren Werten des Nutzers gespeist sein (z.B. sein echtes
// Eigenkapital), solange das Ergebnis selbst erfunden/synthetisch bleibt -- ein
// CSS-Blur versteckt Text nur visuell, nicht im DOM, deshalb darf hinter dem Blur
// nie eine echte PRO-Zahl stehen, die ein Free-User per Inspector auslesen könnte.
import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { isPro, type UserPlan } from "@/hooks/useUserPlan";

type Props = {
  plan: UserPlan;
  feature: string;
  children: React.ReactNode;
  ctaLabel?: string;
  compact?: boolean;
  /** Überschreibt die generische "{feature} ist Teil von PROPORA PRO"-Zeile mit
   *  ergebnisorientierter Copy (darf dynamische, bereits freie Werte enthalten). */
  message?: React.ReactNode;
};

export function ProGate({ plan, feature, children, ctaLabel = "Jetzt upgraden", compact = false, message }: Props) {
  if (isPro(plan)) return <>{children}</>;

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
      <div aria-hidden style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? 8 : 12,
          padding: compact ? 12 : 20,
          textAlign: "center",
          background: "rgba(13,17,23,0.55)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 100,
            background: "rgba(252,220,69,0.12)",
            border: "1px solid rgba(252,220,69,0.3)",
          }}
        >
          <Lock size={12} color="#FCDC45" />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#FCDC45" }}>
            PRO
          </span>
        </div>
        {!compact && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", maxWidth: 280 }}>
            {message ?? `${feature} ist Teil von PROPORA PRO`}
          </div>
        )}
        <Link
          to={`/upgrade?required=pro&from=${encodeURIComponent(feature)}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: compact ? "6px 14px" : "9px 18px",
            borderRadius: 9,
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            textDecoration: "none",
            background: "#FCDC45",
            color: "#0d1117",
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default ProGate;
