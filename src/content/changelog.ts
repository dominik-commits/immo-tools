// src/content/changelog.ts
// Manuell gepflegte Liste der letzten Produkt-Erweiterungen.
// WICHTIG: Bei jedem neuen Feature hier einen Eintrag ergaenzen (oben einfuegen, neueste zuerst).
// "date" im Format YYYY-MM-DD, wird fuer die "NEU"-Kennzeichnung genutzt (aktuell: 14 Tage).

export type ChangelogEntry = {
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  icon: string; // Emoji, damit kein Icon-Import noetig ist
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-08-30",
    title: "Live-Szenarien & ETF-Vergleich",
    description: "Spielwiese direkt neben dem Ergebnis, plus Vergleich: Schlaegt die Immobilie eine ETF-Anlage?",
    icon: "🎛️",
  },
  {
    date: "2026-08-30",
    title: "Adress-Autovervollstaendigung mit Karte",
    description: "Adresse eintippen, Vorschlaege inkl. Mini-Karte direkt im Formular auswaehlen.",
    icon: "📍",
  },
  {
    date: "2026-08-30",
    title: "Gefuehrte Tour & teilbare Ergebnis-Karte",
    description: "Neue Kurz-Tour durch die wichtigsten Funktionen, plus Ein-Klick-Export deines Ergebnisses als Bild.",
    icon: "🗺️",
  },
];

export function isRecent(dateStr: string, withinDays = 14): boolean {
  const days = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  return days <= withinDays;
}
