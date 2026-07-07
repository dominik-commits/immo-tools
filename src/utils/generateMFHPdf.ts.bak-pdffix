/**
 * Propora – Mehrfamilienhaus Bankgespräch-Report
 * Erzeugt ein mehrseitiges PDF direkt im Browser via jsPDF
 * import { generateMFHPdf } from "../utils/generateMFHPdf";
 */

import jsPDF from "jspdf";
import { PROPORA_LOGO_B64 } from "./propLogo";

// ── Typen ──────────────────────────────────────────────────────────────────
export interface MFHUnit {
  id: string;
  name: string;
  areaM2: number;
  rentPerM2: number;
}

export interface MFHReportData {
  // Meta
  investorName?: string;
  adresse?: string;
  objektBezeichnung?: string;
  // Objekt
  kaufpreis: number;
  bundesland: string;
  gesamtFlaecheM2: number;
  kaltmieteJahr: number;
  leerstandPct: number;
  nichtUmlagefaehigeKosten: number;
  capexRuecklagePctBrutto: number;
  units: MFHUnit[];
  mgmtMode: "gesamt" | "einheiten";
  // Nebenkosten
  nkGrEStPct: number;
  nkNotarPct: number;
  nkGrundbuchPct: number;
  nkMaklerPct: number;
  nkSonstPct: number;
  nkRenovierung: number;
  nkSanierung: number;
  // Finanzierung
  eigenkapital: number;
  loan: number;
  zins: number;
  tilgung: number;
  manualLoan: boolean;
  // Berechnete Werte
  allIn: number;
  nkSum: number;
  nkPct: number;
  noi: number;
  noiYield: number;
  dscr: number;
  annuitaetJahr: number;
  annuitaetMonat: number;
  zinsMonat: number;
  tilgungMonat: number;
  monthlyEffRent: number;
  monthlyOpex: number;
  monthlyCapex: number;
  monthlyCF: number;
  grossRentAdj: number;
  effRentYear: number;
  scorePct: number;
  decisionLabel: "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";
  decisionText: string;
  bePrice: number | null;
  beRentPerM2: number | null;
  avgRentPerM2: number;
  projection: { year: number; noi: number; cf: number; effRent: number }[];
  amort: { year: number; restschuld: number; zinsen: number; tilgungsBetrag: number }[];
}

// ── Format-Helfer ───────────────────────────────────────────────────────────
const fmtEur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number, dec = 1) => `${(v * 100).toFixed(dec)} %`;
const fmtNum = (v: number, dec = 2) => v.toFixed(dec);

// ── Design-Konstanten ───────────────────────────────────────────────────────
const PW = 210, PH = 297;
const ML = 14, MR = 14, HEAD = 26, FOOT = 12;
const CW = PW - ML - MR;
const TOP = HEAD + 6;

const C = {
  black:   [17, 17, 17]   as [number,number,number],
  dark:    [26, 26, 26]   as [number,number,number],
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
  private page = 0;
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

  line(x1: number, y1: number, x2: number, y2: number, color: [number,number,number] = C.border, lw = 0.3) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(lw);
    this.doc.line(x1, y1, x2, y2);
  }

  // ── Header ─────────────────────────────────────────────────────────────
  header(title: string, subtitle: string) {
    this.rect(0, 0, PW, HEAD, C.dark);
    this.rect(0, HEAD - 1.5, PW, 1.5, C.yellow);
    try { this.doc.addImage(PROPORA_LOGO_B64, "PNG", ML, 5, 26, 8); }
    catch { this.txt("PROPORA", ML, 11, { size: 10, bold: true, color: C.yellow }); }
    this.txt("Investitionsanalyse", ML + 30, 11, { size: 8, color: C.light });
    this.txt(title, ML, 19, { size: 11, bold: true, color: C.white });
    this.txt(subtitle, ML, 24, { size: 7.5, color: [150, 150, 150] as any });
    this.txt(this.investor, PW - MR, 11, { size: 8, color: C.light, align: "right" });
    this.txt(new Date().toLocaleDateString("de-DE"), PW - MR, 19, { size: 8, color: C.light, align: "right" });
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

  // ── KPI-Kachel ─────────────────────────────────────────────────────────
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

  // ── Section-Divider ────────────────────────────────────────────────────
  div(y: number, label: string): number {
    this.rect(ML, y, CW, 8, C.dark, 2);
    this.rect(ML, y, 2.5, 8, C.yellow);
    this.txt(label.toUpperCase(), ML + 6, y + 5.5, { size: 7, bold: true, color: C.yellow });
    return y + 11;
  }

  // ── Info-Panel ─────────────────────────────────────────────────────────
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

  // ── Dunkle Tabelle ─────────────────────────────────────────────────────
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
        this.txt(cell, cx, ry + 4.8, { size: 8, align: al,
          bold: isSum, color: C.black });
        rx += cws[ci];
      });
    });
    this.doc.setDrawColor(...C.border2);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(ML, y, CW, headH + rows.length * rowH, 2, 2, "S");
    return y + headH + rows.length * rowH + 4;
  }

  // ── DSCR-Bar ───────────────────────────────────────────────────────────
  dscrBar(y: number, value: number): number {
    const bh = 5, by = y + 4;
    this.rect(ML, by, CW, bh, C.panel2, 2);
    const pct_ = Math.min(Math.max((value - 1.0) / 1.0, 0), 1);
    const fw = Math.max(8, CW * pct_);
    const fc = value >= 1.2 ? C.green : value >= 1.0 ? C.amber : C.red;
    this.rect(ML, by, fw, bh, fc, 2);
    const marks: [number, string][] = [[0, "1,0"], [0.2, "1,2"], [0.5, "1,5"], [1.0, "2,0"]];
    marks.forEach(([p, lbl]) =>
      this.txt(lbl, ML + CW * p, by + bh + 4, { size: 6, color: C.muted, align: "center" }));
    return y + 18;
  }

  // ── Fazit-Box ──────────────────────────────────────────────────────────
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

  // ── Sensitivity-Matrix (DSCR) ──────────────────────────────────────────
  matrix(y: number, d: MFHReportData): number {
    const zins_vals = [0.03, 0.035, d.zins, 0.05, 0.06];
    const zins_lbls = ["3,0 %", "3,5 %", `Basis ${fmtPct(d.zins)}`, "5,0 %", "6,0 %"];
    const mult_vals = [0.85, 0.90, 1.0, 1.05, 1.15];
    const mult_lbls = ["–15 %", "–10 %", "Basis", "+5 %", "+15 %"];

    const calc = (z: number, mm: number) => {
      const gross = d.grossRentAdj * mm;
      const eff = gross * (1 - d.leerstandPct);
      const capex = gross * d.capexRuecklagePctBrutto;
      const noi = Math.max(0, eff - d.nichtUmlagefaehigeKosten - capex);
      const ann = d.loan * (z + d.tilgung);
      return ann > 0 ? noi / ann : 99;
    };

    const colW = CW / 6;
    const rowH = 8;
    // Header
    this.rect(ML, y, CW, rowH, C.dark, 2);
    this.txt("Zins / Miete", ML + 3, y + 5.5, { size: 7.5, bold: true, color: C.white });
    mult_lbls.forEach((lbl, mi) =>
      this.txt(lbl, ML + colW * (1.5 + mi), y + 5.5,
        { size: 7.5, bold: true, color: C.white, align: "center" }));

    zins_vals.forEach((z, zi) => {
      const ry = y + rowH + zi * rowH;
      const isBase = Math.abs(z - d.zins) < 0.001;
      this.rect(ML, ry, CW, rowH, isBase ? C.panel2 : zi % 2 === 0 ? C.panel : C.white);
      this.line(ML, ry, ML + CW, ry, C.border, 0.2);
      this.txt(zins_lbls[zi], ML + 3, ry + 5.5,
        { size: 7.5, bold: isBase, color: C.black });
      mult_vals.forEach((mm, mi) => {
        const v = calc(z, mm);
        const cx = ML + colW * (1.5 + mi);
        const isBaseCell = isBase && Math.abs(mm - 1.0) < 0.001;
        if (isBaseCell) this.rect(cx - colW / 2, ry, colW, rowH, C.yellow);
        const fc = v >= 1.2 ? C.green : v >= 1.0 ? C.amber : C.red;
        this.txt(v < 99 ? v.toFixed(2) : "–", cx, ry + 5.5,
          { size: 8, bold: true, color: isBaseCell ? C.black : fc, align: "center" });
      });
    });

    this.doc.setDrawColor(...C.border2);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(ML, y, CW, rowH * (1 + zins_vals.length), 2, 2, "S");
    return y + rowH * (1 + zins_vals.length) + 4;
  }
}

// ── Seiten-Builder ──────────────────────────────────────────────────────────
function page1(r: R, d: MFHReportData) {
  let y = TOP;
  const objName = d.adresse || d.objektBezeichnung ||
    `Mehrfamilienhaus ${d.gesamtFlaecheM2} m²`;

  r.header("Investitionsübersicht", objName);

  const kw = (CW - 15) / 4;
  const dec = d.decisionLabel;
  const decColor: [number,number,number] = dec === "RENTABEL" ? C.green : dec === "GRENZWERTIG" ? C.amber : C.red;
  const decDE = dec === "RENTABEL" ? "Rentabel" : dec === "GRENZWERTIG" ? "Grenzwertig" : "Nicht rentabel";

  r.kpi(ML,             y, kw, 22, "Kaufpreis",       fmtEur(d.kaufpreis),        `Faktor ${(d.allIn / d.kaltmieteJahr).toFixed(1)}×`, "dark");
  r.kpi(ML+kw+5,        y, kw, 22, "NOI-Rendite",     fmtPct(d.noiYield),         `Brutto: ${fmtPct(d.kaltmieteJahr/d.allIn)}`, "light");
  r.kpi(ML+2*(kw+5),    y, kw, 22, "DSCR",            fmtNum(d.dscr),             "Mindest: 1,20", "light",
    d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red);
  r.kpi(ML+3*(kw+5),    y, kw, 22, "Cashflow/Monat",  fmtEur(d.monthlyCF),        decDE, "light", decColor);
  y += 26;

  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 5;

  const bw = (CW - 6) / 2;
  const objRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Gesamtfläche",    `${d.gesamtFlaecheM2} m²`,             "n"],
    ["Einheiten",       `${d.units.length} WE`,                "n"],
    ["Kaltmiete p.a.",  fmtEur(d.kaltmieteJahr),               "n"],
    ["Ø Miete/m²",     `${d.avgRentPerM2.toFixed(2)} €/m²`,   "n"],
    ["Bundesland",      d.bundesland.replace("_", "-"),         "n"],
    ["Leerstand",       fmtPct(d.leerstandPct, 1),              "n"],
  ];
  const finRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Eigenkapital",    fmtEur(d.eigenkapital),                 "n"],
    ["Darlehen",        fmtEur(d.loan),                         "n"],
    ["Zinssatz",        fmtPct(d.zins),                         "n"],
    ["Tilgung",         fmtPct(d.tilgung),                      "n"],
    ["Annuität/Mo",     fmtEur(d.annuitaetMonat),               "n"],
    ["Nebenkosten",     fmtEur(d.nkSum),                        "n"],
  ];
  const pe = r.panel(ML,       y, bw, "Objekt",       objRows);
  const pf = r.panel(ML+bw+6,  y, bw, "Finanzierung", finRows);
  y = Math.max(pe, pf) + 2;

  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 4;
  r.txt("Investitions-Kennzahlen im Überblick".toUpperCase(), ML, y,
    { size: 6.5, bold: true, color: C.muted }); y += 5;

  const kennRows = [
    ["Kaufpreisfaktor",     `${(d.allIn/d.kaltmieteJahr).toFixed(1)}×`,   "Bruttomietrendite",   fmtPct(d.kaltmieteJahr/d.allIn)],
    ["NOI-Rendite",         fmtPct(d.noiYield),                           "NOI p.a.",             fmtEur(d.noi)],
    ["LTV",                 fmtPct(d.loan/d.allIn, 0),                    "All-in Kaufpreis",     fmtEur(d.allIn)],
    ["Annuität p.a.",       fmtEur(d.annuitaetJahr),                      "Cashflow p.a.",        fmtEur(d.monthlyCF*12)],
    ["DSCR",                fmtNum(d.dscr),                               "Entscheidung",         decDE],
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

  const fazit1: [string, boolean][] = dec === "RENTABEL" ? [
    ["Gesamtbewertung: Rentabel", true],
    [`NOI-Rendite ${fmtPct(d.noiYield)} · DSCR ${fmtNum(d.dscr)} · Cashflow +${fmtEur(d.monthlyCF)}/Monat`, false],
    ["Die Kennzahlen liegen im Zielkorridor – das Objekt wirkt wirtschaftlich tragfähig.", false],
  ] : dec === "GRENZWERTIG" ? [
    ["Gesamtbewertung: Grenzwertig", true],
    [`Cashflow ${fmtEur(d.monthlyCF)}/Monat liegt an der Rentabilitätsgrenze.`, false],
    ["Kaufpreisverhandlung oder Mieterhöhung würden die Kennzahlen deutlich verbessern.", false],
  ] : [
    ["Gesamtbewertung: Nicht rentabel", true],
    [`Negativer Cashflow ${fmtEur(d.monthlyCF)}/Monat – das Objekt trägt sich aktuell nicht.`, false],
    ["Break-even erfordert höhere Miete, niedrigeren Kaufpreis oder mehr Eigenkapital.", false],
  ];
  r.fazit(y, fazit1);
}

function page2(r: R, d: MFHReportData) {
  let y = TOP;
  const objName = d.adresse || d.objektBezeichnung || `MFH ${d.gesamtFlaecheM2} m²`;
  r.header("Cashflow-Analyse", "Monatliche Ertragsrechnung");

  const kw = (CW - 15) / 4;
  r.kpi(ML,           y, kw, 22, "Kaltmiete/Mo",   fmtEur(d.kaltmieteJahr/12),      "Bruttomieteinnahmen", "light");
  r.kpi(ML+kw+5,      y, kw, 22, "Leerstand/Mo",   fmtEur(d.grossRentAdj*d.leerstandPct/12),"Risikopuffer", "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "NOI/Monat",      fmtEur(d.noi/12),                "nach Bewirtschaftung", "light");
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Cashflow/Monat", fmtEur(d.monthlyCF),             "nach Kapitaldienst", "dark",
    d.monthlyCF >= 0 ? C.green : C.red);
  y += 26;

  y = r.div(y, "Cashflow-Aufschlüsselung (monatlich)");

  const cfRows = [
    ["Kaltmiete",             fmtEur(d.kaltmieteJahr/12),               "100,0 %", "Bruttomieteinnahmen"],
    ["– Leerstandsverlust",   fmtEur(-d.grossRentAdj*d.leerstandPct/12),fmtPct(d.leerstandPct,1), `${(d.leerstandPct*100).toFixed(1)} % Risikopuffer`],
    ["– Nicht-uml. Kosten",   fmtEur(-d.monthlyOpex),                   "",        "Verwaltung, Instandhaltung"],
    ["– Instandhaltung",      fmtEur(-d.monthlyCapex),                  fmtPct(d.capexRuecklagePctBrutto,0), "Kapexrücklage"],
    ["= NOI",                 fmtEur(d.noi/12),                         fmtPct(d.noi/d.kaltmieteJahr,0), "Nettoertrag vor Finanzierung"],
    ["– Zinsen",              fmtEur(-d.zinsMonat),                     "",        fmtPct(d.zins)+" p.a."],
    ["– Tilgung",             fmtEur(-d.tilgungMonat),                  "",        fmtPct(d.tilgung)+" p.a."],
    ["= Cashflow",            fmtEur(d.monthlyCF),                      "",        "monatlicher Überschuss"],
    ["= Cashflow (jährl.)",   fmtEur(d.monthlyCF*12),                   "",        "Liquiditätspuffer pro Jahr"],
  ];
  y = r.table(y,
    ["Position", "Betrag/Mo", "Anteil", "Anmerkung"],
    cfRows, [CW*0.28, CW*0.15, CW*0.10, CW*0.47],
    ["l","r","r","l"], { sumRow: false });

  y = r.div(y, "DSCR – Debt Service Coverage Ratio");
  r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark",
    d.dscr >= 1.2 ? C.yellow : C.yellow);

  const bw2 = CW * 0.62;
  r.rect(ML + 40, y + 2, bw2, 5, C.panel2, 2);
  const pct_ = Math.min(Math.max((d.dscr - 1.0) / 1.0, 0), 1);
  const fw_ = Math.max(6, bw2 * pct_);
  r.rect(ML + 40, y + 2, fw_, 5, d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red, 2);
  const marks: [number, string][] = [[0,"1,0"],[0.2,"1,2"],[0.5,"1,5"],[1.0,"2,0"]];
  marks.forEach(([p, lbl]) =>
    r.txt(lbl, ML + 40 + bw2*p, y + 11, { size: 6, color: C.muted, align: "center" }));
  const bdgBg = d.dscr >= 1.2 ? C.greenLt : d.dscr >= 1.0 ? C.amberLt : C.redLt;
  const bdgFc = d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red;
  r.rect(ML + 144, y + 2, 33, 9, bdgBg, 2);
  const bdgTxt = d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch";
  r.txt(bdgTxt, ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: "center" });
  y += 22;

  r.fazit(y, [
    ["Cashflow-Analyse", true],
    [`NOI ${fmtEur(d.noi/12)}/Mo – nach Kapitaldienst (${fmtEur(d.annuitaetMonat)}/Mo) verbleibt ${fmtEur(d.monthlyCF)}/Mo.`, false],
    [`DSCR von ${fmtNum(d.dscr)} ${d.dscr >= 1.2 ? "übertrifft" : "unterschreitet"} die Mindestanforderung von 1,20.`, false],
    ["Nicht-umlagefähige Kosten und Instandhaltungsrücklage sind konservativ angesetzt.", false],
  ]);
}

function page3(r: R, d: MFHReportData) {
  let y = TOP;
  r.header("Tilgungs- & Finanzierungsplan", "Laufzeit-Finanzplanung");

  const kw = (CW - 15) / 4;
  const rest10 = d.amort[9]?.restschuld ?? d.loan;
  const rest20 = d.amort[19]?.restschuld ?? 0;
  r.kpi(ML,           y, kw, 22, "Darlehen",       fmtEur(d.loan),     "Anfang",        "dark");
  r.kpi(ML+kw+5,      y, kw, 22, "Restschuld 10J", fmtEur(rest10),     "Stand Jahr 10", "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "Zinslast p.a.",  fmtEur(d.zinsMonat*12), "Jahr 1",   "light");
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Tilgung p.a.",   fmtEur(d.tilgungMonat*12), "Jahr 1 (steigt)", "light");
  y += 26;

  y = r.div(y, "Tilgungsplan – Jahresübersicht");

  const amortRows = d.amort
    .filter((_, i) => [0,4,9,14,19,24,29].includes(i))
    .map(a => [
      `Jahr ${a.year}`,
      fmtEur(a.restschuld),
      fmtEur(a.tilgungsBetrag),
      fmtEur(a.zinsen),
      fmtEur(a.zinsen + a.tilgungsBetrag),
      `${(a.restschuld/d.loan*100).toFixed(0)} %`,
    ]);
  y = r.table(y,
    ["Jahr", "Restschuld", "Tilgung p.a.", "Zinslast p.a.", "Annuität", "LTV"],
    amortRows, [CW*0.12, CW*0.20, CW*0.17, CW*0.17, CW*0.17, CW*0.17],
    ["l","r","r","r","r","r"]);

  y = r.div(y, "10-Jahres-Cashflow-Projektion (1% Mietsteigerung, 1.5% Kostensteigerung)");

  const projRows = d.projection.map(p => [
    `Jahr ${p.year}`,
    fmtEur(p.effRent ?? 0),
    fmtEur(p.noi),
    fmtEur(d.annuitaetJahr),
    fmtEur(p.cf),
  ]);
  y = r.table(y,
    ["Jahr", "Eff. Miete p.a.", "NOI p.a.", "Kapitaldienst", "Cashflow p.a."],
    projRows, [CW*0.12, CW*0.22, CW*0.22, CW*0.22, CW*0.22],
    ["l","r","r","r","r"]);

  r.fazit(y, [
    ["Tilgungs- & Projektionsbewertung", true],
    [`Restschuld nach 10 Jahren: ${fmtEur(rest10)} · nach 20 Jahren: ${fmtEur(rest20)}.`, false],
    ["Die Annuität bleibt konstant – der Tilgungsanteil steigt jährlich, die Zinslast sinkt.", false],
    ["Die Cashflow-Projektion zeigt die Entwicklung bei angenommener Miet- und Kostensteigerung.", false],
  ]);
}

function page4(r: R, d: MFHReportData) {
  let y = TOP;
  r.header("Stresstest & Sensitivitätsmatrix", "Risikoanalyse");

  y = r.div(y, "DSCR-Sensitivitätsmatrix – Zins × Mietentwicklung");
  y = r.matrix(y, d);
  r.txt("Grün ≥ 1,20 (bankfähig)  ·  Orange ≥ 1,00 (grenzwertig)  ·  Rot < 1,00 (kritisch)  ·  Gelb = Basisszenario",
    ML, y, { size: 7, color: C.muted }); y += 8;

  y = r.div(y, "Break-even & Risikopuffer");

  const bw = (CW - 6) / 2;
  const beRentPf = d.beRentPerM2
    ? `${((d.avgRentPerM2 - d.beRentPerM2) / d.beRentPerM2 * 100).toFixed(1)} %`
    : "–";
  const beRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Mindestmiete/m² (CF=0)", d.beRentPerM2 ? `${d.beRentPerM2.toFixed(2)} €/m²` : "–", "n"],
    ["Aktuelle Ø Miete/m²",   `${d.avgRentPerM2.toFixed(2)} €/m²`,  d.avgRentPerM2 > (d.beRentPerM2 ?? 999) ? "g" : "r"],
    ["Puffer über Mindestmiete", beRentPf,                            d.avgRentPerM2 > (d.beRentPerM2 ?? 999) ? "g" : "r"],
    ["Break-even Kaufpreis",  d.bePrice ? fmtEur(d.bePrice) : "–",   "n"],
    ["Aktueller Kaufpreis",   fmtEur(d.kaufpreis),                   d.bePrice && d.kaufpreis < d.bePrice ? "g" : "a"],
    ["Max. Leerstand (CF=0)", d.beRentPerM2 && d.beRentPerM2 > 0
      ? `${Math.max(0, (1-d.beRentPerM2/d.avgRentPerM2)*100).toFixed(1)} %` : "–", "n"],
  ];
  const riskRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["LTV",                fmtPct(d.loan/d.allIn, 0),                d.loan/d.allIn > 0.8 ? "a" : "n"],
    ["Eigenkapital",       fmtEur(d.eigenkapital),                   "n"],
    ["Zinsbindungsrisiko", "Bei Prolongation beachten",               "a"],
    ["DSCR aktuell",       fmtNum(d.dscr),                           d.dscr >= 1.2 ? "g" : d.dscr >= 1.0 ? "a" : "r"],
    ["DSCR bei +2% Zins",  (() => {
      const ann = d.loan * (d.zins + 0.02 + d.tilgung);
      return ann > 0 ? fmtNum(d.noi/ann) : "–";
    })(),                                                             (() => {
      const ann = d.loan * (d.zins + 0.02 + d.tilgung);
      const v = ann > 0 ? d.noi/ann : 0;
      return v >= 1.2 ? "g" : v >= 1.0 ? "a" : "r";
    })()],
    ["Entscheidung",       d.decisionLabel === "RENTABEL" ? "Rentabel" : d.decisionLabel === "GRENZWERTIG" ? "Grenzwertig" : "Nicht rentabel",
                                                                      d.decisionLabel === "RENTABEL" ? "g" : d.decisionLabel === "GRENZWERTIG" ? "a" : "r"],
  ];
  r.panel(ML,       y, bw, "Break-even-Analyse",  beRows);
  r.panel(ML+bw+6,  y, bw, "Risikobewertung",     riskRows);
  y += Math.max(beRows.length * 7 + 14, riskRows.length * 7 + 14) + 6;

  r.fazit(y, [
    ["Risikoeinschätzung", true],
    [`Sensitivitätsmatrix: Bei Basismiete bleibt DSCR bis ca. 5,0 % Zinsen bankkonform.`, false],
    [`Mietpuffer: Ø Miete ${d.avgRentPerM2.toFixed(2)} €/m² vs. Break-even ${d.beRentPerM2?.toFixed(2) ?? "–"} €/m².`, false],
    ["Hoher LTV erhöht Prolongationsrisiko – frühzeitige Zinssicherung wird empfohlen.", false],
  ]);
}

function page5(r: R, d: MFHReportData) {
  let y = TOP;
  r.header("Mieteinheiten & Objektsubstanz", "Objekt & Einheiten");

  y = r.div(y, "Mieteinheiten – Übersicht");

  const unitRows = d.units.map(u => [
    u.name,
    `${u.areaM2} m²`,
    `${u.rentPerM2.toFixed(2)} €/m²`,
    fmtEur(u.areaM2 * u.rentPerM2),
    fmtEur(u.areaM2 * u.rentPerM2 * 12),
    "vermietet",
  ]);
  // Summenzeile
  const totalArea = d.units.reduce((s, u) => s + u.areaM2, 0);
  const totalRentMo = d.units.reduce((s, u) => s + u.areaM2 * u.rentPerM2, 0);
  unitRows.push(["∑ Gesamt", `${totalArea} m²`, `${(totalRentMo/totalArea).toFixed(2)} € ø`, fmtEur(totalRentMo), fmtEur(totalRentMo*12), `${d.units.length} WE`]);

  y = r.table(y,
    ["Einheit", "Fläche", "€/m²", "Miete/Mo", "Miete/Jahr", "Status"],
    unitRows,
    [CW*0.12, CW*0.12, CW*0.12, CW*0.16, CW*0.16, CW*0.12],
    ["l","r","r","r","r","l"],
    { sumRow: true });

  y = r.div(y, "Kapitalstruktur & Renditekennzahlen");

  const bw = (CW - 6) / 2;
  const rendRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Bruttomietrendite",    fmtPct(d.kaltmieteJahr/d.allIn),          d.kaltmieteJahr/d.allIn >= 0.05 ? "g" : "a"],
    ["NOI-Rendite (netto)",  fmtPct(d.noiYield),                        d.noiYield >= 0.05 ? "g" : "a"],
    ["Kaufpreisfaktor",      `${(d.allIn/d.kaltmieteJahr).toFixed(1)}×`,"n"],
    ["All-in Kaufpreis",     fmtEur(d.allIn),                           "n"],
    ["Nebenkosten",          `${fmtEur(d.nkSum)} (${fmtPct(d.nkPct,1)})`,"n"],
  ];
  const kapRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Eigenkapital",         fmtEur(d.eigenkapital),                    "n"],
    ["Fremdkapital",         fmtEur(d.loan),                            "n"],
    ["LTV",                  fmtPct(d.loan/d.allIn, 0),                 d.loan/d.allIn > 0.8 ? "a" : "n"],
    ["Annuität p.a.",        fmtEur(d.annuitaetJahr),                   "n"],
    ["Cashflow p.a.",        fmtEur(d.monthlyCF*12),                    d.monthlyCF >= 0 ? "g" : "r"],
  ];
  r.panel(ML,       y, bw, "Renditekennzahlen", rendRows);
  r.panel(ML+bw+6,  y, bw, "Kapitalstruktur",  kapRows);
  y += Math.max(rendRows.length * 7 + 14, kapRows.length * 7 + 14) + 6;

  r.fazit(y, [
    ["Objekt- & Renditeübersicht", true],
    [`${d.units.length} Einheiten · ${totalArea} m² Gesamtfläche · Ø ${(totalRentMo/totalArea).toFixed(2)} €/m²`, false],
    [`NOI-Rendite ${fmtPct(d.noiYield)} · Cashflow ${fmtEur(d.monthlyCF)}/Mo · DSCR ${fmtNum(d.dscr)}`, false],
    ["Die Renditekennzahlen bilden die Grundlage für das Kreditgespräch.", false],
  ]);
}

// ── Hauptfunktion ────────────────────────────────────────────────────────────
export function generateMFHPdf(data: MFHReportData): void {
  const investor = data.investorName || "Propora-Nutzer";
  const TOTAL = 5;

  const r = new R(investor);
  const builders = [page1, page2, page3, page4, page5];

  builders.forEach((fn, i) => {
    if (i > 0) r.doc.addPage();
    fn(r, data);
  });

  // Footer auf alle Seiten
  const n = r.doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    r.doc.setPage(i);
    r.footer(i, TOTAL);
  }

  const today = new Date().toISOString().slice(0, 10);
  r.doc.save(`propora_mfh_${today}.pdf`);
}
