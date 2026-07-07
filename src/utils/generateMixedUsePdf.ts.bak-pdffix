/**
 * Propora – Mixed-Use Bankgespräch-Report
 * Erzeugt ein mehrseitiges PDF direkt im Browser via jsPDF
 * import { generateMixedUsePdf } from "../utils/generateMixedUsePdf";
 */

import jsPDF from "jspdf";
import { PROPORA_LOGO_B64 } from "./propLogo";

// ── Typen ──────────────────────────────────────────────────────────────────
export interface MixedUseReportData {
  // Meta
  investorName?: string;
  adresse?: string;
  objektBezeichnung?: string;
  // Eingaben
  kaufpreis: number;
  nkGrEStPct: number;
  nkNotarPct: number;
  nkGrundbuchPct: number;
  nkMaklerPct: number;
  nkSonstPct: number;
  nkPct: number;
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  tilgungPct: number;
  // Segment Wohnen
  wFl: number;
  wRentM2: number;
  wLeer: number;
  wOpexBrutto: number;
  wCap: number;
  // Segment Gewerbe
  gFl: number;
  gRentM2: number;
  gLeer: number;
  gOpexBrutto: number;
  gCap: number;
  // Berechnete Werte
  grossW: number;
  effW: number;
  opexW: number;
  noiW: number;
  wertW: number;
  grossG: number;
  effG: number;
  opexG: number;
  noiG: number;
  wertG: number;
  noi: number;
  wertAusCap: number;
  loan: number;
  annu: number;
  dscr: number | null;
  noiYield: number;
  valueGapPct: number;
  cashflowMonat: number;
  scoreLabel: "BUY" | "CHECK" | "NO";
  scorePct: number;
  valueGap: number;
  nkSum: number;
  monthlyEffRent: number;
  monthlyOpex: number;
  monthlyInterest: number;
  monthlyPrincipal: number;
  bePrice: number | null;
  beRentK: number;
  projection: { year: number; Cashflow: number; Tilgung: number; Vermoegen: number }[];
  decisionText: string;
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
  wBlue:   [59, 130, 246]  as [number,number,number],
  wBlueLt: [219, 234, 254] as [number,number,number],
  gPurple: [124, 58, 237]  as [number,number,number],
  gPurpLt: [237, 233, 254] as [number,number,number],
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
    rows: [string, string, "n"|"g"|"a"|"r"][], accent?: [number,number,number]): number {
    const rowH = 7;
    const h = rowH * rows.length + 10;
    this.rect(x, y, w, h, C.panel, 3);
    this.rect(x, y, w, 9, C.panel2, 3);
    if (accent) {
      this.rect(x, y, 3, h, accent, 2);
    }
    this.line(x, y + 9, x + w, y + 9, C.border);
    this.txt(title.toUpperCase(), x + (accent ? 7 : 4), y + 6,
      { size: 6.5, bold: true, color: C.muted });
    rows.forEach(([lbl, val, sty], i) => {
      const ry = y + 9 + i * rowH;
      if (i > 0) this.line(x, ry, x + w, ry, C.border, 0.2);
      this.txt(lbl, x + (accent ? 7 : 4), ry + 5, { size: 8, color: C.muted });
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

  // ── Segment-Split-Bar ──────────────────────────────────────────────────
  splitBar(y: number, wPct: number, label1: string, label2: string): number {
    const bw = CW, bh = 8;
    this.rect(ML, y, bw, bh, C.wBlueLt, 2);
    this.rect(ML, y, Math.max(4, bw * wPct), bh, C.wBlue, 2);
    this.txt(label1, ML + 4, y + 5.5, { size: 7, bold: true, color: C.white });
    this.txt(label2, ML + bw - 4, y + 5.5,
      { size: 7, bold: true, color: C.gPurple, align: "right" });
    return y + bh + 4;
  }
}

// ── Seiten ──────────────────────────────────────────────────────────────────
function page1(r: R, d: MixedUseReportData) {
  let y = TOP;
  const objName = d.adresse || d.objektBezeichnung ||
    `Mixed-Use ${d.wFl + d.gFl} m²`;
  r.header("Investitionsübersicht", objName);

  const kw = (CW - 15) / 4;
  const decColor: [number,number,number] =
    d.scoreLabel === "BUY" ? C.green :
    d.scoreLabel === "CHECK" ? C.amber : C.red;
  const decDE = d.scoreLabel === "BUY" ? "Kaufen" :
    d.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein";

  r.kpi(ML,           y, kw, 22, "Kaufpreis",      fmtEur(d.kaufpreis),     `NK: ${fmtEur(d.nkSum)}`, "dark");
  r.kpi(ML+kw+5,      y, kw, 22, "NOI-Rendite",    fmtPct(d.noiYield),      `NOI: ${fmtEur(d.noi)}`, "light");
  r.kpi(ML+2*(kw+5),  y, kw, 22, "DSCR",           d.dscr != null ? fmtNum(d.dscr) : "n/a", "Mindest: 1,20", "light",
    d.dscr != null ? (d.dscr >= 1.2 ? C.green : d.dscr >= 1.0 ? C.amber : C.red) : C.muted);
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Cashflow/Monat", fmtEur(d.cashflowMonat), decDE, "light", decColor);
  y += 26;

  // Segment-Split
  const totalFlaeche = d.wFl + d.gFl;
  const wPct = totalFlaeche > 0 ? d.wFl / totalFlaeche : 0.5;
  r.txt(`Fläche: Wohnen ${d.wFl} m² (${fmtPct(wPct, 0)}) / Gewerbe ${d.gFl} m² (${fmtPct(1 - wPct, 0)})`,
    ML, y, { size: 7.5, color: C.muted }); y += 5;
  y = r.splitBar(y,
    Math.max(0.04, Math.min(0.96, wPct)),
    `Wohnen ${d.wFl} m²`,
    `Gewerbe ${d.gFl} m²`);

  const bw = (CW - 6) / 2;
  const wRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Fläche Wohnen",      `${d.wFl} m²`,                   "n"],
    ["Ø Miete/m²",        `${d.wRentM2.toFixed(2)} €/m²`,   "n"],
    ["Bruttomiete p.a.",   fmtEur(d.grossW),                 "n"],
    ["Leerstand",          fmtPct(d.wLeer, 1),                d.wLeer < 0.05 ? "g" : "a"],
    ["NOI Wohnen p.a.",    fmtEur(d.noiW),                   d.noiW > 0 ? "g" : "r"],
    ["Wert (Cap)",         fmtEur(d.wertW),                  "n"],
  ];
  const gRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Fläche Gewerbe",     `${d.gFl} m²`,                   "n"],
    ["Ø Miete/m²",        `${d.gRentM2.toFixed(2)} €/m²`,   "n"],
    ["Bruttomiete p.a.",   fmtEur(d.grossG),                 "n"],
    ["Leerstand",          fmtPct(d.gLeer, 1),                d.gLeer < 0.08 ? "g" : "a"],
    ["NOI Gewerbe p.a.",   fmtEur(d.noiG),                   d.noiG > 0 ? "g" : "r"],
    ["Wert (Cap)",         fmtEur(d.wertG),                  "n"],
  ];
  const pe = r.panel(ML,       y, bw, "Segment Wohnen",  wRows, C.wBlue);
  const pg = r.panel(ML+bw+6,  y, bw, "Segment Gewerbe", gRows, C.gPurple);
  y = Math.max(pe, pg) + 2;

  // Gesamt-Kennzahlen
  r.line(ML, y, ML + CW, y, C.border, 0.4); y += 4;
  r.txt("Gesamt-Kennzahlen".toUpperCase(), ML, y,
    { size: 6.5, bold: true, color: C.muted }); y += 5;

  const kennRows = [
    ["Kaufpreisfaktor",  `${((d.kaufpreis)/(d.grossW+d.grossG)).toFixed(1)}×`,  "Gesamtrendite (NOI)",   fmtPct(d.noiYield)],
    ["Wert aus Cap",     fmtEur(d.wertAusCap),                                  "Wert-Gap",              `${d.valueGap >= 0 ? "+" : ""}${fmtEur(d.valueGap)}`],
    ["DSCR",             d.dscr != null ? fmtNum(d.dscr) : "–",                 "Annuität p.a.",         fmtEur(d.annu)],
    ["Cashflow p.a.",    fmtEur(d.cashflowMonat * 12),                           "Entscheidung",          decDE],
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
    ["Wohnen und Gewerbe ergänzen sich – das Objekt zeigt ein stimmiges Chance-Risiko-Profil.", false],
  ] : d.scoreLabel === "CHECK" ? [
    ["Gesamtbewertung: Weiter prüfen", true],
    [`Cashflow ${fmtEur(d.cashflowMonat)}/Mo liegt im Mittelfeld – Szenarien durchspielen.`, false],
    ["Kaufpreis oder Konditionen nachverhandeln empfohlen.", false],
  ] : [
    ["Gesamtbewertung: Eher Nein", true],
    [`Cashflow ${fmtEur(d.cashflowMonat)}/Mo – das Objekt trägt sich unter aktuellen Annahmen nicht.`, false],
    ["Bessere Konditionen, niedrigerer Kaufpreis oder optimierte Miete nötig.", false],
  ];
  r.fazit(y, fazit1);
}

function page2(r: R, d: MixedUseReportData) {
  let y = TOP;
  r.header("Cashflow-Analyse", "Segmentweiser Monatsbericht");

  const kw = (CW - 15) / 4;
  r.kpi(ML,           y, kw, 22, "Miete Wohnen/Mo",   fmtEur(d.grossW/12),       "Bruttomiete", "light", C.wBlue);
  r.kpi(ML+kw+5,      y, kw, 22, "Miete Gewerbe/Mo",  fmtEur(d.grossG/12),       "Bruttomiete", "light", C.gPurple);
  r.kpi(ML+2*(kw+5),  y, kw, 22, "NOI gesamt/Mo",     fmtEur(d.noi/12),          "nach Opex", "light");
  r.kpi(ML+3*(kw+5),  y, kw, 22, "Cashflow/Monat",    fmtEur(d.cashflowMonat),   "nach Kapitaldienst", "dark",
    d.cashflowMonat >= 0 ? C.green : C.red);
  y += 26;

  y = r.div(y, "Segmentvergleich – Cashflow monatlich");

  const segRows = [
    ["Bruttomiete Wohnen",  fmtEur(d.grossW/12),   fmtPct(d.grossW/(d.grossW+d.grossG), 0), "Segment Wohnen"],
    ["Bruttomiete Gewerbe", fmtEur(d.grossG/12),   fmtPct(d.grossG/(d.grossW+d.grossG), 0), "Segment Gewerbe"],
    ["– Leerstand Wohnen",  fmtEur(-(d.grossW-d.effW)/12), fmtPct(d.wLeer, 1), `${fmtPct(d.wLeer, 0)} Vakanz`],
    ["– Leerstand Gewerbe", fmtEur(-(d.grossG-d.effG)/12), fmtPct(d.gLeer, 1), `${fmtPct(d.gLeer, 0)} Vakanz`],
    ["– Opex Wohnen",       fmtEur(-d.opexW/12),   fmtPct(d.wOpexBrutto, 0), "% der Bruttomiete W"],
    ["– Opex Gewerbe",      fmtEur(-d.opexG/12),   fmtPct(d.gOpexBrutto, 0), "% der Bruttomiete G"],
    ["= NOI gesamt",        fmtEur(d.noi/12),      fmtPct(d.noi/(d.grossW+d.grossG), 0), "Nettoertrag vor Finanzierung"],
    ["– Kapitaldienst",     fmtEur(-d.annu/12),    "", d.financingOn ? `${fmtPct(d.zinsPct)}+${fmtPct(d.tilgungPct)}` : "keine Finanzierung"],
    ["= Cashflow",          fmtEur(d.cashflowMonat), "", "monatlicher Überschuss"],
    ["= Cashflow p.a.",     fmtEur(d.cashflowMonat*12), "", "Jahresperspektive"],
  ];
  y = r.table(y,
    ["Position", "Betrag/Mo", "Anteil", "Anmerkung"],
    segRows, [CW*0.28, CW*0.15, CW*0.10, CW*0.47],
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
    ["Cashflow-Analyse", true],
    [`NOI gesamt ${fmtEur(d.noi/12)}/Mo – nach Kapitaldienst ${fmtEur(d.annu/12)}/Mo verbleibt ${fmtEur(d.cashflowMonat)}/Mo.`, false],
    [`Wohnen trägt ${fmtPct(d.noiW/d.noi, 0)} zum NOI bei, Gewerbe ${fmtPct(d.noiG/d.noi, 0)}.`, false],
    ["Opex-Quoten sind konservativ je Segment angesetzt – Verifizierung mit Bewirtschafter empfohlen.", false],
  ]);
}

function page3(r: R, d: MixedUseReportData) {
  let y = TOP;
  r.header("Segmentanalyse & Wertermittlung", "Wohnen vs. Gewerbe");

  y = r.div(y, "Segment-Kennzahlen im Vergleich");

  const compRows = [
    ["Fläche",             `${d.wFl} m²`,              `${d.gFl} m²`],
    ["Ø Miete/m²",        `${d.wRentM2.toFixed(2)} €`, `${d.gRentM2.toFixed(2)} €`],
    ["Bruttomiete p.a.",   fmtEur(d.grossW),            fmtEur(d.grossG)],
    ["Effektivmiete p.a.", fmtEur(d.effW),              fmtEur(d.effG)],
    ["Leerstand",          fmtPct(d.wLeer, 1),           fmtPct(d.gLeer, 1)],
    ["Opex % Brutto",      fmtPct(d.wOpexBrutto, 0),    fmtPct(d.gOpexBrutto, 0)],
    ["NOI p.a.",           fmtEur(d.noiW),              fmtEur(d.noiG)],
    ["Cap Rate",           fmtPct(d.wCap),              fmtPct(d.gCap)],
    ["Wert aus Cap",       fmtEur(d.wertW),             fmtEur(d.wertG)],
  ];
  y = r.table(y,
    ["Kennzahl", "Wohnen", "Gewerbe"],
    compRows,
    [CW * 0.45, CW * 0.275, CW * 0.275],
    ["l","r","r"]);

  y = r.div(y, "Kapitalstruktur & Wertermittlung");

  const bw = (CW - 6) / 2;
  const totalFlaeche = d.wFl + d.gFl;
  const wPct = totalFlaeche > 0 ? d.wFl / totalFlaeche : 0.5;

  const kapRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Kaufpreis",        fmtEur(d.kaufpreis),          "n"],
    ["Nebenkosten",      `${fmtEur(d.nkSum)} (${fmtPct(d.nkPct, 1)})`, "n"],
    ["All-in",           fmtEur(d.kaufpreis + d.nkSum), "n"],
    ["Eigenkapital",     fmtEur(d.kaufpreis * (1 - d.ltvPct)), "n"],
    ["Darlehen",         fmtEur(d.loan),               "n"],
    ["LTV",              fmtPct(d.ltvPct, 0),           d.ltvPct > 0.8 ? "a" : "n"],
  ];
  const wertRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Wert Wohnen (Cap)", fmtEur(d.wertW),             "n"],
    ["Wert Gewerbe (Cap)",fmtEur(d.wertG),             "n"],
    ["Gesamtwert (Cap)",  fmtEur(d.wertAusCap),         d.wertAusCap >= d.kaufpreis ? "g" : "a"],
    ["Kaufpreis",         fmtEur(d.kaufpreis),          "n"],
    ["Wert-Gap",          `${d.valueGap >= 0 ? "+" : ""}${fmtEur(d.valueGap)}`, d.valueGap >= 0 ? "g" : "r"],
    ["Gap %",             `${d.valueGap >= 0 ? "+" : ""}${fmtPct(d.valueGapPct)}`, d.valueGap >= 0 ? "g" : "r"],
  ];
  r.panel(ML,       y, bw, "Kapitalstruktur", kapRows);
  r.panel(ML+bw+6,  y, bw, "Wertermittlung",  wertRows);
  y += Math.max(kapRows.length * 7 + 14, wertRows.length * 7 + 14) + 6;

  r.fazit(y, [
    ["Segmentanalyse & Wertermittlung", true],
    [`Flächenaufteilung: Wohnen ${fmtPct(wPct, 0)} / Gewerbe ${fmtPct(1-wPct, 0)} der Gesamtfläche.`, false],
    [`Cap-basierter Gesamtwert: ${fmtEur(d.wertAusCap)} – ${d.valueGap >= 0 ? "über" : "unter"} Kaufpreis um ${fmtEur(Math.abs(d.valueGap))}.`, false],
    ["Die Wertermittlung ist ein Modellwert – Marktgutachten und Lageanalyse sind ergänzend einzuholen.", false],
  ]);
}

function page4(r: R, d: MixedUseReportData) {
  let y = TOP;
  r.header("Break-even & Stresstest", "Risikoanalyse");

  y = r.div(y, "Break-even-Analyse");

  const bw = (CW - 6) / 2;
  const beRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["Break-even Kaufpreis",     d.bePrice ? fmtEur(d.bePrice) : "–",        "n"],
    ["Aktueller Kaufpreis",      fmtEur(d.kaufpreis),                         d.bePrice && d.kaufpreis < d.bePrice ? "g" : "a"],
    ["Break-even Mietfaktor",    `${(d.beRentK * 100).toFixed(0)} %`,         d.beRentK <= 1 ? "g" : "a"],
    ["Miete Wohnen aktuell",     `${d.wRentM2.toFixed(2)} €/m²`,              "n"],
    ["Break-even Wohnen",        `${(d.wRentM2 * d.beRentK).toFixed(2)} €/m²`, d.beRentK <= 1 ? "g" : "r"],
    ["Break-even Gewerbe",       `${(d.gRentM2 * d.beRentK).toFixed(2)} €/m²`, d.beRentK <= 1 ? "g" : "r"],
  ];

  // DSCR-Stress
  const stressRows: [string, string, "n"|"g"|"a"|"r"][] = [
    ["DSCR aktuell",             d.dscr != null ? fmtNum(d.dscr) : "–",      d.dscr != null && d.dscr >= 1.2 ? "g" : d.dscr != null && d.dscr >= 1.0 ? "a" : "r"],
    ["DSCR bei –10% Miete",     (() => {
      const noi = d.noi * 0.9;
      return d.annu > 0 ? fmtNum(noi/d.annu) : "–";
    })(),                                                                      (() => {
      const v = d.annu > 0 ? d.noi * 0.9 / d.annu : 0;
      return v >= 1.2 ? "g" as const : v >= 1.0 ? "a" as const : "r" as const;
    })()],
    ["DSCR bei +2% Zins",       (() => {
      const ann2 = d.loan * (d.zinsPct + 0.02 + d.tilgungPct);
      return ann2 > 0 ? fmtNum(d.noi/ann2) : "–";
    })(),                                                                      (() => {
      const ann2 = d.loan * (d.zinsPct + 0.02 + d.tilgungPct);
      const v = ann2 > 0 ? d.noi/ann2 : 0;
      return v >= 1.2 ? "g" as const : v >= 1.0 ? "a" as const : "r" as const;
    })()],
    ["LTV",                      fmtPct(d.ltvPct, 0),                         d.ltvPct > 0.8 ? "a" : "n"],
    ["Zinsbindungsrisiko",        "Bei Prolongation beachten",                  "a"],
    ["Entscheidung",             d.scoreLabel === "BUY" ? "Kaufen" : d.scoreLabel === "CHECK" ? "Weiter prüfen" : "Eher Nein",
                                                                               d.scoreLabel === "BUY" ? "g" : d.scoreLabel === "CHECK" ? "a" : "r"],
  ];

  r.panel(ML,       y, bw, "Break-even-Analyse",  beRows);
  r.panel(ML+bw+6,  y, bw, "Stresstest",          stressRows);
  y += Math.max(beRows.length * 7 + 14, stressRows.length * 7 + 14) + 6;

  y = r.div(y, "10-Jahres-Cashflow-Projektion (2% Wohn-, 1.5% Gewerbemietsteigerung)");

  const projRows = d.projection.map(p => [
    `Jahr ${p.year}`,
    fmtEur(p.Cashflow / 12),
    fmtEur(p.Cashflow),
    fmtEur(p.Tilgung),
    fmtEur(p.Vermoegen),
  ]);
  y = r.table(y,
    ["Jahr", "CF/Monat", "CF p.a.", "Tilgung p.a.", "Vermögensaufbau"],
    projRows,
    [CW*0.12, CW*0.22, CW*0.22, CW*0.22, CW*0.22],
    ["l","r","r","r","r"]);

  r.fazit(y, [
    ["Break-even & Projektion", true],
    [`Break-even Mietfaktor: ${(d.beRentK * 100).toFixed(0)} % – ${d.beRentK <= 1.0 ? "aktuell bereits positiv" : "Miete muss steigen"}.`, false],
    ["DSCR bei +2% Zinsen und –10% Miete ist zu prüfen – Stressszenarien zeigen Risikopuffer.", false],
    ["Projektion zeigt Vermögensaufbau durch Tilgung und angenommene Wertsteigerung von 2% p.a.", false],
  ]);
}

// ── Hauptfunktion ────────────────────────────────────────────────────────────
export function generateMixedUsePdf(data: MixedUseReportData): void {
  const investor = data.investorName || "Propora-Nutzer";
  const TOTAL = 4;
  const r = new R(investor);

  [page1, page2, page3, page4].forEach((fn, i) => {
    if (i > 0) r.doc.addPage();
    fn(r, data);
  });

  const n = r.doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    r.doc.setPage(i);
    r.footer(i, TOTAL);
  }

  const today = new Date().toISOString().slice(0, 10);
  r.doc.save(`propora_mixeduse_${today}.pdf`);
}
