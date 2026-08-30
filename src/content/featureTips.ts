// src/content/featureTips.ts
// Rotierende Kurz-Tipps auf dem Dashboard, um neue/wenig entdeckte Funktionen sichtbar zu machen.
// Manuell gepflegt -- bei neuen Features gerne ergaenzen.

export type FeatureTip = { text: string; href?: string };

export const FEATURE_TIPS: FeatureTip[] = [
  { text: "Wusstest du schon? Du kannst dein Ergebnis als Bild teilen — Klick auf \"Teilen\" in der Ergebnis-Karte.", href: "/wohnung" },
  { text: "Wusstest du schon? Mit der Spielwiese kannst du Preis & Miete anpassen, ohne deine echten Werte zu verlieren.", href: "/wohnung" },
  { text: "Wusstest du schon? Die geführte Tour zeigt dir in 30 Sekunden die wichtigsten Funktionen — Klick auf \"🗺️ Tour\".", href: "/wohnung" },
  { text: "Wusstest du schon? Im ETF-Vergleich siehst du, ob sich eine Immobilie gegen eine einfache Aktien-Anlage schlägt.", href: "/wohnung" },
  { text: "Wusstest du schon? Beim Eintippen deiner Adresse bekommst du echte Vorschläge inkl. Mini-Karte.", href: "/wohnung" },
];
