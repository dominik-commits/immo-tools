// Zentrale, einfache Rechenlogik – von allen Quick-Checks nutzbar.

export type WohnInput = {
  kaufpreis: number;          // €
  flaecheM2: number;          // m²
  mieteProM2Monat: number;    // €/m²/Monat
  leerstandPct: number;       // 0..1
  opexPctBrutto: number;      // 0..1 (vereinfachte nicht-uml.-Kosten)
  nkPct: number;              // 0..1 (pauschale Kaufnebenkosten)
  // Finanzierung (optional)
  financingOn: boolean;
  ltvPct: number;             // 0..1
  zinsPct: number;            // 0..1 p.a.
  tilgungPct: number;         // 0..1 p.a.
  // Bewertung (optional)
  capRateAssumed: number;     // 0..1 (für Wert vs. Preis)
};

export type WohnOutput = {
  bruttoJahresmiete: number;
  effMiete: number;
  opex: number;
  noi: number;                      // vor Reserven/Steuern
  wertAusCap: number;
  nkBetrag: number;
  allIn: number;
  loan: number;
  schuldienst: number;
  dscr: number | null;
  cashflowJahr1: number;
  cashflowMonat: number;
  noiYield: number;                 // NOI / Kaufpreis
  score: number;                    // 0..1
  scoreLabel: "BUY" | "CHECK" | "NO";
};

export function round(n: number, digits = 2) {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
export function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
export function pct(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 }).format(n);
}

export function calcWohn(input: WohnInput): WohnOutput {
  const {
    kaufpreis, flaecheM2, mieteProM2Monat, leerstandPct, opexPctBrutto, nkPct,
    financingOn, ltvPct, zinsPct, tilgungPct, capRateAssumed
  } = input;

  const bruttoJahresmiete = flaecheM2 * mieteProM2Monat * 12;
  const effMiete = bruttoJahresmiete * (1 - leerstandPct);
  const opex = bruttoJahresmiete * opexPctBrutto;
  const noi = Math.max(0, effMiete - opex);

  const wertAusCap = noi / Math.max(0.0001, capRateAssumed);

  const nkBetrag = kaufpreis * nkPct;
  const allIn = kaufpreis + nkBetrag;

  const loan = financingOn ? kaufpreis * ltvPct : 0;
  const schuldienst = financingOn ? loan * (zinsPct + tilgungPct) : 0;
  const dscr = financingOn ? (schuldienst > 0 ? noi / schuldienst : null) : null;

  // Cashflow sehr vereinfacht (ohne Steuern/Reserven): NOI - Schuldienst
  const cashflowJahr1 = noi - schuldienst;
  const cashflowMonat = cashflowJahr1 / 12;

  const noiYield = kaufpreis > 0 ? noi / kaufpreis : 0;

  // Heuristik-Score (einfach, einsteigerfreundlich)
  const dscrScore = financingOn ? clamp(scale(dscr ?? 0, 1.1, 1.5), 0, 1) : 0.6;
  const noiScore  = clamp(scale(noiYield, 0.04, 0.08), 0, 1);
  const vacScore  = clamp(scale(0.15 - leerstandPct, 0, 0.15), 0, 1);
  const cfScore   = clamp(scale(cashflowMonat, 0, 300), 0, 1); // 0..300 €/Monat
  const score = 0.35*noiScore + 0.25*dscrScore + 0.25*cfScore + 0.15*vacScore;

  const scoreLabel: WohnOutput["scoreLabel"] =
    score >= 0.70 ? "BUY" : score >= 0.50 ? "CHECK" : "NO";

  return {
    bruttoJahresmiete, effMiete, opex, noi, wertAusCap,
    nkBetrag, allIn, loan, schuldienst, dscr: dscr ?? null,
    cashflowJahr1, cashflowMonat, noiYield, score, scoreLabel
  };
}

function scale(x: number, min: number, max: number) {
  if (max === min) return 0;
  return (x - min) / (max - min);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

