// src/core/gewerbeCalc.ts
// Reine Rechenlogik für die PRO-Bausteine des Gewerbe-Analyzers (Score-Breakdown,
// Handlungsempfehlung, volle 10-Jahres-Projektion, ETF-Vergleich).
//
// Keine React-/DOM-Abhängigkeiten -- läuft im Client (PRO-Nutzer, sofortiges
// Feedback) und im Server unter /api/analyze/pro.ts (type: "gewerbe"). Struktur
// parallel zu mixedCalc.ts, aber mit dem Gewerbe-eigenen 4-Komponenten-Score
// (Rendite/DSCR/Mietvertrag/Bonität-Konzentration statt Rendite/DSCR/Wert-Gap/
// Cashflow) und der zonenbasierten Projektion, so wie sie in GewerbeCheck.tsx
// bereits umgesetzt war (buildProjection10y/annuityExact von dort hierher
// verschoben, damit Client-Vorschau und Server-PRO-Antwort dieselbe Funktion
// nutzen statt zwei Implementierungen zu pflegen).

import { eur, pct } from "./calcs";

export type GewerbeScoreLabel = "BUY" | "CHECK" | "NO";

export type GewerbeZone = {
  areaM2: number;
  rentPerM2: number;
  vacancyPct: number;
  recoverablePct: number;
  freeRentMonthsY1: number;
  tiPerM2: number;
};

export type GewerbeProInput = {
  noiYield: number;
  dscr: number | null;
  avgWALT: number;
  indexiert: boolean;
  bonitaetScoreValue: number;
  largestZoneRentShare: number;
  cashflowMonatY1: number;
  scoreLabel: GewerbeScoreLabel;
  ltvPct: number;
  wertAusCap: number;
  valueGap: number;
  eigenkapitalGewerbe: number;
  // Für die 10-Jahres-Projektion (gleiche Wachstumsannahmen wie zuvor inline)
  zones: GewerbeZone[];
  rentAdjPct: number;
  opexPct: number;
  capexPct: number;
  loan: number;
  zinsPct: number;
  yearsLoan: number;
  financingOn: boolean;
};

export type ProjectionPoint = { year: number; cashflowPA: number; tilgungPA: number };

export type GewerbeProResult = {
  scoreBreakdown: {
    noiYieldScore: number;
    dscrScore: number;
    leaseScore: number;
    tenantScore: number;
    weights: { noiYield: number; dscr: number; lease: number; tenant: number };
  };
  narrative: string;
  marketComparison: string;
  projectionFull: ProjectionPoint[];
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

export function annuityExact(loan: number, r: number, years: number) {
  if (loan <= 0 || r <= 0 || years <= 0) return 0;
  const n = Math.round(years);
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

export function buildProjection10y(opts: {
  years: number;
  zones: GewerbeZone[];
  rentAdjPct: number;
  opexPct: number;
  capexPct: number;
  rentGrowthPct: number;
  costGrowthPct: number;
  loan: number;
  zinsPct: number;
  yearsLoan: number;
  financingOn: boolean;
}): ProjectionPoint[] {
  const {
    years, zones, rentAdjPct, opexPct, capexPct, rentGrowthPct, costGrowthPct,
    loan, zinsPct, yearsLoan, financingOn,
  } = opts;

  const data: ProjectionPoint[] = [];
  let outstanding = financingOn ? loan : 0;
  const n = Math.round(yearsLoan);
  const ann = financingOn ? annuityExact(loan, zinsPct, n) : 0;

  for (let t = 1; t <= years; t++) {
    let gross = 0, eff = 0, recovered = 0, ti = 0;

    for (const z of zones) {
      const freeFactorY1 = t === 1 ? 1 - Math.min(z.freeRentMonthsY1, 12) / 12 : 1;
      const grossZ0 = z.areaM2 * z.rentPerM2 * (1 + rentAdjPct) * 12 * freeFactorY1;
      const grossZt = grossZ0 * Math.pow(1 + rentGrowthPct, t - 1);
      const effZt = grossZt * (1 - clamp01(z.vacancyPct));

      gross += grossZt;
      eff += effZt;
      recovered += grossZt * opexPct * clamp01(z.recoverablePct);

      if (t === 1) ti += z.areaM2 * Math.max(0, z.tiPerM2);
    }

    const opexT = gross * (opexPct * Math.pow(1 + costGrowthPct, t - 1));
    const capexT = gross * (capexPct * Math.pow(1 + costGrowthPct, t - 1));
    const landlordOpexT = Math.max(0, opexT - recovered);
    const noiT = eff - landlordOpexT - capexT;

    const interest = financingOn ? outstanding * zinsPct : 0;
    const principal = financingOn ? Math.min(ann - interest, Math.max(0, outstanding)) : 0;
    outstanding = Math.max(0, outstanding - principal);

    const cf = noiT - (financingOn ? ann : 0) - (t === 1 ? ti : 0);

    data.push({ year: t, cashflowPA: Math.round(cf), tilgungPA: Math.round(principal) });
  }
  return data;
}

export function computeGewerbePro(input: GewerbeProInput): GewerbeProResult {
  const {
    noiYield, dscr, avgWALT, indexiert, bonitaetScoreValue, largestZoneRentShare,
    cashflowMonatY1, scoreLabel, ltvPct, wertAusCap, valueGap, eigenkapitalGewerbe,
    zones, rentAdjPct, opexPct, capexPct, loan, zinsPct, yearsLoan, financingOn,
  } = input;

  const noiYieldScore = scale(noiYield, 0.045, 0.09);
  const dscrScore = scale(dscr ?? 0, 1.2, 1.7);
  const leaseScore = clamp01(scale(avgWALT, 2, 10) * 0.7 + (indexiert ? 1 : 0.3) * 0.3);
  const tenantScore = clamp01(bonitaetScoreValue * 0.65 + (1 - largestZoneRentShare) * 0.35);
  const scoreBreakdown = {
    noiYieldScore,
    dscrScore,
    leaseScore,
    tenantScore,
    weights: { noiYield: 0.35, dscr: 0.25, lease: 0.2, tenant: 0.2 },
  };

  let narrative: string;
  if (scoreLabel === "BUY") {
    narrative = `Dieses Objekt trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonatY1))}/Monat im Plus.`;
  } else if (valueGap < 0) {
    narrative = `Der Modellwert (${eur(Math.round(wertAusCap))}) liegt unter dem Kaufpreis — verhandle den Preis oder prüfe, ob Miete und Cap-Rate realistisch angesetzt sind.`;
  } else if (cashflowMonatY1 < 0) {
    narrative = "Mit den aktuellen Annahmen bleibt der Cashflow negativ — prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel.";
  } else {
    narrative = "Die Kennzahlen liegen im mittleren Bereich — spiel mit der Spielwiese verschiedene Szenarien durch, um den Deal zu verbessern.";
  }

  let marketComparison: string;
  if (noiYield >= 0.07) {
    marketComparison = "Deine Rendite liegt über dem für Gewerbeobjekte üblichen Richtwert von ca. 4,5–7 %.";
  } else if (noiYield >= 0.045) {
    marketComparison = "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Gewerbeobjekte (ca. 4,5–7 %).";
  } else {
    marketComparison = "Deine Rendite liegt unter dem üblichen Richtwert von ca. 4,5–7 % für Gewerbeobjekte.";
  }

  const projectionFull = buildProjection10y({
    years: 10, zones, rentAdjPct, opexPct, capexPct,
    rentGrowthPct: 0.015, costGrowthPct: 0.02, loan, zinsPct, yearsLoan, financingOn,
  });

  const ekPositive = Math.max(0, eigenkapitalGewerbe);
  const cumulativeCF10y = projectionFull.reduce((s, y) => s + y.cashflowPA, 0);
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
// sichtbar sind (Score-Ampel, Modellwert, Cashflow, ...). Kein Server-Roundtrip,
// kein PRO-Inhalt -- diese Funktionen laufen bewusst auch für Free-Accounts.
// ---------------------------------------------------------------------------

export type NarrativeTeaserInput = {
  scoreLabel: GewerbeScoreLabel;
  ltvPct: number;
  cashflowMonatY1: number;
  valueGap: number;
  wertAusCap: number;
};

/** Ein echter, kurzer Eröffnungs-Halbsatz aus bereits freien Werten (kein Server-Call). */
export function buildNarrativeTeaser(input: NarrativeTeaserInput): string {
  const { scoreLabel, ltvPct, cashflowMonatY1, valueGap, wertAusCap } = input;

  if (scoreLabel === "BUY") {
    return `Dieses Objekt trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonatY1))}/Monat im Plus`;
  }
  if (valueGap < 0) {
    return `Der Modellwert (${eur(Math.round(wertAusCap))}) liegt unter dem Kaufpreis`;
  }
  if (cashflowMonatY1 < 0) {
    return "Prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel";
  }
  return "Die Kennzahlen liegen im mittleren Bereich";
}

/**
 * Rein dekorative Fortschreibung der echten Jahr-1/2-Werte für Jahr 3-10 --
 * KEINE echte Prognose (die läuft weiterhin nur über computeGewerbePro). Dient
 * nur dazu, dass der geblurrte Chart-Teaser optisch an die echten Jahr-1/2-
 * Balken anschließt, statt eine beliebige Kurve zu zeigen.
 */
export function buildProjectionTeaserContinuation(preview: ProjectionPoint[]): ProjectionPoint[] {
  if (preview.length === 0) return [];
  const y1 = preview[0];
  const y2 = preview[1] ?? y1;
  const cfDelta = y2.cashflowPA - y1.cashflowPA;
  const tilgDelta = y2.tilgungPA - y1.tilgungPA;

  const data = [...preview];
  for (let t = preview.length + 1; t <= 10; t++) {
    const prev = data[data.length - 1];
    data.push({
      year: t,
      cashflowPA: Math.round(prev.cashflowPA + cfDelta * 0.8),
      tilgungPA: Math.round(prev.tilgungPA + tilgDelta * 0.8),
    });
  }
  return data;
}
