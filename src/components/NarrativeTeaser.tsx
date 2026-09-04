// src/components/NarrativeTeaser.tsx
// Teaser-Variante von ProGate speziell für die Handlungsempfehlung: der Eröffnungs-
// Halbsatz bleibt unverblurrt sichtbar (echte Zahlen aus bereits freien Werten wie
// dem Break-even-Kaufpreis), der Rest ist geblurrter, frei erfundener Fülltext.
//
// Bewusst kein ProGate-Wrapper hier: ProGate blurrt seine gesamten Children als
// einen Block, hier soll aber nur ein TEIL des Texts geblurrt werden, während der
// Rest lesbar bleibt -- deshalb eine eigene, kleinere Komponente statt ProGate mit
// einem Sondermodus zu überladen.
//
// Wie bei ProGate gilt: der geblurrte Fülltext ist reine Deko, niemals eine
// abgeschnittene echte PRO-Antwort -- CSS-Blur ist keine Sicherheitsgrenze, der
// Text bleibt im DOM auslesbar.
import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { isPro, type UserPlan } from "@/hooks/useUserPlan";

type Props = {
  plan: UserPlan;
  feature: string;
  /** Echter, immer sichtbarer Eröffnungs-Halbsatz aus bereits freien Werten. */
  teaser: string;
  /** Erfundener, geblurrter Fülltext -- niemals echte PRO-Inhalte. */
  filler: string;
  /** Vollständiger Inhalt (echte Handlungsempfehlung), nur für PRO gerendert. */
  fullContent: React.ReactNode;
  ctaLabel?: string;
};

export function NarrativeTeaser({ plan, feature, teaser, filler, fullContent, ctaLabel = "Jetzt upgraden" }: Props) {
  if (isPro(plan)) return <>{fullContent}</>;

  return (
    <div>
      <span style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>{teaser} </span>
      <span aria-hidden style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,0.9)", filter: "blur(4px)", userSelect: "none" }}>
        {filler}
      </span>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Lock size={12} color="#FCDC45" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>Vollständige Analyse ist Teil von PROPORA PRO</span>
        <Link
          to={`/upgrade?required=pro&from=${encodeURIComponent(feature)}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 8,
            fontSize: 11.5,
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

export default NarrativeTeaser;
