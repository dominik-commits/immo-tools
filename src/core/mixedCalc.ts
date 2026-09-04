// src/core/mixedCalc.ts
// Reine Rechenlogik für die PRO-Bausteine des Gemischte-Immobilie-Analyzers
// (Score-Breakdown, Handlungsempfehlung/Narrative, volle 10-Jahres-Projektion,
// ETF-Vergleich). Struktur parallel zu etwCalc.ts/mfhCalc.ts/efhCalc.ts, aber
// mit dem Mixed-Use-eigenen 4-Komponenten-Score (Rendite/DSCR/Wert-Gap/Cashflow)
// und der Projektion mit den drei Feldern Cashflow/Tilgung/Vermögensaufbau, so
// wie es in MixedUseCheck.tsx bereits umgesetzt war.

import { eur, pct } from "./calcs";

export type MixedScoreLabel = "BUY" | "CHECK" | "NO";

export type MixedProInput = {
  noiYield: number;
  dscr: number | null;
  valueGapPct: number;
  cashflowMonat: number;
  scoreLabel: MixedScoreLabel;
  ltvPct: number;
  wertAusCap: number;
  eigenkapitalMixed: number;
  // Für die 10-Jahres-Projektion (gleiche Wachstumsannahmen wie zuvor inline)
  grossW0: number;
  grossG0: number;
  opexW0: number;
  opexG0: number;
  wLeer: number;
  gLeer: number;
  kaufpreis: number;
  financingOn: boolean;
  zinsPct: number;
  tilgungPct: number;
  loan: number;
};

export type ProjectionYear = { year: number; Cashflow: number; Tilgung: number; Vermoegen: number };

export type MixedProResult = {
  scoreBreakdown: {
    noiYieldScore: number;
    dscrScore: number;
    valueGapScore: number;
    cashflowScore: number;
    weights: { noiYield: number; dscr: number; valueGap: number; cashflow: number };
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
  grossW0: number;
  grossG0: number;
  opexW0: number;
  opexG0: number;
  wLeer: number;
  gLeer: number;
  kaufpreis: number;
  financingOn: boolean;
  zinsPct: number;
  tilgungPct: number;
  loan: number;
}): ProjectionYear[] {
  const { years, grossW0, grossG0, opexW0, opexG0, wLeer, gLeer, kaufpreis, financingOn, zinsPct, tilgungPct, loan } = opts;
  const wRentGrowth = 0.02;
  const gRentGrowth = 0.015; // Gewerbe konservativer
  const costGrowth = 0.02;
  const valueGrowthAssume = 0.02;

  const data: ProjectionYear[] = [];
  let outstanding = loan;
  for (let t = 1; t <= years; t++) {
    const grossW = grossW0 * Math.pow(1 + wRentGrowth, t - 1);
    const effW = grossW * (1 - wLeer);
    const opexW = opexW0 * Math.pow(1 + costGrowth, t - 1);

    const grossG = grossG0 * Math.pow(1 + gRentGrowth, t - 1);
    const effG = grossG * (1 - gLeer);
    const opexG = opexG0 * Math.pow(1 + costGrowth, t - 1);

    const noiT = effW - opexW + (effG - opexG);
    const interest = financingOn ? outstanding * zinsPct : 0;
    const annu = financingOn ? loan * (zinsPct + tilgungPct) : 0;
    const tilg = Math.max(0, annu - interest);
    outstanding = Math.max(0, outstanding - tilg);
    const cf = noiT - annu;
    const verm = tilg + kaufpreis * valueGrowthAssume;

    data.push({ year: t, Cashflow: Math.round(cf), Tilgung: Math.round(tilg), Vermoegen: Math.round(verm) });
  }
  return data;
}

export function computeMixedPro(input: MixedProInput): MixedProResult {
  const {
    noiYield, dscr, valueGapPct, cashflowMonat, scoreLabel, ltvPct, wertAusCap, eigenkapitalMixed,
    grossW0, grossG0, opexW0, opexG0, wLeer, gLeer, kaufpreis, financingOn, zinsPct, tilgungPct, loan,
  } = input;

  const noiYieldScore = scale(noiYield, 0.035, 0.065);
  const dscrScore = dscr == null ? 0.6 : scale(dscr, 1.0, 1.6);
  const valueGapScore = scale(valueGapPct, -0.05, 0.1);
  const cashflowScore = scale(cashflowMonat, -200, 300);
  const scoreBreakdown = {
    noiYieldScore,
    dscrScore,
    valueGapScore,
    cashflowScore,
    weights: { noiYield: 0.34, dscr: 0.28, valueGap: 0.24, cashflow: 0.14 },
  };

  let narrative: string;
  if (scoreLabel === "BUY") {
    narrative = `Dieses Objekt trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonat))}/Monat im Plus.`;
  } else if (valueGapPct < 0) {
    narrative = `Der kapitalisierte Wert (${eur(Math.round(wertAusCap))}) liegt unter dem Kaufpreis — verhandle den Preis oder prüfe, ob die Mietansätze/Cap-Raten realistisch sind.`;
  } else if (cashflowMonat < 0) {
    narrative = "Mit den aktuellen Annahmen bleibt der Cashflow negativ — prüfe Kaufpreis, Mieten und Finanzierung im Zusammenspiel.";
  } else {
    narrative = "Die Kennzahlen liegen im mittleren Bereich — spiel mit der Spielwiese verschiedene Szenarien durch, um den Deal zu verbessern.";
  }

  let marketComparison: string;
  if (noiYield >= 0.05) {
    marketComparison = "Deine Rendite liegt über dem für gemischt genutzte Objekte üblichen Richtwert von ca. 4–6 %.";
  } else if (noiYield >= 0.035) {
    marketComparison = "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für gemischt genutzte Objekte (ca. 4–6 %).";
  } else {
    marketComparison = "Deine Rendite liegt unter dem üblichen Richtwert von ca. 4–6 % für gemischt genutzte Objekte.";
  }

  const projectionFull = buildProjection10y({
    years: 10, grossW0, grossG0, opexW0, opexG0, wLeer, gLeer, kaufpreis, financingOn, zinsPct, tilgungPct, loan,
  });

  const ekPositive = Math.max(0, eigenkapitalMixed);
  const cumulativeCF10y = projectionFull.reduce((s, y) => s + y.Cashflow, 0);
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
// sichtbar sind (Wert nach Cap-Rate, Cashflow, ...). Kein Server-Roundtrip,
// kein PRO-Inhalt -- diese Funktionen laufen bewusst auch für Free-Accounts.
// ---------------------------------------------------------------------------

export type NarrativeTeaserInput = {
  scoreLabel: MixedScoreLabel;
  ltvPct: number;
  cashflowMonat: number;
  valueGapPct: number;
  wertAusCap: number;
};

/** Ein echter, kurzer Eröffnungs-Halbsatz aus bereits freien Werten (kein Server-Call). */
export function buildNarrativeTeaser(input: NarrativeTeaserInput): string {
  const { scoreLabel, ltvPct, cashflowMonat, valueGapPct, wertAusCap } = input;

  if (scoreLabel === "BUY") {
    return `Dieses Objekt trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonat))}/Monat im Plus`;
  }
  if (valueGapPct < 0) {
    return `Der kapitalisierte Wert (${eur(Math.round(wertAusCap))}) liegt unter dem Kaufpreis`;
  }
  if (cashflowMonat < 0) {
    return "Prüfe Kaufpreis, Mieten und Finanzierung im Zusammenspiel";
  }
  return "Die Kennzahlen liegen im mittleren Bereich";
}

/**
 * Rein dekorative Fortschreibung der echten Jahr-1/2-Werte für Jahr 3-10 --
 * KEINE echte Prognose (die läuft weiterhin nur über computeMixedPro). Dient
 * nur dazu, dass der geblurrte Chart-Teaser optisch an die echten Jahr-1/2-
 * Balken anschließt, statt eine beliebige Kurve zu zeigen.
 */
export function buildProjectionTeaserContinuation(preview: ProjectionYear[]): ProjectionYear[] {
  if (preview.length === 0) return [];
  const y1 = preview[0];
  const y2 = preview[1] ?? y1;
  const cfDelta = y2.Cashflow - y1.Cashflow;
  const tilgDelta = y2.Tilgung - y1.Tilgung;
  const vermDelta = y2.Vermoegen - y1.Vermoegen;

  const data = [...preview];
  for (let t = preview.length + 1; t <= 10; t++) {
    const prev = data[data.length - 1];
    data.push({
      year: t,
      Cashflow: Math.round(prev.Cashflow + cfDelta * 0.8),
      Tilgung: Math.round(prev.Tilgung + tilgDelta * 0.8),
      Vermoegen: Math.round(prev.Vermoegen + vermDelta * 0.8),
    });
  }
  return data;
}
