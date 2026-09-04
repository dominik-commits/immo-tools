// src/core/etwCalc.ts
// Reine Rechenlogik für die PRO-Bausteine des ETW-Analyzers (Score-Breakdown,
// Handlungsempfehlung/Narrative, volle 10-Jahres-Projektion, ETF-Vergleich).
//
// Keine React-/DOM-Abhängigkeiten: dieselbe Funktion läuft im Client (für PRO-
// Nutzer, sofortiges Feedback) und im Server unter /api/analyze/pro.ts (type: "etw")
// (Quelle der Wahrheit für die Plan-Prüfung — siehe dort).
//
// Die Basis-Kennzahlen (Score, Cashflow, DSCR, Jahr-1/2-Projektion) bleiben
// bewusst in Eigentumswohnung.tsx: sie sind reine Ableitungen aus den eigenen
// Eingaben des Nutzers und nicht schützenswert.

import { eur, pct } from "./calcs";

export type EtwProInput = {
  noiYield: number;
  dscr: number;
  allIn: number;
  wertNOI: number;
  monthlyCF: number;
  financingOn: boolean;
  loan: number;
  ltvPct: number;
  bePrice: number | null;
  beRentPerM2: number;
  mieteProM2Monat: number;
  effRentYear: number;
  opexYear: number;
  mietSteigerung: number;
  kostenSteigerung: number;
  annuitaetJahr: number;
  eigenkapital: number;
};

export type ProjectionYear = { year: number; noi: number; cf: number };

export type EtwProResult = {
  scoreBreakdown: {
    noiYieldScore: number; // 0..1
    dscrScore: number; // 0..1
    weights: { noiYield: number; dscr: number };
  };
  analysisSentences: string[];
  marketComparison: string;
  projectionFull: ProjectionYear[]; // Jahr 1-10
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
  opex0: number;
  rentGrowth: number;
  costGrowth: number;
  annuitaetJahr: number;
}): ProjectionYear[] {
  const { years, effRentY1, opex0, rentGrowth, costGrowth, annuitaetJahr } = opts;
  const data: ProjectionYear[] = [];
  for (let t = 1; t <= years; t++) {
    const effRentT = effRentY1 * Math.pow(1 + rentGrowth, t - 1);
    const opexT = opex0 * Math.pow(1 + costGrowth, t - 1);
    const noi = Math.max(0, effRentT - opexT);
    const cf = noi - annuitaetJahr;
    data.push({ year: t, noi: Math.round(noi), cf: Math.round(cf) });
  }
  return data;
}

export function computeEtwPro(input: EtwProInput): EtwProResult {
  const {
    noiYield, dscr, allIn, wertNOI, monthlyCF, financingOn, loan, ltvPct,
    bePrice, beRentPerM2, mieteProM2Monat, effRentYear, opexYear,
    mietSteigerung, kostenSteigerung, annuitaetJahr, eigenkapital,
  } = input;

  // Score-Breakdown: dieselbe Gewichtung wie der öffentlich sichtbare Score,
  // hier aber in ihre zwei Teil-Scores aufgeschlüsselt.
  const noiYieldScore = scale(noiYield, 0.035, 0.07);
  const dscrScore = scale(dscr, 1.1, 1.6);
  const scoreBreakdown = {
    noiYieldScore,
    dscrScore,
    weights: { noiYield: 0.55, dscr: 0.45 },
  };

  // Handlungsempfehlung / narrative Zusammenfassung
  const analysisSentences: string[] = [];
  if (wertNOI > 0 && allIn > 0) {
    const diffPct = (allIn - wertNOI) / wertNOI;
    if (diffPct > 0.12) {
      analysisSentences.push(
        `Der Kaufpreis liegt mit ${eur(Math.round(allIn))} rund ${pct(diffPct)} über dem Wert, den die Wohnung nach ihrer Mietrendite eigentlich hätte (${eur(Math.round(wertNOI))}).`
      );
    } else if (diffPct < -0.12) {
      analysisSentences.push(
        `Der Kaufpreis liegt mit ${eur(Math.round(allIn))} rund ${pct(Math.abs(diffPct))} unter dem Wert, den die Wohnung nach ihrer Mietrendite eigentlich hätte (${eur(Math.round(wertNOI))}) — ein günstiger Ansatzpunkt.`
      );
    } else {
      analysisSentences.push(`Der Kaufpreis liegt nah am Wert, den die Wohnung nach ihrer Mietrendite eigentlich hätte.`);
    }
  }

  if (monthlyCF < 0) {
    analysisSentences.push(`Dementsprechend zahlst du aktuell rund ${eur(Math.round(Math.abs(monthlyCF)))} im Monat aus eigener Tasche drauf.`);
  } else if (monthlyCF < 100) {
    analysisSentences.push(`Dadurch bleibt aktuell nur ein knapper Puffer von rund ${eur(Math.round(monthlyCF))} im Monat.`);
  } else {
    analysisSentences.push(`Dadurch bleiben dir aktuell rund ${eur(Math.round(monthlyCF))} im Monat übrig.`);
  }

  if (financingOn && loan > 0) {
    const dscrLabel = !Number.isFinite(dscr) ? "" : dscr >= 1.2 ? "solide" : dscr >= 1.0 ? "knapp, aber gedeckt" : "kritisch niedrig — die Miete allein deckt die Kreditrate nicht";
    if (dscrLabel) {
      analysisSentences.push(`Bei ${pct(1 - ltvPct)} Eigenkapital liegt die Schuldendeckung (DSCR) bei ${dscr.toFixed(2)} — das ist ${dscrLabel}.`);
    }
  } else if (!financingOn) {
    analysisSentences.push("Du hast die Finanzierung ausgeblendet — die Zahlen gelten für einen Kauf ohne Kredit.");
  }

  if (monthlyCF >= 100 && dscr >= 1.2 && noiYield >= 0.05) {
    analysisSentences.push(`Insgesamt trägt sich die Wohnung bereits komfortabel bei deiner aktuellen Finanzierung.`);
  } else if (monthlyCF >= 0) {
    analysisSentences.push(`Insgesamt ist das Ergebnis knapp im Plus, aber noch nicht komfortabel — schon eine kleine Verschlechterung bei Miete oder Zins kann ins Minus kippen.`);
  } else {
    const parts: string[] = [];
    if (bePrice && bePrice < allIn) parts.push(`der Preis auf rund ${eur(Math.round(bePrice))} fällt`);
    if (beRentPerM2 && beRentPerM2 > mieteProM2Monat) parts.push(`die Miete auf mind. ${beRentPerM2.toFixed(2).replace(".", ",")} €/m² steigt`);
    if (parts.length > 0) {
      analysisSentences.push(`Diese Wohnung lohnt sich für dich, wenn ${parts.join(" oder wenn ")} — sonst bleibt der Cashflow im Minus.`);
    } else {
      analysisSentences.push(`Prüfe Kaufpreis, Miete und Finanzierung im Zusammenspiel, um ins Plus zu kommen.`);
    }
  }

  // Ehrliche Markteinordnung (Richtwert, keine echten Vergleichsdaten pro PLZ verfügbar)
  let marketComparison: string;
  if (noiYield >= 0.05) {
    marketComparison = "Deine Rendite liegt über dem für Ballungsraum-Wohnungen üblichen Richtwert von ca. 3,5–5 %.";
  } else if (noiYield >= 0.035) {
    marketComparison = "Deine Rendite bewegt sich im üblichen Richtwert-Rahmen für Ballungsraum-Wohnungen (ca. 3,5–5 %).";
  } else {
    marketComparison = "Deine Rendite liegt unter dem üblichen Richtwert von ca. 3,5–5 % für Ballungsraum-Wohnungen.";
  }

  // Volle 10-Jahres-Projektion
  const projectionFull = buildProjection10y({
    years: 10,
    effRentY1: effRentYear,
    opex0: opexYear,
    rentGrowth: mietSteigerung,
    costGrowth: kostenSteigerung,
    annuitaetJahr,
  });

  // ETF-Vergleich
  const cumulativeCF10y = projectionFull.reduce((s, y) => s + y.cf, 0);
  const etfWert10y = eigenkapital * Math.pow(1.07, 10);
  const immoWert10y = eigenkapital + cumulativeCF10y;
  const etfDelta = immoWert10y - etfWert10y;

  return {
    scoreBreakdown,
    analysisSentences,
    marketComparison,
    projectionFull,
    etf: { eigenkapital, etfWert10y, immoWert10y, etfDelta },
  };
}
