// src/core/mfhCalc.ts
// Reine Rechenlogik für die PRO-Bausteine des MFH-Analyzers (Score-Breakdown,
// Handlungsempfehlung/Narrative, volle 10-Jahres-Projektion, ETF-Vergleich).
//
// Keine React-/DOM-Abhängigkeiten: dieselbe Funktion läuft im Client (für PRO-
// Nutzer, sofortiges Feedback) und im Server unter /api/analyze/pro.ts (type: "mfh").
//
// Struktur bewusst parallel zu etwCalc.ts, aber an die tatsächliche MFH-Logik
// angepasst (Projektion inkl. Instandhaltungsrücklage, Narrative als ein Satz
// statt einer Satz-Liste -- so, wie es in MFHCheck.tsx bereits umgesetzt war).

import { eur } from "./calcs";

export type MfhDecisionLabel = "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";

export type MfhProInput = {
  noiYield: number;
  dscr: number;
  eigenkapital: number;
  monthlyCF: number;
  decisionLabel: MfhDecisionLabel;
  bePrice: number | null;
  beRentPerM2: number | null;
  kaufpreisView: number;
  avgRentPerM2: number;
  effRentYear: number;
  nichtUmlagefaehigeKosten: number;
  capexPct0: number;
  mietSteigerung: number;
  kostenSteigerung: number;
  annuitaetJahr: number;
};

export type ProjectionYear = { year: number; noi: number; cf: number };

export type MfhProResult = {
  scoreBreakdown: {
    noiYieldScore: number;
    dscrScore: number;
    weights: { noiYield: number; dscr: number };
  };
  narrative: string;
  marketComparison: string;
  projectionFull: ProjectionYear[];
  etf: {
    eigenkapital: number;
    etfWert10y: number;
    immoWert10y: number;
    etfDelta: number;
  };
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scale(x: number, a: number, b: number) {
  if (b === a) return 0;
  return clamp01((x - a) / (b - a));
}

export function buildProjection10y(opts: {
  years: number;
  effRentY1: number;
  nichtUmlagefaehige0: number;
  capexPct0: number;
  rentGrowth: number;
  costGrowth: number;
  annuitaetJahr: number;
}): ProjectionYear[] {
  const { years, effRentY1, nichtUmlagefaehige0, capexPct0, rentGrowth, costGrowth, annuitaetJahr } = opts;
  const data: ProjectionYear[] = [];
  for (let t = 1; t <= years; t++) {
    const effRentT = effRentY1 * Math.pow(1 + rentGrowth, t - 1);
    const opexT = nichtUmlagefaehige0 * Math.pow(1 + costGrowth, t - 1);
    const capexT = effRentY1 * capexPct0 * Math.pow(1 + costGrowth, t - 1);
    const noi = Math.max(0, effRentT - opexT - capexT);
    const cf = noi - annuitaetJahr;
    data.push({ year: t, noi: Math.round(noi), cf: Math.round(cf) });
  }
  return data;
}

export function computeMfhPro(input: MfhProInput): MfhProResult {
  const {
    noiYield, dscr, eigenkapital, monthlyCF, decisionLabel, bePrice, beRentPerM2,
    kaufpreisView, avgRentPerM2, effRentYear, nichtUmlagefaehigeKosten, capexPct0,
    mietSteigerung, kostenSteigerung, annuitaetJahr,
  } = input;

  const noiYieldScore = scale(noiYield, 0.035, 0.07);
  const dscrScore = scale(dscr, 1.1, 1.6);
  const scoreBreakdown = {
    noiYieldScore,
    dscrScore,
    weights: { noiYield: 0.55, dscr: 0.45 },
  };

  // Textliche Zusammenfassung statt nur Zahlen
  let narrative: string;
  if (decisionLabel === "RENTABEL") {
    narrative = `Diese Immobilie trägt sich bereits bei deinem aktuellen Eigenkapital (${eur(Math.round(eigenkapital))}) — der Cashflow bleibt mit ${eur(Math.round(monthlyCF))}/Monat im Plus.`;
  } else {
    const parts: string[] = [];
    if (bePrice && bePrice < kaufpreisView) {
      parts.push(`der Preis auf rund ${eur(Math.round(bePrice))} fällt`);
    }
    if (beRentPerM2 && beRentPerM2 > avgRentPerM2) {
      parts.push(`die Miete auf mind. ${beRentPerM2.toFixed(2).replace(".", ",")} €/m² steigt`);
    }
    if (parts.length === 0) {
      narrative = "Mit den aktuellen Annahmen bleibt der Cashflow negativ — prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel.";
    } else {
      narrative = `Diese Immobilie lohnt sich für dich, wenn ${parts.join(" oder wenn ")} — sonst bleibt der Cashflow im Minus.`;
    }
  }

  // Ehrliche Markteinordnung (Richtwert, keine echten Vergleichsdaten pro PLZ verfügbar)
  let marketComparison: string;
  if (noiYield >= 0.05) {
    marketComparison = "Deine Rendite liegt über dem für Mehrfamilienhäuser üblichen Richtwert von ca. 4–6 %.";
  } else if (noiYield >= 0.03) {
    marketComparison = "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Mehrfamilienhäuser (ca. 4–6 %).";
  } else {
    marketComparison = "Deine Rendite liegt unter dem üblichen Richtwert von ca. 4–6 % für Mehrfamilienhäuser.";
  }

  const projectionFull = buildProjection10y({
    years: 10,
    effRentY1: effRentYear,
    nichtUmlagefaehige0: nichtUmlagefaehigeKosten,
    capexPct0,
    rentGrowth: mietSteigerung,
    costGrowth: kostenSteigerung,
    annuitaetJahr,
  });

  const ekPositive = Math.max(0, eigenkapital);
  const cumulativeCF10y = projectionFull.reduce((s, y) => s + y.cf, 0);
  const etfWert10y = ekPositive * Math.pow(1.07, 10);
  const immoWert10y = ekPositive + cumulativeCF10y;
  const etfDelta = immoWert10y - etfWert10y;

  return {
    scoreBreakdown,
    narrative,
    marketComparison,
    projectionFull,
    etf: { eigenkapital: ekPositive, etfWert10y, immoWert10y, etfDelta },
  };
}

// ---------------------------------------------------------------------------
// Free-Teaser-Bausteine: nutzen ausschließlich Werte, die für Free-User bereits
// sichtbar sind (Break-even-Kaufpreis, Cashflow, ...). Kein Server-Roundtrip,
// kein PRO-Inhalt -- diese Funktionen laufen bewusst auch für Free-Accounts.
// ---------------------------------------------------------------------------

export type NarrativeTeaserInput = {
  decisionLabel: MfhDecisionLabel;
  eigenkapital: number;
  monthlyCF: number;
  bePrice: number | null;
  beRentPerM2: number | null;
  kaufpreisView: number;
  avgRentPerM2: number;
};

/** Ein echter, kurzer Eröffnungs-Halbsatz aus bereits freien Werten (kein Server-Call). */
export function buildNarrativeTeaser(input: NarrativeTeaserInput): string {
  const { decisionLabel, eigenkapital, monthlyCF, bePrice, beRentPerM2, kaufpreisView, avgRentPerM2 } = input;

  if (decisionLabel === "RENTABEL") {
    return `Diese Immobilie trägt sich bereits bei deinem aktuellen Eigenkapital (${eur(Math.round(eigenkapital))}) — der Cashflow bleibt mit ${eur(Math.round(monthlyCF))}/Monat im Plus`;
  }
  if (bePrice && bePrice < kaufpreisView) {
    return `Verhandle den Kaufpreis auf ca. ${eur(Math.round(bePrice))}`;
  }
  if (beRentPerM2 && beRentPerM2 > avgRentPerM2) {
    return `Achte darauf, dass die Miete auf mind. ${beRentPerM2.toFixed(2).replace(".", ",")} €/m² steigt`;
  }
  return "Prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel";
}

/**
 * Rein dekorative Fortschreibung der echten Jahr-1/2-Werte für Jahr 3-10 --
 * KEINE echte Prognose (die läuft weiterhin nur über computeMfhPro). Dient nur
 * dazu, dass der geblurrte Chart-Teaser optisch an die echten Jahr-1/2-Balken
 * anschließt, statt eine beliebige Kurve zu zeigen.
 */
export function buildProjectionTeaserContinuation(preview: ProjectionYear[]): ProjectionYear[] {
  if (preview.length === 0) return [];
  const y1 = preview[0];
  const y2 = preview[1] ?? y1;
  const noiDelta = y2.noi - y1.noi;
  const cfDelta = y2.cf - y1.cf;

  const data = [...preview];
  for (let t = preview.length + 1; t <= 10; t++) {
    const prev = data[data.length - 1];
    data.push({
      year: t,
      noi: Math.round(prev.noi + noiDelta * 0.8),
      cf: Math.round(prev.cf + cfDelta * 0.8),
    });
  }
  return data;
}
