// src/core/efhCalc.ts
// Reine Rechenlogik für die PRO-Bausteine des EFH-Analyzers (Score-Breakdown,
// Handlungsempfehlung/Narrative, volle 10-Jahres-Projektion, ETF-Vergleich).
//
// Keine React-/DOM-Abhängigkeiten -- läuft im Client (PRO-Nutzer, sofortiges
// Feedback) und im Server unter /api/analyze/pro.ts (type: "efh"). Struktur parallel zu
// etwCalc.ts/mfhCalc.ts, aber mit dem EFH-eigenen 3-Komponenten-Score
// (Rendite/DSCR/Cashflow statt nur Rendite/DSCR) und der einfacheren Narrative
// (kein Miet-Breakeven für EFH vorhanden).

import { eur, pct } from "./calcs";

export type EfhScoreLabel = "BUY" | "CHECK" | "NO";

export type EfhProInput = {
  noiYield: number;
  dscr: number | null;
  cashflowMonat: number;
  scoreLabel: EfhScoreLabel;
  ltvPct: number;
  bePriceEFH: number | null;
  kaufpreis: number;
  mieteEffektiv: number;
  laufendeKostenJahr: number;
  mietSteigerung: number;
  kostenSteigerung: number;
  financingOn: boolean;
  annuityYear: number;
  eigenkapitalEFH: number;
};

export type ProjectionYear = { year: number; noi: number; cf: number };

export type EfhProResult = {
  scoreBreakdown: {
    noiYieldScore: number;
    dscrScore: number;
    cashflowScore: number;
    weights: { noiYield: number; dscr: number; cashflow: number };
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
  mieteEffektiv: number;
  laufendeKostenJahr: number;
  rentGrowth: number;
  costGrowth: number;
  financingOn: boolean;
  annuityYear: number;
}): ProjectionYear[] {
  const { years, mieteEffektiv, laufendeKostenJahr, rentGrowth, costGrowth, financingOn, annuityYear } = opts;
  const data: ProjectionYear[] = [];
  for (let t = 1; t <= years; t++) {
    const rentT = mieteEffektiv * Math.pow(1 + rentGrowth, t - 1);
    const costT = laufendeKostenJahr * Math.pow(1 + costGrowth, t - 1);
    const noiT = Math.max(0, rentT - costT);
    const cfT = noiT - (financingOn ? annuityYear : 0);
    data.push({ year: t, noi: Math.round(noiT), cf: Math.round(cfT) });
  }
  return data;
}

export function computeEfhPro(input: EfhProInput): EfhProResult {
  const {
    noiYield, dscr, cashflowMonat, scoreLabel, ltvPct, bePriceEFH, kaufpreis,
    mieteEffektiv, laufendeKostenJahr, mietSteigerung, kostenSteigerung,
    financingOn, annuityYear, eigenkapitalEFH,
  } = input;

  const noiYieldScore = scale(noiYield, 0.03, 0.06);
  const dscrScore = scale(dscr ?? 0, 1.1, 1.6);
  const cashflowScore = scale(cashflowMonat, 0, 800);
  const scoreBreakdown = {
    noiYieldScore,
    dscrScore,
    cashflowScore,
    weights: { noiYield: 0.45, dscr: 0.35, cashflow: 0.2 },
  };

  let narrative: string;
  if (scoreLabel === "BUY") {
    narrative = `Dieses Einfamilienhaus trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonat))}/Monat im Plus.`;
  } else if (bePriceEFH && bePriceEFH < kaufpreis) {
    narrative = `Dieses Einfamilienhaus lohnt sich für dich, wenn der Preis auf rund ${eur(Math.round(bePriceEFH))} fällt oder du mehr Eigenkapital einbringst — sonst bleibt der Cashflow im Minus.`;
  } else {
    narrative = "Mit den aktuellen Annahmen bleibt der Cashflow negativ — prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel.";
  }

  let marketComparison: string;
  if (noiYield >= 0.05) {
    marketComparison = "Deine Rendite liegt über dem für Einfamilienhäuser üblichen Richtwert von ca. 3–5 %.";
  } else if (noiYield >= 0.03) {
    marketComparison = "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Einfamilienhäuser (ca. 3–5 %).";
  } else {
    marketComparison = "Deine Rendite liegt unter dem üblichen Richtwert von ca. 3–5 % für Einfamilienhäuser.";
  }

  const projectionFull = buildProjection10y({
    years: 10,
    mieteEffektiv,
    laufendeKostenJahr,
    rentGrowth: mietSteigerung,
    costGrowth: kostenSteigerung,
    financingOn,
    annuityYear,
  });

  const ekPositive = Math.max(0, eigenkapitalEFH);
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
  scoreLabel: EfhScoreLabel;
  ltvPct: number;
  cashflowMonat: number;
  bePriceEFH: number | null;
  kaufpreis: number;
};

/** Ein echter, kurzer Eröffnungs-Halbsatz aus bereits freien Werten (kein Server-Call). */
export function buildNarrativeTeaser(input: NarrativeTeaserInput): string {
  const { scoreLabel, ltvPct, cashflowMonat, bePriceEFH, kaufpreis } = input;

  if (scoreLabel === "BUY") {
    return `Dieses Einfamilienhaus trägt sich bereits bei ${pct(ltvPct)} Fremdfinanzierung — der Cashflow bleibt mit ${eur(Math.round(cashflowMonat))}/Monat im Plus`;
  }
  if (bePriceEFH && bePriceEFH < kaufpreis) {
    return `Verhandle den Kaufpreis auf ca. ${eur(Math.round(bePriceEFH))}`;
  }
  return "Prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel";
}

/**
 * Rein dekorative Fortschreibung der echten Jahr-1/2-Werte für Jahr 3-10 --
 * KEINE echte Prognose (die läuft weiterhin nur über computeEfhPro). Dient nur
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
