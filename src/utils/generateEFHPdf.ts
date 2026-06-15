/**
 * Propora – Einfamilienhaus Bankgespräch-Report
 * import { generateEFHPdf } from "../utils/generateEFHPdf";
 */

import jsPDF from "jspdf";
import { PROPORA_LOGO_B64 } from "./propLogo";

// ── Typen ──────────────────────────────────────────────────────────────────
export interface EFHReportData {
  investorName?: string;
  adresse?: string;
  objektBezeichnung?: string;
  // Eingaben
  kaufpreis: number;
  KP: number;
  jahreskaltmiete: number;
  jahresmieteAdj: number;
  mietausfallPct: number;
  mietausfall: number;
  mieteEffektiv: number;
  nichtUmlagefaehigJahr: number;
  instandhaltungJahr: number;
  laufendeKostenJahr: number;
  nkGrEStPct: number;
  nkNotarPct: number;
  nkGrundbuchPct: number;
  nkMaklerPct: number;
  nkSonstPct: number;
  nkPct: number;
  nkBetrag: number;
  allIn: number;
  // Finanzierung
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  laufzeitYears: number;
  loan: number;
  annuityYear: number;
  interestY1: number;
  principalY1: number;
  // Ergebnisse
  noiJahr: number;
  noiYield: number;
  dscr: number | null;
  cashflowJahr: number;
  cashflowMonat: number;
  scorePct: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
  decisionText: string;
  // Projektion
  projection: { year: number; Cashflow: number; Tilgung: number }[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtEur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number, dec = 1) => `${(v * 100).toFixed(dec)} %`;
const fmtNum = (v: number, dec = 2) => v.toFixed(dec);

// ── Design ─────────────────────────────────────────────────────────────────
const PW = 210, PH = 297;
const ML = 14, MR = 14, HEAD = 26, FOOT = 12;
const CW = PW - ML - MR;
const TOP = HEAD + 6;

const C = {
  black:   [17, 17, 17]    as [number,number,number],
  dark:    [26, 26, 26]    as [number,number,number],
  panel:   [245, 245, 243] as [number,number,number],
  panel2:  [234, 234, 232] as [number,number,number],
  panel3:  [226, 226, 223] as [number,number,number],
  yellow:  [245, 200, 66]  as [number,number,number],
  white:   [255, 255, 255] as [number,number,number],
  border:  [216, 216, 213] as [number,number,number],
  border2: [197, 197, 194] as [number,number,number],
  green:   [26, 102, 41]   as [number,number,number],
  greenLt: [226, 240, 229] as [number,number,number],
  amber:   [143, 77, 0]    as [number,number,number],
  amberLt: [254, 240, 204] as [number,number,number],
  red:     [170, 28, 28]   as [number,number,number],
  redLt:   [253, 236, 236] as [number,number,number],
  muted:   [119, 119, 114] as [number,number,number],
  light:   [170, 170, 170] as [number,number,number],
};

class R {
  doc: jsPDF;
  private investor: string;

  constructor(investor: string) {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
    this.investor = investor;
  }

  rect(x: number, y: number, w: number, h: number, fill: [number,number,number], r = 0) {
    this.doc.setFillColor(...fill);
    r > 0 ? this.doc.roundedRect(x, y, w, h, r, r, "F") : this.doc.rect(x, y, w, h, "F");
  }

  txt(t: string, x: number, y: number, opts: {
    size?: number; bold?: boolean; color?: [number,number,number];
    align?: "left"|"right"|"center"; maxW?: number;
  } = {}) {
    const { size = 9, bold = false, color = C.black, align = "left", maxW } = opts;
    this.doc.setFontSize(size);
    this.doc.setFont("helvetica", bold ? "bold" : "normal");
    this.doc.setTextColor(...color);
    maxW ? this.doc.text(t, x, y, { align, maxWidth: maxW })
         : this.doc.text(t, x, y, { align });
  }

  line(x1: number, y1: number, x2: number, y2: number,
    color: [number,number,number] = C.border, lw = 0.3) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(lw);
    this.doc.line(x1, y1, x2, y2);
  }

  header(title: string, subtitle: string) {
    this.rect(0, 0, PW, HEAD, C.dark);
    this.rect(0, HEAD - 1.5, PW, 1.5, C.yellow);
    try { this.doc.addImage(PROPORA_LOGO_B64, "PNG", ML, 5, 26, 8); }
    catch { this.txt("PROPORA", ML, 11, { size: 10, bold: true, color: C.yellow }); }
    this.txt("Investitionsanalyse", ML + 30, 11, { size: 8, color: C.light });
    this.txt(title, ML, 19, { size: 11, bold: true, color: C.white });
    this.txt(subtitle, ML, 24, { size: 7.5, color: [150, 150, 150] as any });
    this.txt(this.investor, PW - MR, 11, { size: 8, color: C.light, align: "right" });
    this.txt(new Date().toLocaleDateString("de-DE"), PW - MR, 19,
      { size: 8, color: C.light, align: "right" });
  }

  footer(pageNum: number, total: number) {
    this.line(ML, PH - FOOT + 1, PW - MR, PH - FOOT + 1);
    this.txt("PROPORA PRO  ·  Vertraulich – ausschließlich für den adressierten Kreditgeber",
      ML, PH - FOOT + 5, { size: 7, color: C.light });
    this.txt(`Seite ${pageNum} von ${total}`, PW - MR, PH - FOOT + 5,
      { size: 7, color: C.light, align: "right" });
    this.doc.setFillColor(...C.yellow);
    this.doc.circle(PW - MR - 22, PH - FOOT + 4.5, 1.2, "F");
  }

  kpi(x: number, y: number, w: number, h: number, label: string, value: string, sub: string,
    mode: "dark"|"light" = "light", valColor?: [number,number,number]) {
    const bg = mode === "dark" ? C.dark : C.panel;
    const lc: [number,number,number] = mode === "dark" ? C.light : C.muted;
    const vc: [number,number,number] = valColor || (mode === "dark" ? C.yellow : C.black);
    this.rect(x, y, w, h, bg, 3);
    this.rect(x, y, w, 2, C.yellow, 2);
    this.txt(label.toUpperCase(), x + 4, y + 7, { size: 6.5, color: lc });
    this.txt(value, x + 4, y + 17, { size: 15, bold: true, color: vc });
    this.txt(sub, x + 4, y + h - 3, { size: 7, color: lc });
  }

  div(y: number, label: string): number {
    this.rect(ML, y, CW, 8, C.dark, 2);
    this.rect(ML, y, 2.5, 8, C.yellow);
    this.txt(label.toUpperCase(), ML + 6, y + 5.5, { size: 7, bold: true, color: C.yellow });
    return y + 11;
  }

  panel(x: number, y: number, w: number, title: string,
    rows: [string, string, "n"|"g"|"a"|"r"][]): number {
    const rowH = 7;
    const h = rowH * rows.length + 10;
    this.rect(x, y, w, h, C.panel, 3);
    this.rect(x, y, w, 9, C.panel2, 3);
    this.line(x, y + 9, x + w, y + 9, C.border);
    this.txt(title.toUpperCase(), x + 4, y + 6, { size: 6.5, bold: true, color: C.muted });
    rows.forEach(([lbl, val, sty], i) => {
      const ry = y + 9 + i * rowH;
      if (i > 0) this.line(x, ry, x + w, ry, C.border, 0.2);
      this.txt(lbl, x + 4, ry + 5, { size: 8, color: C.muted });
      const vc = sty === "g" ? C.green : sty === "a" ? C.amber : sty === "r" ? C.red : C.black;
      this.txt(val, x + w - 4, ry + 5, { size: 8, bold: true, color: vc, align: "right" });
    });
    return y + h + 4;
  }

  table(y: number, headers: string[], rows: string[][], cws: number[],
    aligns: ("l"|"r")[] = [], opts: { sumRow?: boolean } = {}): number {
    const rowH = 7, headH = 8;
    let x = ML;
    this.rect(ML, y, CW, headH, C.dark, 2);
    headers.forEach((h, i) => {
      const al = aligns[i] === "r" ? "right" : "left";
      const cx = al === "right" ? x + cws[i] - 3 : x + 3;
      this.txt(h, cx, y + 5.5, { size: 7.5, bold: true, color: C.white, align: al });
      x += cws[i];
    });
    rows.forEach((row, ri) => {
      const ry = y + headH + ri * rowH;
      const isSum = opts.sumRow && ri === rows.length - 1;
      this.rect(ML, ry, CW, rowH, isSum ? C.panel3 : ri % 2 === 0 ? C.panel : C.white);
      this.line(ML, ry, ML + CW, ry, C.border, isSum ? 0.6 : 0.2);
      let rx = ML;
      row.forEach((cell, ci) => {
        const al = aligns[ci] === "r" ? "right" : "left";
        const cx = al === "right" ? rx + cws[ci] - 3 : rx + 3;
        this.txt(cell, cx, ry + 4.8, { size: 8, align: al, bold: isSum });
        rx += cws[ci];
      });
    });
    this.doc.setDrawColor(...C.border2);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(ML, y, CW, headH + rows.length * rowH, 2, 2, "S");
    return y + headH + rows.length * rowH + 4;
  }

  fazit(y: number, lines: [string, boolean][]): number {
    const h = lines.length * 5.5 + 8;
    this.doc.setFillColor(255, 251, 220);
    this.doc.roundedRect(ML, y, CW, h, 2, 2, "F");
    this.rect(ML, y, 2.5, h, C.yellow);
    this.doc.setDrawColor(232, 208, 96);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(ML, y, CW, h, 2, 2, "S");
    let ty = y + 7;
    lines.forEach(([txt, bold]) => {
      this.txt(txt, ML + 6, ty, { size: 8, bold, color: [58, 48, 0] as any });
      ty += 5.5;
    });
    return y + h + 4;
  }
}

// ── Seiten ──────────────────────────────────────────────────────────────────
function page1(r: R, d: EFHReportData) {
  let y = TOP;
  const objName = d.adresse || d.objektBezeichnung ||
    `Einfamilienhaus – ${fmtEur(d.kaufpreis)}`;
  r.header("Investitionsübersicht", objName);

  const kw = (CW - 15) / 4;
  const decColor: [number,number,number] =
    d.scoreLabel === "BUY" ? C.green :
    d.scoreLabel === "CHECK" ? C.amber : C.red;
  const decDE = d.scoreLabel === "BUY" ? "Kaufen" :
    d.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein";

  r.kpi(ML,           y, kw, 22, "Kaufpreis",      fmtEur(d.KP),              `NK: ${fmtEur(d.nkBetrag)}`, "dark");
  r.kpi(ML+kw+5,      y, kw, 22, "NOI-Rendite",    fmtPct(d.noiYield),        `NOI: ${fmtEur(d.noiJahr)}`, "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "DSCR",           d.dscr != null ? fmtNum(d.dscr) : "n/a", "Mindest: 1,20", "light",
    d.dscr != null ? (d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red) : C.muted);
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Cashflow/Monat", fmtEur(d.cashflowMonat),  decDE, "light", decColor);
  y += 26;

  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 5;

  const bw = (CW - 6) / 2;
  const objRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Kaufpreis",           fmtEur(d.KP),                        "n"],
    ["Nebenkosten",         `${fmtEur(d.nkBetrag)} (${fmtPct(d.nkPct, 1)})`, "n"],
    ["All-in",              fmtEur(d.allIn),                     "n"],
    ["Jahreskaltmiete",     fmtEur(d.jahreskaltmiete),           "n"],
    ["Mietausfallwagnis",   fmtPct(d.mietausfallPct, 1),          "n"],
    ["Effektivmiete p.a.",  fmtEur(d.mieteEffektiv),             "n"],
    ["Lfd. Kosten/Jahr",    fmtEur(d.laufendeKostenJahr),        "n"],
    ["NOI p.a.",            fmtEur(d.noiJahr),                   d.noiJahr > 0 ? "g" : "r"],
  ];
  const finRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Eigenkapital",        fmtEur(d.KP * (1 - d.ltvPct)),       "n"],
    ["Darlehen",            fmtEur(d.loan),                      "n"],
    ["LTV",                 fmtPct(d.ltvPct, 0),                  d.ltvPct > 0.85 ? "a" : "n"],
    ["Zinssatz",            fmtPct(d.zinsPct),                   "n"],
    ["Laufzeit",            `${d.laufzeitYears} Jahre`,          "n"],
    ["Annuität/Mo",         fmtEur(d.annuityYear / 12),          "n"],
    ["Zinslast Y1/Mo",      fmtEur(d.interestY1 / 12),           "n"],
    ["Tilgung Y1/Mo",       fmtEur(d.principalY1 / 12),         "n"],
  ];
  const pe = r.panel(ML,       y, bw, "Objekt",        objRows);
  const pf = r.panel(ML+bw+6,  y, bw, "Finanzierung",  finRows);
  y = Math.max(pe, pf) + 2;

  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 4;
  r.txt("Investitions-Kennzahlen".toUpperCase(), ML, y,
    { size: 6.5, bold: true, color: C.muted }); y += 5;

  const kennRows = [
    ["Kaufpreisfaktor",  `${(d.KP / d.jahreskaltmiete).toFixed(1)}×`,  "Bruttomietrendite",   fmtPct(d.jahreskaltmiete / d.KP)],
    ["NOI-Rendite",      fmtPct(d.noiYield),                            "NOI p.a.",            fmtEur(d.noiJahr)],
    ["DSCR",             d.dscr != null ? fmtNum(d.dscr) : "–",        "Annuität p.a.",       fmtEur(d.annuityYear)],
    ["Cashflow/Monat",   fmtEur(d.cashflowMonat),                       "Entscheidung",        decDE],
  ];
  kennRows.forEach((row, i) => {
    const ry = y + i * 7;
    r.rect(ML, ry, CW, 7, i % 2 === 0 ? C.panel : C.white);
    r.txt(row[0], ML + 3, ry + 4.8, { size: 8, color: C.muted });
    r.txt(row[1], ML + 60, ry + 4.8, { size: 8, bold: true, color: C.black, align: "right" });
    r.txt(row[2], ML + 65, ry + 4.8, { size: 8, color: C.muted });
    r.txt(row[3], ML + CW - 3, ry + 4.8, { size: 8, bold: true, color: C.black, align: "right" });
  });
  y += kennRows.length * 7 + 4;

  const fazit1: [string, boolean][] = d.scoreLabel === "BUY" ? [
    ["Gesamtbewertung: Kaufen (unter Vorbehalt)", true],
    [`NOI-Rendite ${fmtPct(d.noiYield)} · DSCR ${d.dscr != null ? fmtNum(d.dscr) : "–"} · Cashflow ${fmtEur(d.cashflowMonat)}/Mo`, false],
    ["Miete, laufende Kosten und Finanzierung ergeben ein solides Chance-Risiko-Profil.", false],
  ] : d.scoreLabel === "CHECK" ? [
    ["Gesamtbewertung: Weiter prüfen", true],
    [`Cashflow ${fmtEur(d.cashflowMonat)}/Mo im Mittelfeld – mehrere Szenarien durchspielen.`, false],
    ["Kaufpreis oder Konditionen nachverhandeln empfohlen.", false],
  ] : [
    ["Gesamtbewertung: Eher Nein", true],
    [`Cashflow ${fmtEur(d.cashflowMonat)}/Mo – das EFH trägt sich unter aktuellen Annahmen kaum.`, false],
    ["Hart verhandeln oder Alternativen prüfen (Miete, Instandhaltung, Tilgung).", false],
  ];
  r.fazit(y, fazit1);
}

function page2(r: R, d: EFHReportData) {
  let y = TOP;
  r.header("Cashflow-Analyse", "Monatliche Ertragsrechnung");

  const kw = (CW - 15) / 4;
  r.kpi(ML,           y, kw, 22, "Kaltmiete/Mo",   fmtEur(d.jahreskaltmiete/12),  "Bruttomiete", "light");
  r.kpi(ML+kw+5,      y, kw, 22, "Lfd. Kosten/Mo", fmtEur(d.laufendeKostenJahr/12),"inkl. Instandh.", "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "NOI/Monat",      fmtEur(d.noiJahr/12),          "nach Kosten", "light");
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Cashflow/Monat", fmtEur(d.cashflowMonat),       "nach Kapitaldienst", "dark",
    d.cashflowMonat >= 0 ? C.green : C.red);
  y += 26;

  y = r.div(y, "Cashflow-Aufschlüsselung (monatlich)");

  const cfRows = [
    ["Kaltmiete",              fmtEur(d.jahreskaltmiete/12),     "100,0 %",  "Bruttomieteinnahmen"],
    ["– Mietausfallwagnis",    fmtEur(-d.mietausfall/12),        fmtPct(d.mietausfallPct, 1), "Risikopuffer"],
    ["– Nicht-uml. Kosten",    fmtEur(-d.nichtUmlagefaehigJahr/12), "",      "Verwaltung, Nebenkosten"],
    ["– Instandhaltung",       fmtEur(-d.instandhaltungJahr/12), "",         "Reparaturen, Modernisierung"],
    ["= NOI",                  fmtEur(d.noiJahr/12),             fmtPct(d.noiJahr/d.jahreskaltmiete, 0), "Nettoertrag vor Finanzierung"],
    ["– Zinsen",               fmtEur(-d.interestY1/12),         "",         fmtPct(d.zinsPct)+" p.a."],
    ["– Tilgung",              fmtEur(-d.principalY1/12),        "",         "Jahr 1"],
    ["= Cashflow",             fmtEur(d.cashflowMonat),          "",         "monatlicher Überschuss"],
    ["= Cashflow (jährl.)",    fmtEur(d.cashflowJahr),           "",         "Jahresperspektive"],
  ];
  y = r.table(y,
    ["Position", "Betrag/Mo", "Anteil", "Anmerkung"],
    cfRows, [CW*0.28, CW*0.15, CW*0.10, CW*0.47],
    ["l","r","r","l"]);

  if (d.dscr != null) {
    y = r.div(y, "DSCR – Schuldendeckungsquote");
    r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);
    const bw2 = CW * 0.62;
    r.rect(ML + 40, y + 2, bw2, 5, C.panel2, 2);
    const p = Math.min(Math.max((d.dscr - 1.0) / 1.0, 0), 1);
    r.rect(ML + 40, y + 2, Math.max(6, bw2 * p), 5,
      d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red, 2);
    const marks: [number, string][] = [[0,"1,0"],[0.2,"1,2"],[0.5,"1,5"],[1.0,"2,0"]];
    marks.forEach(([mp, lbl]) =>
      r.txt(lbl, ML + 40 + bw2*mp, y + 11, { size: 6, color: C.muted, align: "center" }));
    const bdgBg = d.dscr >= 1.2 ? C.greenLt : d.dscr >= 1.0 ? C.amberLt : C.redLt;
    const bdgFc = d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red;
    r.rect(ML + 144, y + 2, 33, 9, bdgBg, 2);
    r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",
      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: "center" });
    y += 22;
  }

  r.fazit(y, [
    ["Cashflow-Analyse", true],
    [`NOI ${fmtEur(d.noiJahr/12)}/Mo – nach Kapitaldienst ${fmtEur(d.annuityYear/12)}/Mo verbleibt ${fmtEur(d.cashflowMonat)}/Mo.`, false],
    [`Instandhaltung ${fmtEur(d.instandhaltungJahr/12)}/Mo – bei älteren EFH konservativ ansetzen empfohlen.`, false],
    ["Mietausfallwagnis deckt Leerstand und Mietausfall ab – wichtiger Puffer im Einzelobjekt.", false],
  ]);
}

function page3(r: R, d: EFHReportData) {
  let y = TOP;
  r.header("Stresstest & 10J-Projektion", "Risikoanalyse");

  y = r.div(y, "Stresstest – Sensitivitätsanalyse");

  const bw = (CW - 6) / 2;

  // Szenarien berechnen
  const calcCF = (rentMult: number, costAdd: number, zinsAdd: number) => {
    const miete = d.mieteEffektiv * rentMult;
    const kosten = d.laufendeKostenJahr + costAdd;
    const noi = miete - kosten;
    const ann = d.financingOn ? d.loan * (d.zinsPct + zinsAdd + (d.annuityYear/d.loan - d.zinsPct)) : 0;
    return (noi - ann) / 12;
  };

  const stressRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Basis (aktuell)",          fmtEur(d.cashflowMonat),         d.cashflowMonat >= 0 ? "g" : "r"],
    ["–10% Miete",               fmtEur(calcCF(0.9, 0, 0)),       calcCF(0.9, 0, 0) >= 0 ? "g" : "r"],
    ["–20% Miete",               fmtEur(calcCF(0.8, 0, 0)),       calcCF(0.8, 0, 0) >= 0 ? "g" : "r"],
    ["+2% Zinsen",               fmtEur(calcCF(1.0, 0, 0.02)),    calcCF(1.0, 0, 0.02) >= 0 ? "g" : "r"],
    ["+3.000 € Kosten/Jahr",     fmtEur(calcCF(1.0, 3000, 0)),    calcCF(1.0, 3000, 0) >= 0 ? "g" : "r"],
    ["Worst-case (–15%, +2%)",   fmtEur(calcCF(0.85, 2000, 0.02)),calcCF(0.85, 2000, 0.02) >= 0 ? "g" : "r"],
  ];
  const riskRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["LTV",                  fmtPct(d.ltvPct, 0),                  d.ltvPct > 0.85 ? "a" : "n"],
    ["DSCR",                 d.dscr != null ? fmtNum(d.dscr) : "–", d.dscr != null && d.dscr >= 1.2 ? "g" : d.dscr != null && d.dscr >= 1.0 ? "a" : "r"],
    ["NOI-Rendite",          fmtPct(d.noiYield),                   d.noiYield >= 0.04 ? "g" : "a"],
    ["Bruttomietrendite",    fmtPct(d.jahreskaltmiete / d.KP),     "n"],
    ["Zinsbindungsrisiko",   "Bei Prolongation beachten",           "a"],
    ["Entscheidung",         d.scoreLabel === "BUY" ? "Kaufen" : d.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein",
                                                                    d.scoreLabel === "BUY" ? "g" : d.scoreLabel === "CHECK" ? "a" : "r"],
  ];
  r.panel(ML,       y, bw, "Cashflow-Stressszenarien", stressRows);
  r.panel(ML+bw+6,  y, bw, "Risikobewertung",          riskRows);
  y += Math.max(stressRows.length * 7 + 14, riskRows.length * 7 + 14) + 6;

  y = r.div(y, "10-Jahres-Cashflow-Projektion (2% Miet-, 2% Kostensteigerung)");

  const projRows = d.projection.map(p => [
    `Jahr ${p.year}`,
    fmtEur(p.Cashflow / 12),
    fmtEur(p.Cashflow),
    fmtEur(p.Tilgung),
  ]);
  y = r.table(y,
    ["Jahr", "CF/Monat", "CF p.a.", "Tilgung p.a."],
    projRows,
    [CW*0.15, CW*0.28, CW*0.28, CW*0.29],
    ["l","r","r","r"]);

  r.fazit(y, [
    ["Stresstest & Projektion", true],
    [`Selbst bei –10% Miete: Cashflow ${fmtEur(calcCF(0.9, 0, 0))}/Mo – ${calcCF(0.9, 0, 0) >= 0 ? "positiv" : "negativ"}.`, false],
    ["Prolongationsrisiko bei Zinssteigerung: +2% Zins würde Cashflow spürbar belasten.", false],
    ["Projektion zeigt Cashflow-Entwicklung bei moderater Miet- und Kostensteigerung p.a.", false],
  ]);
}

// ── Hauptfunktion ────────────────────────────────────────────────────────────
export function generateEFHPdf(data: EFHReportData): void {
  const investor = data.investorName || "Propora-Nutzer";
  const TOTAL = 3;
  const r = new R(investor);

  [page1, page2, page3].forEach((fn, i) => {
    if (i > 0) r.doc.addPage();
    fn(r, data);
  });

  const n = r.doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    r.doc.setPage(i);
    r.footer(i, TOTAL);
  }

  const today = new Date().toISOString().slice(0, 10);
  r.doc.save(`propora_efh_${today}.pdf`);
}
