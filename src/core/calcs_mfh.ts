// src/core/calcs_mfh.ts
import { eur as eurBase, pct as pctBase } from "./calcs";

export type MFHUnit = { name: string; flaecheM2: number; mieteProM2: number };
export type MFHFinanceMode = "LTV" | "EK";

export type MFHInput = {
  kaufpreis: number;
  einheiten: MFHUnit[];
  leerstandPct: number; // 0..1
  opexUmlagefaehigPctBrutto: number;     // 0..1 (Info)
  opexNichtUmlagefaehigPctBrutto: number; // 0..1 (wirkt)
  capexReserveEuroProEinheitMonat: number;
  sonstErtraegeEuroJahr: number;
  nkPct: number;

  finance: {
    mode: MFHFinanceMode;
    ltvPct: number;
    eigenkapitalEuro: number;
    zinsPct: number;
    tilgungPct: number;
    on: boolean;
  };

  capRatePct: number; // 0..1

  pg: {
    useInValuation: boolean;
    priceAdjPct: number; // -0.3..+0.3
    rentAdjPct: number;  // -0.2..+0.4 (auf €/m²)
    vacAdjPct: number;   // -0.1..+0.2 (auf Leerstand)
  };
};

export type MFHView = {
  einheiten: MFHUnit[];
  kaufpreisEff: number;
  mieteJahrBrutto: number;
  mieteJahrEff: number;
  opexUmJahr: number;
  opexNichtUmJahr: number;
  capexReserveJahr: number;
  sonstErtraegeJahr: number;
  nkSum: number;

  darlehen: number;
  ltv: number;
  zinsJahr: number;
  tilgungJahr: number;
  annuitaetJahr: number;

  noi: number;
  noiYield: number;
  cfJahr: number;
  cfMonat: number;
  dscr: number | null;
  debtYield: number | null;
  cashOnCash: number | null;
  valueNOI: number;
  priceGap: number;

  scoreLabel: "BUY" | "CHECK" | "NO";

  breakEvenPrice: number | null;
  breakEvenRentPerM2: number;

  proj: Array<{ year: number; cf: number; tilgung: number; vermoegen: number }>;
};

export const eur = eurBase;
export const pct = pctBase;

export function calcMFH(inp: MFHInput): MFHView {
  const units = inp.einheiten.length ? inp.einheiten : [{ name: "WE 1", flaecheM2: 60, mieteProM2: 12 }];

  // Playground-Effekte
  const price = inp.kaufpreis * (1 + (inp.pg.useInValuation ? inp.pg.priceAdjPct : 0));
  const rentAdj = (r: number) => r * (1 + (inp.pg.useInValuation ? inp.pg.rentAdjPct : 0));
  const vac = Math.max(0, Math.min(0.95, inp.leerstandPct * (inp.pg.useInValuation ? (1 + inp.pg.vacAdjPct) : 1)));

  // Einnahmen
  const brutto = units.reduce((s, u) => s + u.flaecheM2 * rentAdj(u.mieteProM2) * 12, 0);
  const eff = brutto * (1 - vac);

  // Opex
  const opexUm = brutto * inp.opexUmlagefaehigPctBrutto; // Info
  const opexNichtUm = brutto * inp.opexNichtUmlagefaehigPctBrutto; // wirkt
  const capexRes = inp.capexReserveEuroProEinheitMonat * units.length * 12;

  // NK (Info)
  const nkSum = price * inp.nkPct;

  // Finanzierung
  let darlehen = 0, ltv = 0, zinsJahr = 0, tilgungJahr = 0, annu = 0, ekEinsatz = 0;
  if (inp.finance.on) {
    if (inp.finance.mode === "LTV") {
      ltv = inp.finance.ltvPct;
      darlehen = price * ltv;
      ekEinsatz = price - darlehen + nkSum;
    } else {
      ekEinsatz = Math.max(0, inp.finance.eigenkapitalEuro) + nkSum;
      const ekOhneNK = Math.max(0, ekEinsatz - nkSum);
      darlehen = Math.max(0, price - ekOhneNK);
      ltv = price > 0 ? darlehen / price : 0;
    }
    zinsJahr = darlehen * inp.finance.zinsPct;
    tilgungJahr = darlehen * inp.finance.tilgungPct;
    annu = zinsJahr + tilgungJahr;
  }

  // NOI, CF
  const noi = eff + inp.sonstErtraegeEuroJahr - opexNichtUm - capexRes;
  const noiYield = price > 0 ? noi / price : 0;
  const cfJahr = noi - annu;
  const cfMonat = cfJahr / 12;

  // Bewertung
  const cap = Math.max(0.0001, inp.capRatePct);
  const valueNOI = noi / cap;
  const priceGap = valueNOI - price;

  // Ratios
  const dscr = annu > 0 ? noi / annu : null;
  const debtYield = darlehen > 0 ? noi / darlehen : null;
  const cashOnCash = ekEinsatz > 0 ? cfJahr / ekEinsatz : null;

  // Score (einfach/robust)
  let scoreLabel: MFHView["scoreLabel"] = "CHECK";
  if ((dscr ?? 0) >= 1.25 && cfMonat > 0 && priceGap > 0) scoreLabel = "BUY";
  if ((dscr ?? 0) < 1.0 || cfMonat < 0) scoreLabel = "NO";

  // Break-even Preis (CF=0), konstante Raten
  const breakEvenPrice = ((): number | null => {
    if (!inp.finance.on || inp.finance.zinsPct + inp.finance.tilgungPct <= 0) return null;
    const rate = inp.finance.zinsPct + inp.finance.tilgungPct;
    const cfAt = (p: number) => (noi - (p * ltv) * rate) / 12;
    let lo = 0, hi = Math.max(1, price), safe = 0;
    while (cfAt(hi) > 0 && hi < price * 100 && safe < 40) { hi *= 1.5; safe++; }
    if (cfAt(hi) > 0) return Math.round(hi);
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; const cf = cfAt(mid); if (cf >= 0) lo = mid; else hi = mid; }
    return Math.round((lo + hi) / 2);
  })();

  // Break-even Ø-Miete/m²
  const totalM2 = units.reduce((s, u) => s + u.flaecheM2, 0);
  const breakEvenRentPerM2 = ((): number => {
    if (!inp.finance.on || inp.finance.zinsPct + inp.finance.tilgungPct <= 0 || totalM2 <= 0) return 0;
    const rate = inp.finance.zinsPct + inp.finance.tilgungPct;
    const ann = (price * ltv) * rate;
    // (totalM2*rent*12)*(1-vac) + sonst - (totalM2*rent*12)*opexNichtUm - capexRes = ann
    const A = totalM2 * 12 * ((1 - vac) - inp.opexNichtUmlagefaehigPctBrutto);
    const B = ann + capexRes - inp.sonstErtraegeEuroJahr;
    const rent = A > 0 ? B / A : 0;
    return Math.max(0, Math.round(rent * 100) / 100);
  })();

  // Projektion (10 Jahre, simple Wachstumsannahme)
  const proj: MFHView["proj"] = [];
  let rentY = eff + inp.sonstErtraegeEuroJahr;
  let nonUm = opexNichtUm + capexRes;
  const g = 0.015;
  for (let y = 1; y <= 10; y++) {
    const noiY = Math.max(0, rentY - nonUm);
    const cfY = noiY - annu;
    proj.push({ year: y, cf: cfY, tilgung: tilgungJahr, vermoegen: cfY + tilgungJahr });
    rentY *= 1 + g; nonUm *= 1 + g;
  }

  return {
    einheiten: units,
    kaufpreisEff: price,
    mieteJahrBrutto: brutto,
    mieteJahrEff: eff,
    opexUmJahr: opexUm,
    opexNichtUmJahr: opexNichtUm,
    capexReserveJahr: capexRes,
    sonstErtraegeJahr: inp.sonstErtraegeEuroJahr,
    nkSum,
    darlehen, ltv, zinsJahr, tilgungJahr, annuitaetJahr: annu,
    noi, noiYield, cfJahr, cfMonat,
    dscr, debtYield, cashOnCash,
    valueNOI, priceGap,
    scoreLabel,
    breakEvenPrice,
    breakEvenRentPerM2,
    proj,
  };
}

