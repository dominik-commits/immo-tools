/**
 * Propora – Gewerbe-Rendite Bankgespräch-Report
 * Erzeugt ein mehrseitiges PDF direkt im Browser via jsPDF
 * import { generateGewerbePdf } from "../utils/generateGewerbePdf";
 */

import jsPDF from "jspdf";
import { PROPORA_LOGO_B64 } from "./propLogo";

// ── Typen ──────────────────────────────────────────────────────────────────
export interface GewerbeZone {
  id: string;
  name: string;
  areaM2: number;
  rentPerM2: number;
  vacancyPct: number;
  recoverablePct: number;
  freeRentMonthsY1: number;
  tiPerM2: number;
  leaseTermYears: number;
}

export interface GewerbeReportData {
  // Meta
  investorName?: string;
  adresse?: string;
  objektBezeichnung?: string;
  // Objekt
  kaufpreis: number;
  zonen: GewerbeZone[];
  opexTotalPctBrutto: number;
  capexRuecklagePctBrutto: number;
  capRateAssumed: number;
  capEff: number;
  bonitaetTop3: "A" | "B" | "C";
  indexiert: boolean;
  avgWALT: number;
  // Nebenkosten
  nkGrEStPct: number;
  nkNotarPct: number;
  nkGrundbuchPct: number;
  nkMaklerPct: number;
  nkSonstPct: number;
  nkPct: number;
  nkBetrag: number;
  // Finanzierung
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  laufzeitYears: number;
  loan: number;
  annuityYear: number;
  interestY1: number;
  principalY1: number;
  // Berechnete Werte
  KP: number;
  grossRentYearY1: number;
  effRentYearY1: number;
  tiUpfront: number;
  totalOpexY1: number;
  recoveredY1: number;
  landlordOpexY1: number;
  capexY1: number;
  noiY1: number;
  noiYield: number;
  dscr: number | null;
  cashflowMonatY1: number;
  wertAusCap: number;
  valueGap: number;
  valueGapPct: number;
  scorePct: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
  projection: { year: number; cashflowPA: number; tilgungPA: number }[];
  tilgungsplan: {
    rows: { year: number; interest: number; principal: number; annuity: number; outstanding: number }[];
    sum10: { interest: number; principal: number; annuity: number };
  };
}

// ── Format-Helfer ───────────────────────────────────────────────────────────
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

// ── Zeichenklasse ───────────────────────────────────────────────────────────
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
    this.txt(label.toUpperCase(), ML + 6, y + 5.5,
      { size: 7, bold: true, color: C.yellow });
    return y + 11;
  }

  panel(x: number, y: number, w: number, title: string,
    rows: [string, string, "n"|"g"|"a"|"r"][]): number {
    const rowH = 7;
    const h = rowH * rows.length + 10;
    this.rect(x, y, w, h, C.panel, 3);
    this.rect(x, y, w, 9, C.panel2, 3);
    this.line(x, y + 9, x + w, y + 9, C.border);
    this.txt(title.toUpperCase(), x + 4, y + 6,
      { size: 6.5, bold: true, color: C.muted });
    rows.forEach(([lbl, val, sty], i) => {
      const ry = y + 9 + i * rowH;
      if (i > 0) this.line(x, ry, x + w, ry, C.border, 0.2);
      this.txt(lbl, x + 4, ry + 5, { size: 8, color: C.muted });
      const vc = sty === "g" ? C.green : sty === "a" ? C.amber : sty === "r" ? C.red : C.black;
      this.txt(val, x + w - 4, ry + 5,
        { size: 8, bold: true, color: vc, align: "right" });
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
      this.rect(ML, ry, CW, rowH,
        isSum ? C.panel3 : ri % 2 === 0 ? C.panel : C.white);
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

  dscrBar(y: number, value: number): number {
    const bh = 5, by = y + 4;
    this.rect(ML, by, CW, bh, C.panel2, 2);
    const p = Math.min(Math.max((value - 1.0) / 1.0, 0), 1);
    const fw = Math.max(8, CW * p);
    const fc = value >= 1.2 ? C.green : value >= 1.0 ? C.amber : C.red;
    this.rect(ML, by, fw, bh, fc, 2);
    const marks: [number, string][] = [[0,"1,0"],[0.2,"1,2"],[0.5,"1,5"],[1.0,"2,0"]];
    marks.forEach(([mp, lbl]) =>
      this.txt(lbl, ML + CW * mp, by + bh + 4,
        { size: 6, color: C.muted, align: "center" }));
    return y + 18;
  }

  matrix(y: number, d: GewerbeReportData): number {
    const zins_vals = [0.02, 0.035, d.zinsPct, 0.05, 0.065];
    const zins_lbls = ["2,0 %", "3,5 %", `Basis ${fmtPct(d.zinsPct)}`, "5,0 %", "6,5 %"];
    const mult_vals = [0.85, 0.92, 1.0, 1.08, 1.15];
    const mult_lbls = ["–15 %", "–8 %", "Basis", "+8 %", "+15 %"];

    const calc = (z: number, mm: number) => {
      const gross = d.grossRentYearY1 * mm;
      const eff = gross * (1 - d.zonen.reduce((s, zo) => s + zo.vacancyPct * zo.areaM2, 0) /
        Math.max(1, d.zonen.reduce((s, zo) => s + zo.areaM2, 0)));
      const opex = gross * d.opexTotalPctBrutto;
      const recovered = gross * d.zonen.reduce((s, zo) => s + zo.recoverablePct * zo.areaM2, 0) /
        Math.max(1, d.zonen.reduce((s, zo) => s + zo.areaM2, 0)) * d.opexTotalPctBrutto;
      const capex = gross * d.capexRuecklagePctBrutto;
      const noi = Math.max(0, eff - Math.max(0, opex - recovered) - capex);
      const ann = d.financingOn && d.loan > 0 ? d.annuityYear : 0;
      return ann > 0 ? noi / ann : 99;
    };

    const colW = CW / 6;
    const rowH = 8;
    this.rect(ML, y, CW, rowH, C.dark, 2);
    this.txt("Zins / Miete", ML + 3, y + 5.5,
      { size: 7.5, bold: true, color: C.white });
    mult_lbls.forEach((lbl, mi) =>
      this.txt(lbl, ML + colW * (1.5 + mi), y + 5.5,
        { size: 7.5, bold: true, color: C.white, align: "center" }));

    zins_vals.forEach((z, zi) => {
      const ry = y + rowH + zi * rowH;
      const isBase = Math.abs(z - d.zinsPct) < 0.001;
      this.rect(ML, ry, CW, rowH,
        isBase ? C.panel2 : zi % 2 === 0 ? C.panel : C.white);
      this.line(ML, ry, ML + CW, ry, C.border, 0.2);
      this.txt(zins_lbls[zi], ML + 3, ry + 5.5,
        { size: 7.5, bold: isBase, color: C.black });
      mult_vals.forEach((mm, mi) => {
        const v = calc(z, mm);
        const cx = ML + colW * (1.5 + mi);
        const isBase2 = isBase && Math.abs(mm - 1.0) < 0.001;
        if (isBase2) this.rect(cx - colW / 2, ry, colW, rowH, C.yellow);
        const fc = v >= 1.2 ? C.green : v >= 1.0 ? C.amber : C.red;
        this.txt(v < 99 ? v.toFixed(2) : "–", cx, ry + 5.5,
          { size: 8, bold: true, color: isBase2 ? C.black : fc, align: "center" });
      });
    });

    this.doc.setDrawColor(...C.border2);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(ML, y, CW, rowH * (1 + zins_vals.length), 2, 2, "S");
    return y + rowH * (1 + zins_vals.length) + 4;
  }
}

// ── Seiten ──────────────────────────────────────────────────────────────────
function page1(r: R, d: GewerbeReportData) {
  let y = TOP;
  const objName = d.adresse || d.objektBezeichnung ||
    `Gewerbeimmobilie ${d.zonen.reduce((s, z) => s + z.areaM2, 0)} m²`;
  r.header("Investitionsübersicht", objName);

  const kw = (CW - 15) / 4;
  const decColor: [number,number,number] =
    d.scoreLabel === "BUY" ? C.green :
    d.scoreLabel === "CHECK" ? C.amber : C.red;
  const decDE = d.scoreLabel === "BUY" ? "Kaufen" :
    d.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein";

  r.kpi(ML,             y, kw, 22, "Kaufpreis",      fmtEur(d.kaufpreis),        `NK: ${fmtEur(d.nkBetrag)}`, "dark");
  r.kpi(ML+kw+5,        y, kw, 22, "NOI-Rendite",    fmtPct(d.noiYield),         `Cap Rate: ${fmtPct(d.capRateAssumed)}`, "light");
  r.kpi(ML+2*(kw+5),    y, kw, 22, "DSCR",           d.dscr != null ? fmtNum(d.dscr) : "n/a", "Mindest: 1,20", "light",
    d.dscr != null ? (d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red) : C.muted);
  r.kpi(ML+3*(kw+5),    y, kw, 22, "Cashflow/Mo Y1", fmtEur(d.cashflowMonatY1), decDE, "light", decColor);
  y += 26;

  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 5;

  const bw = (CW - 6) / 2;
  const totalArea = d.zonen.reduce((s, z) => s + z.areaM2, 0);
  const avgRent = totalArea > 0 ? d.grossRentYearY1 / (totalArea * 12) : 0;
  const avgVac = totalArea > 0
    ? d.zonen.reduce((s, z) => s + z.vacancyPct * z.areaM2, 0) / totalArea : 0;
  const avgWALT = d.avgWALT;

  const objRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Gesamtfläche",    `${totalArea} m²`,                    "n"],
    ["Zonen",           `${d.zonen.length} Zonen`,            "n"],
    ["Ø Miete/m²",     `${avgRent.toFixed(2)} €/m²`,         "n"],
    ["Kaltmiete p.a.",  fmtEur(d.grossRentYearY1),            "n"],
    ["Ø Leerstand",    fmtPct(avgVac, 1),                     avgVac < 0.05 ? "g" : "a"],
    ["WALT",            `${avgWALT.toFixed(1)} Jahre`,        avgWALT >= 5 ? "g" : "a"],
  ];
  const finRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Eigenkapital",   fmtEur(d.KP * (1 - d.ltvPct)),        "n"],
    ["Darlehen",       fmtEur(d.loan),                        "n"],
    ["LTV",            fmtPct(d.ltvPct, 0),                   d.ltvPct > 0.65 ? "a" : "n"],
    ["Zinssatz",       fmtPct(d.zinsPct),                     "n"],
    ["Laufzeit",       `${d.laufzeitYears} Jahre`,            "n"],
    ["Annuität/Mo",    fmtEur(d.annuityYear / 12),            "n"],
  ];
  const pe = r.panel(ML,       y, bw, "Objekt",       objRows);
  const pf = r.panel(ML+bw+6,  y, bw, "Finanzierung", finRows);
  y = Math.max(pe, pf) + 2;

  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 4;
  r.txt("Investitions-Kennzahlen im Überblick".toUpperCase(), ML, y,
    { size: 6.5, bold: true, color: C.muted }); y += 5;

  const kennRows = [
    ["Kaufpreisfaktor",   `${(d.KP/d.grossRentYearY1).toFixed(1)}×`, "NOI p.a. (Y1)",    fmtEur(d.noiY1)],
    ["NOI-Rendite",       fmtPct(d.noiYield),                        "Wert aus Cap",      fmtEur(d.wertAusCap)],
    ["DSCR",              d.dscr != null ? fmtNum(d.dscr) : "–",    "Wert-Gap",          `${d.valueGap >= 0 ? "+" : ""}${fmtEur(d.valueGap)}`],
    ["Bonitäts-Score",    `Klasse ${d.bonitaetTop3}`,               "WALT Ø",            `${avgWALT.toFixed(1)} J.`],
    ["Cashflow/Mo Y1",    fmtEur(d.cashflowMonatY1),                "Entscheidung",      decDE],
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
    ["Gesamtbewertung: Kaufen", true],
    [`NOI-Rendite ${fmtPct(d.noiYield)} · DSCR ${d.dscr != null ? fmtNum(d.dscr) : "–"} · Cashflow ${fmtEur(d.cashflowMonatY1)}/Mo`, false],
    [`Modellwert (NOI/Cap_eff): ${fmtEur(d.wertAusCap)} · ${d.valueGap >= 0 ? "Über" : "Unter"} Kaufpreis um ${fmtEur(Math.abs(d.valueGap))}.`, false],
  ] : d.scoreLabel === "CHECK" ? [
    ["Gesamtbewertung: Weiter prüfen", true],
    [`Cashflow ${fmtEur(d.cashflowMonatY1)}/Mo liegt an der Rentabilitätsgrenze.`, false],
    ["Cap-Rate, Miethöhe und TI-Kosten nochmals prüfen – Nachverhandlung sinnvoll.", false],
  ] : [
    ["Gesamtbewertung: Eher Nein", true],
    [`Negativer Cashflow ${fmtEur(d.cashflowMonatY1)}/Mo – das Objekt trägt sich nicht.`, false],
    ["Break-even erfordert höhere Mieten, niedrigeren Kaufpreis oder weniger TI-Kosten.", false],
  ];
  r.fazit(y, fazit1);
}

function page2(r: R, d: GewerbeReportData) {
  let y = TOP;
  r.header("Cashflow-Analyse", "Monatliche Ertragsrechnung (Jahr 1)");

  const kw = (CW - 15) / 4;
  r.kpi(ML,           y, kw, 22, "Bruttomiete/Mo", fmtEur(d.grossRentYearY1/12), "Jahresbasis Y1", "light");
  r.kpi(ML+kw+5,      y, kw, 22, "NOI/Monat Y1",  fmtEur(d.noiY1/12),           "nach Opex & Capex", "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "TI-Kosten",     fmtEur(d.tiUpfront),          "einmalig Jahr 1", "light",
    d.tiUpfront > 0 ? C.amber : C.muted);
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Cashflow/Mo Y1",fmtEur(d.cashflowMonatY1),    "inkl. TI-Kosten", "dark",
    d.cashflowMonatY1 >= 0 ? C.green : C.red);
  y += 26;

  y = r.div(y, "Cashflow-Aufschlüsselung (Jahr 1, monatlich)");

  const cfRows = [
    ["Bruttomiete",          fmtEur(d.grossRentYearY1/12),     "100,0 %", "Kaltmiete aller Zonen"],
    ["– Leerstandsverlust",  fmtEur((d.grossRentYearY1-d.effRentYearY1)/12), fmtPct((d.grossRentYearY1-d.effRentYearY1)/d.grossRentYearY1), "Vakanz nach Zonen"],
    ["– Vermieter-Opex",     fmtEur(d.landlordOpexY1/12),      fmtPct(d.opexTotalPctBrutto,0), `Nicht umlb.: ${fmtPct(1-d.zonen.reduce((s,z)=>s+z.recoverablePct*z.areaM2,0)/Math.max(1,d.zonen.reduce((s,z)=>s+z.areaM2,0)),0)}`],
    ["– Instandhaltung",     fmtEur(d.capexY1/12),             fmtPct(d.capexRuecklagePctBrutto,0), "Capex-Rücklage"],
    ["= NOI",                fmtEur(d.noiY1/12),               fmtPct(d.noiY1/d.grossRentYearY1,0), "Nettoertrag vor Finanzierung"],
    ["– Kapitaldienst",      fmtEur(-d.annuityYear/12),        "",        d.financingOn ? fmtPct(d.zinsPct)+" p.a." : "keine Finanzierung"],
    ["– TI-Kosten (Y1/12)",  fmtEur(-d.tiUpfront/12),          "",        "Mieterausbauten anteilig"],
    ["= Cashflow",           fmtEur(d.cashflowMonatY1),        "",        "monatlicher Überschuss"],
    ["= Cashflow (jährl.)",  fmtEur(d.cashflowMonatY1*12),     "",        "ohne TI ab Y2"],
  ];
  y = r.table(y,
    ["Position", "Betrag/Mo", "Anteil", "Anmerkung"],
    cfRows, [CW*0.28, CW*0.15, CW*0.10, CW*0.47],
    ["l","r","r","l"]);

  if (d.dscr != null) {
    y = r.div(y, "DSCR – Debt Service Coverage Ratio");
    r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);
    const bw2 = CW * 0.62;
    r.rect(ML + 40, y + 2, bw2, 5, C.panel2, 2);
    const p = Math.min(Math.max((d.dscr - 1.0) / 1.0, 0), 1);
    r.rect(ML + 40, y + 2, Math.max(6, bw2 * p), 5,
      d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red, 2);
    const marks: [number, string][] = [[0,"1,0"],[0.2,"1,2"],[0.5,"1,5"],[1.0,"2,0"]];
    marks.forEach(([mp, lbl]) =>
      r.txt(lbl, ML + 40 + bw2*mp, y + 11,
        { size: 6, color: C.muted, align: "center" }));
    const bdgBg = d.dscr >= 1.2 ? C.greenLt : d.dscr >= 1.0 ? C.amberLt : C.redLt;
    const bdgFc = d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red;
    r.rect(ML + 144, y + 2, 33, 9, bdgBg, 2);
    r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",
      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: "center" });
    y += 22;
  }

  r.fazit(y, [
    ["Cashflow-Analyse (Jahr 1)", true],
    [`NOI ${fmtEur(d.noiY1/12)}/Mo – nach Kapitaldienst verbleibt ${fmtEur(d.cashflowMonatY1)}/Mo.`, false],
    [`TI-Kosten ${fmtEur(d.tiUpfront)} belasten Jahr 1 einmalig. Ab Y2 höherer Cashflow.`, false],
    ["Vermieter-Opex beinhaltet nicht umlagefähige Anteile gemäß Zonen-Konfiguration.", false],
  ]);
}

function page3(r: R, d: GewerbeReportData) {
  let y = TOP;
  r.header("Zonenanalyse & Mieteinheiten", "Zonales Ertragsmodell");

  y = r.div(y, "Zonen-Übersicht – Einnahmen & Risiko");

  const totalArea = d.zonen.reduce((s, z) => s + z.areaM2, 0);
  const zoneRows = d.zonen.map(z => [
    z.name,
    `${z.areaM2} m²`,
    `${z.rentPerM2.toFixed(2)} €/m²`,
    fmtEur(z.areaM2 * z.rentPerM2),
    fmtPct(z.vacancyPct, 0),
    `${z.leaseTermYears.toFixed(1)} J.`,
    fmtEur(z.tiPerM2 * z.areaM2),
  ]);
  zoneRows.push([
    "∑ Gesamt",
    `${totalArea} m²`,
    `${(d.grossRentYearY1/(totalArea*12)).toFixed(2)} € ø`,
    fmtEur(d.grossRentYearY1/12),
    fmtPct(d.zonen.reduce((s,z)=>s+z.vacancyPct*z.areaM2,0)/Math.max(1,totalArea), 1),
    `${d.avgWALT.toFixed(1)} J. ø`,
    fmtEur(d.tiUpfront),
  ]);
  y = r.table(y,
    ["Zone", "Fläche", "€/m²", "Miete/Mo", "Leerst.", "WALT", "TI-Kosten"],
    zoneRows,
    [CW*0.15, CW*0.10, CW*0.10, CW*0.14, CW*0.09, CW*0.09, CW*0.13],
    ["l","r","r","r","r","r","r"],
    { sumRow: true });

  y = r.div(y, "Cap-Rate-Analyse & Bewertung");

  const bw = (CW - 6) / 2;
  const capRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Cap Rate (angenommen)",  fmtPct(d.capRateAssumed),                                          "n"],
    ["Cap Spread",             fmtPct(d.capEff - d.capRateAssumed),                               "n"],
    ["Cap Rate effektiv",      fmtPct(d.capEff),                                                   "n"],
    ["Wert aus Cap (NOI/Cap)", fmtEur(d.wertAusCap),                                              d.valueGap >= 0 ? "g" : "a"],
    ["Kaufpreis",              fmtEur(d.kaufpreis),                                               "n"],
    ["Wert-Gap",               `${d.valueGap >= 0 ? "+" : ""}${fmtEur(d.valueGap)} (${fmtPct(d.valueGapPct)})`, d.valueGap >= 0 ? "g" : "r"],
  ];
  const riskRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Bonitäts-Klasse Top 3",  `Klasse ${d.bonitaetTop3}`,                                        d.bonitaetTop3 === "A" ? "g" : d.bonitaetTop3 === "B" ? "a" : "r"],
    ["WALT Ø",                 `${d.avgWALT.toFixed(1)} Jahre`,                                   d.avgWALT >= 5 ? "g" : "a"],
    ["Indexiert",              d.indexiert ? "Ja" : "Nein",                                        d.indexiert ? "g" : "a"],
    ["Recoverable Opex Ø",     fmtPct(d.zonen.reduce((s,z)=>s+z.recoverablePct*z.areaM2,0)/Math.max(1,totalArea)), "n"],
    ["NOI p.a. (Y1)",         fmtEur(d.noiY1),                                                    d.noiY1 > 0 ? "g" : "r"],
    ["Score",                  `${d.scorePct} % (${d.scoreLabel})`,                               d.scoreLabel === "BUY" ? "g" : d.scoreLabel === "CHECK" ? "a" : "r"],
  ];
  r.panel(ML,      y, bw, "Cap-Rate & Bewertung",    capRows);
  r.panel(ML+bw+6, y, bw, "Risiko & Qualität",       riskRows);
  y += Math.max(capRows.length * 7 + 14, riskRows.length * 7 + 14) + 6;

  r.fazit(y, [
    ["Zonenanalyse & Cap-Rate-Bewertung", true],
    [`WALT von ${d.avgWALT.toFixed(1)} Jahren – ${d.avgWALT >= 5 ? "solide" : "kurz, erhöhtes Prolongationsrisiko"}.`, false],
    [`Modellwert ${fmtEur(d.wertAusCap)} vs. Kaufpreis ${fmtEur(d.kaufpreis)} – Gap: ${fmtEur(d.valueGap)}.`, false],
    [`Bonitäts-Klasse ${d.bonitaetTop3} der Top-3-Mieter ${d.bonitaetTop3 === "A" ? "exzellent" : d.bonitaetTop3 === "B" ? "gut" : "erhöhtes Ausfallrisiko"}.`, false],
  ]);
}

function page4(r: R, d: GewerbeReportData) {
  let y = TOP;
  r.header("Tilgungsplan & 10J-Projektion", "Laufzeit-Finanzplanung");

  const kw = (CW - 15) / 4;
  const rest10 = d.tilgungsplan.rows[9]?.outstanding ?? d.loan;
  r.kpi(ML,           y, kw, 22, "Darlehen",        fmtEur(d.loan),             "Anfang", "dark");
  r.kpi(ML+kw+5,      y, kw, 22, "Restschuld 10J",  fmtEur(rest10),             "Stand Jahr 10", "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "Zinslast Y1",     fmtEur(d.interestY1),       "Jahr 1", "light");
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Tilgung Y1",      fmtEur(d.principalY1),      "Jahr 1 (steigt)", "light");
  y += 26;

  y = r.div(y, "Tilgungsplan – Jahresübersicht");

  const amortRows = d.tilgungsplan.rows
    .filter((_, i) => [0,4,9,14,19,24].includes(i))
    .map(a => [
      `Jahr ${a.year}`,
      fmtEur(a.outstanding),
      fmtEur(a.principal),
      fmtEur(a.interest),
      fmtEur(a.annuity),
      `${(a.outstanding/d.loan*100).toFixed(0)} %`,
    ]);
  y = r.table(y,
    ["Jahr", "Restschuld", "Tilgung", "Zinsen", "Annuität", "LTV"],
    amortRows,
    [CW*0.12, CW*0.20, CW*0.17, CW*0.17, CW*0.17, CW*0.17],
    ["l","r","r","r","r","r"]);

  y = r.div(y, "10-Jahres-Cashflow-Projektion");

  const projRows = d.projection.map(p => [
    `Jahr ${p.year}`,
    fmtEur(p.cashflowPA / 12),
    fmtEur(p.cashflowPA),
    fmtEur(p.tilgungPA),
  ]);
  y = r.table(y,
    ["Jahr", "CF/Monat", "CF p.a.", "Tilgung p.a."],
    projRows,
    [CW*0.15, CW*0.28, CW*0.28, CW*0.29],
    ["l","r","r","r"]);

  r.fazit(y, [
    ["Tilgungs- & Projektionsbewertung", true],
    [`Restschuld nach 10 Jahren: ${fmtEur(rest10)} (${(rest10/d.loan*100).toFixed(0)} % des Ursprungsdarlehens).`, false],
    ["Annuität konstant – Tilgungsanteil steigt jährlich, Zinslast sinkt.", false],
    ["Projektion basiert auf 1,5% Miet- und 2,0% Kostensteigerung p.a. (ohne TI ab Y2).", false],
  ]);
}

function page5(r: R, d: GewerbeReportData) {
  let y = TOP;
  r.header("Stresstest & Sensitivitätsmatrix", "Risikoanalyse");

  y = r.div(y, "DSCR-Sensitivitätsmatrix – Zins × Mietentwicklung");
  y = r.matrix(y, d);
  r.txt("Grün ≥ 1,20 (bankfähig)  ·  Orange ≥ 1,00 (grenzwertig)  ·  Rot < 1,00 (kritisch)  ·  Gelb = Basisszenario",
    ML, y, { size: 7, color: C.muted }); y += 8;

  y = r.div(y, "Risikopuffer & Bewertung");

  const bw = (CW - 6) / 2;
  const totalArea = d.zonen.reduce((s, z) => s + z.areaM2, 0);
  const avgVac = totalArea > 0 ?
    d.zonen.reduce((s,z) => s + z.vacancyPct * z.areaM2, 0) / totalArea : 0;

  const beRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["NOI-Rendite aktuell",   fmtPct(d.noiYield),          d.noiYield >= 0.05 ? "g" : "a"],
    ["Cap Rate eff.",          fmtPct(d.capEff),             "n"],
    ["Wert-Gap",               fmtEur(d.valueGap),           d.valueGap >= 0 ? "g" : "r"],
    ["Ø Leerstand",           fmtPct(avgVac, 1),             avgVac < 0.05 ? "g" : "a"],
    ["WALT",                   `${d.avgWALT.toFixed(1)} J.`, d.avgWALT >= 5 ? "g" : "a"],
    ["TI-Kosten",              fmtEur(d.tiUpfront),          d.tiUpfront === 0 ? "g" : "a"],
  ];
  const riskRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["LTV",                   fmtPct(d.ltvPct, 0),           d.ltvPct > 0.65 ? "a" : "n"],
    ["DSCR",                  d.dscr != null ? fmtNum(d.dscr) : "–",
                                                              d.dscr != null && d.dscr >= 1.2 ? "g" : d.dscr != null && d.dscr >= 1.0 ? "a" : "r"],
    ["DSCR bei +2% Zins",    (() => {
      if (!d.financingOn || !d.loan) return "–";
      const ann = d.annuityYear * (1 + 0.02/d.zinsPct);
      const v = ann > 0 ? d.noiY1/ann : 0;
      return fmtNum(v);
    })(),                                                     (() => {
      if (!d.financingOn || !d.loan) return "n" as const;
      const ann = d.annuityYear * (1 + 0.02/d.zinsPct);
      const v = ann > 0 ? d.noiY1/ann : 0;
      return v >= 1.2 ? "g" as const : v >= 1.0 ? "a" as const : "r" as const;
    })()],
    ["Bonitäts-Klasse",       `Klasse ${d.bonitaetTop3}`,    d.bonitaetTop3 === "A" ? "g" : d.bonitaetTop3 === "B" ? "a" : "r"],
    ["Indexiert",              d.indexiert ? "Ja" : "Nein",   d.indexiert ? "g" : "a"],
    ["Entscheidung",          d.scoreLabel === "BUY" ? "Kaufen" : d.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein",
                                                              d.scoreLabel === "BUY" ? "g" : d.scoreLabel === "CHECK" ? "a" : "r"],
  ];
  r.panel(ML,      y, bw, "Risikopuffer",    beRows);
  r.panel(ML+bw+6, y, bw, "Risikobewertung", riskRows);
  y += Math.max(beRows.length * 7 + 14, riskRows.length * 7 + 14) + 6;

  r.fazit(y, [
    ["Risikoeinschätzung", true],
    [`DSCR-Matrix: Bei Basismiete bleibt DSCR bis ${d.zinsPct + 0.02 <= 0.05 ? "5,0" : "6,5"} % Zinsen ${(d.dscr ?? 0) >= 1.2 ? "bankkonform" : "grenzwertig"}.`, false],
    [`WALT ${d.avgWALT.toFixed(1)} Jahre · Leerstand ${fmtPct(avgVac,1)} · Bonitäts-Klasse ${d.bonitaetTop3}.`, false],
    ["Prolongationsrisiko bei kurzer WALT erhöht – frühzeitige Mietvertragsverlängerung empfohlen.", false],
  ]);
}

// ── Hauptfunktion ────────────────────────────────────────────────────────────
export function generateGewerbePdf(data: GewerbeReportData): void {
  const investor = data.investorName || "Propora-Nutzer";
  const TOTAL = 5;
  const r = new R(investor);

  [page1, page2, page3, page4, page5].forEach((fn, i) => {
    if (i > 0) r.doc.addPage();
    fn(r, data);
  });

  const n = r.doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    r.doc.setPage(i);
    r.footer(i, TOTAL);
  }

  const today = new Date().toISOString().slice(0, 10);
  r.doc.save(`propora_gewerbe_${today}.pdf`);
}
