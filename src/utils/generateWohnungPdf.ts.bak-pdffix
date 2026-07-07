/**
 * Propora – Wohnungs-Rendite Bankgespräch-Report
 * Erzeugt ein mehrseitiges PDF direkt im Browser via jsPDF
 * Einbinden: import { generateWohnungPdf } from "../utils/generateWohnungPdf";
 */

import jsPDF from "jspdf";
import { PROPORA_LOGO_B64 } from "./propLogo";

// ── Typen ─────────────────────────────────────────────────────────────────────
export interface WohnungReportData {
  // Meta
  investorName?: string;
  objektBezeichnung?: string;
  adresse?: string;
  // Objekt
  kaufpreis: number;
  flaecheM2: number;
  mieteProM2Monat: number;
  leerstandPct: number;
  opexPctBrutto: number;
  // Nebenkosten
  nkGrEStPct: number;
  nkNotarPct: number;
  nkGrundbuchPct: number;
  nkMaklerPct: number;
  nkSonstPct: number;
  nkRenovierung: number;
  nkSanierung: number;
  // Finanzierung
  financingOn: boolean;
  ltvPct: number;
  zinsPct: number;
  tilgungPct: number;
  // Berechnete Werte (direkt aus dem Analyzer übergeben)
  allIn: number;
  noi: number;
  annuitaetJahr: number;
  annuitaetMonat: number;
  monthlyCF: number;
  noiYield: number;
  dscr: number;
  loan: number;
  scorePct: number;
  decisionLabel: "RENTABEL" | "GRENZWERTIG" | "NICHT_RENTABEL";
  decisionText: string;
  bePrice: number | null;
  beRentPerM2: number | null;
  projection: { year: number; noi: number; cf: number }[];
}

// ── Farben ────────────────────────────────────────────────────────────────────
const C = {
  black:    [17,  17,  17]  as [number,number,number],
  dark:     [26,  26,  26]  as [number,number,number],
  dark2:    [40,  40,  40]  as [number,number,number],
  yellow:   [245, 200, 66]  as [number,number,number],
  yellowLt: [255, 251, 220] as [number,number,number],
  panel:    [245, 245, 243] as [number,number,number],
  panel2:   [234, 234, 232] as [number,number,number],
  white:    [255, 255, 255] as [number,number,number],
  border:   [216, 216, 213] as [number,number,number],
  green:    [26,  102, 41]  as [number,number,number],
  greenLt:  [226, 240, 229] as [number,number,number],
  amber:    [143, 77,  0]   as [number,number,number],
  amberLt:  [254, 240, 204] as [number,number,number],
  red:      [170, 28,  28]  as [number,number,number],
  redLt:    [253, 236, 236] as [number,number,number],
  muted:    [119, 119, 114] as [number,number,number],
  light:    [170, 170, 170] as [number,number,number],
};

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────
const eur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const pct = (v: number, dec = 1) => `${(v * 100).toFixed(dec)} %`;

const fmt = (v: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(v) + " €";

// ── Layout-Konstanten ─────────────────────────────────────────────────────────
const PW   = 210;   // A4 Breite mm
const PH   = 297;   // A4 Höhe mm
const ML   = 14;    // linker Rand
const MR   = 14;    // rechter Rand
const CW   = PW - ML - MR;  // 182mm Nutzbreite
const HEAD = 26;    // Header-Höhe
const FOOT = 12;    // Footer-Höhe
const TOP  = HEAD + 6; // Inhalt beginnt ab hier

// ── Klasse für den Report ─────────────────────────────────────────────────────
class PReport {
  private doc: jsPDF;
  private page = 0;
  private pages: { title: string; subtitle: string }[] = [];
  private investor: string;

  constructor(investor: string) {
    this.doc      = new jsPDF({ unit: "mm", format: "a4" });
    this.investor = investor;
  }

  // ── Zeichenwerkzeuge ─────────────────────────────────────────────────────
  private rgb(c: [number,number,number]) { return { r: c[0], g: c[1], b: c[2] }; }

  private rect(x: number, y: number, w: number, h: number, fill: [number,number,number], stroke?: [number,number,number], r = 0) {
    this.doc.setFillColor(...fill);
    if (stroke) {
      this.doc.setDrawColor(...stroke);
      this.doc.setLineWidth(0.2);
    }
    if (r > 0) {
      this.doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
    } else {
      this.doc.rect(x, y, w, h, stroke ? "FD" : "F");
    }
  }

  private text(t: string, x: number, y: number, opts: {
    size?: number; bold?: boolean; color?: [number,number,number];
    align?: "left"|"right"|"center"; maxW?: number;
  } = {}) {
    const { size = 9, bold = false, color = C.black, align = "left", maxW } = opts;
    this.doc.setFontSize(size);
    this.doc.setFont("helvetica", bold ? "bold" : "normal");
    this.doc.setTextColor(...color);
    const xPos = align === "right" ? x : align === "center" ? x : x;
    if (maxW) {
      this.doc.text(t, xPos, y, { align, maxWidth: maxW });
    } else {
      this.doc.text(t, xPos, y, { align });
    }
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: [number,number,number] = C.border, lw = 0.3) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(lw);
    this.doc.line(x1, y1, x2, y2);
  }

  // ── Header & Footer ───────────────────────────────────────────────────────
  private drawHeader(title: string, subtitle: string) {
    this.rect(0, 0, PW, HEAD, C.dark);
    // Gelbe Trennlinie unten
      this.rect(0, HEAD - 1.5, PW, 1.5, C.yellow);
    // Logo
      try {
        this.doc.addImage(PROPORA_LOGO_B64, "PNG", ML, 5, 26, 8);
      } catch {
        this.text("PROPORA", ML, 11, { size: 10, bold: true, color: C.yellow });
      }
      this.text("Investitionsanalyse", ML + 30, 11, { size: 8, color: C.light });
    // Seitentitel
    this.text(title, ML, 19, { size: 11, bold: true, color: C.white });
    this.text(subtitle, ML, 24, { size: 8, color: [160, 160, 160] });
    // Rechts
    this.text(this.investor, PW - MR, 11, { size: 8, color: C.light, align: "right" });
    this.text(new Date().toLocaleDateString("de-DE"), PW - MR, 19, { size: 8, color: C.light, align: "right" });
  }

  private drawFooter(pageNum: number, total: number) {
    this.line(ML, PH - FOOT + 1, PW - MR, PH - FOOT + 1);
    this.text("PROPORA PRO  ·  Vertraulich – ausschließlich für den adressierten Kreditgeber",
      ML, PH - FOOT + 5, { size: 7, color: C.light });
    this.text(`Seite ${pageNum} von ${total}`, PW - MR, PH - FOOT + 5,
      { size: 7, color: C.light, align: "right" });
    // Gelber Punkt
    this.doc.setFillColor(...C.yellow);
    this.doc.circle(PW - MR - 22, PH - FOOT + 4.5, 1.2, "F");
  }

  // ── Neue Seite ────────────────────────────────────────────────────────────
  newPage(title: string, subtitle: string) {
    if (this.page > 0) this.doc.addPage();
    this.page++;
    this.pages.push({ title, subtitle });
    this.drawHeader(title, subtitle);
  }

  // ── Seitenabschluss ───────────────────────────────────────────────────────
  finalizePages(total: number) {
    const n = this.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      this.doc.setPage(i);
      this.drawFooter(i, total);
    }
  }

  // ── KPI-Kachel ────────────────────────────────────────────────────────────
  kpiTile(x: number, y: number, w: number, h: number, label: string, value: string, sub: string,
    mode: "dark"|"light" = "light", valColor?: [number,number,number]) {
    const bg  = mode === "dark" ? C.dark : C.panel;
    const bar = C.yellow;
    const lc  = mode === "dark" ? C.light : C.muted;
    const vc  = valColor || (mode === "dark" ? C.yellow : C.black);

    this.rect(x, y, w, h, bg, undefined, 3);
    this.rect(x, y, w, 2, bar, undefined, 2);
    this.text(label.toUpperCase(), x + 4, y + 7, { size: 6.5, color: lc });
    this.text(value, x + 4, y + 17, { size: 16, bold: true, color: vc });
    this.text(sub, x + 4, y + h - 3, { size: 7, color: lc });
  }

  // ── Section-Divider ───────────────────────────────────────────────────────
  sectionDiv(y: number, label: string): number {
    this.rect(ML, y, CW, 8, C.dark, undefined, 2);
    this.rect(ML, y, 2.5, 8, C.yellow);
    this.text(label.toUpperCase(), ML + 6, y + 5.5, { size: 7, bold: true, color: C.yellow });
    return y + 11;
  }

  // ── Info-Panel (2-spaltig) ────────────────────────────────────────────────
  infoPanel(x: number, y: number, w: number, title: string,
    rows: [string, string, "normal"|"green"|"amber"|"red"][]): number {
    const rowH = 7;
    const totalH = rowH * rows.length + 10;
    // Hintergrund
    this.rect(x, y, w, totalH, C.panel, C.border, 2);
    this.rect(x, y, w, 9, C.panel2, undefined, 2);
    // Titel
    this.text(title.toUpperCase(), x + 4, y + 6, { size: 6.5, bold: true, color: C.muted });
    // Trennlinie nach Titel
    this.line(x, y + 9, x + w, y + 9, C.border);

    rows.forEach(([label, value, style], i) => {
      const ry = y + 9 + i * rowH;
      if (i > 0) this.line(x, ry, x + w, ry, C.border, 0.2);
      this.text(label, x + 4, ry + 5, { size: 8, color: C.muted });
      const vc = style === "green" ? C.green : style === "amber" ? C.amber : style === "red" ? C.red : C.black;
      this.text(value, x + w - 4, ry + 5, { size: 8, bold: true, color: vc, align: "right" });
    });
    return y + totalH + 4;
  }

  // ── Dunkle Tabelle ─────────────────────────────────────────────────────────
  darkTable(y: number, headers: string[], rows: string[][], colWidths: number[],
    colAligns: ("left"|"right")[] = []): number {
    const rowH  = 7;
    const headH = 8;
    const totalH = headH + rows.length * rowH;
    let x = ML;

    // Header
    this.rect(ML, y, CW, headH, C.dark, undefined, 2);
    headers.forEach((h, i) => {
      const align = colAligns[i] || "left";
      const cx = align === "right" ? x + colWidths[i] - 3 : x + 3;
      this.text(h, cx, y + 5.5, { size: 7.5, bold: true, color: C.white, align });
      x += colWidths[i];
    });

    // Zeilen
    rows.forEach((row, ri) => {
      const ry = y + headH + ri * rowH;
      const bg = ri % 2 === 0 ? C.panel : C.white;
      this.rect(ML, ry, CW, rowH, bg);
      this.line(ML, ry, ML + CW, ry, C.border, 0.2);
      let rx = ML;
      row.forEach((cell, ci) => {
        const align = colAligns[ci] || "left";
        const cx = align === "right" ? rx + colWidths[ci] - 3 : rx + 3;
        this.text(cell, cx, ry + 4.5, { size: 8, align });
        rx += colWidths[ci];
      });
    });

    // Rahmen
    this.doc.setDrawColor(...C.border);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(ML, y, CW, totalH, 2, 2, "S");

    return y + totalH + 4;
  }

  // ── DSCR-Balken ───────────────────────────────────────────────────────────
  dscrBar(y: number, value: number): number {
    const bh = 5; const by = y + 4;
    this.rect(ML, by, CW, bh, C.panel2, undefined, 2);
    const pct_ = Math.min(Math.max((value - 1.0) / 1.0, 0), 1);
    const fw   = Math.max(8, CW * pct_);
    const fc   = value >= 1.2 ? C.green : value >= 1.0 ? C.amber : C.red;
    this.rect(ML, by, fw, bh, fc, undefined, 2);
    // Labels
    const marks: [number, string][] = [[0.0,"1,0"],[0.2,"1,2"],[0.5,"1,5"],[1.0,"2,0"]];
    marks.forEach(([p, lbl]) => {
      this.text(lbl, ML + CW * p, by + bh + 4, { size: 6, color: C.muted, align: "center" });
    });
    return y + 18;
  }

  // ── Fazit-Box ─────────────────────────────────────────────────────────────
  fazitBox(y: number, lines: [string, boolean][]): number {
    const h = lines.length * 5.5 + 8;
    this.rect(ML, y, CW, h, C.yellowLt, [232, 208, 96] as any, 2);
    this.rect(ML, y, 2.5, h, C.yellow);
    let ty = y + 7;
    lines.forEach(([txt, bold]) => {
      this.text(txt, ML + 6, ty, { size: 8, bold, color: [58, 48, 0] });
      ty += 5.5;
    });
    return y + h + 4;
  }

  // ── Getter ────────────────────────────────────────────────────────────────
  getPdf() { return this.doc; }
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────
export function generateWohnungPdf(data: WohnungReportData): void {
  const d = data;
  const investor = d.investorName || "Propora-Nutzer";
  const objName  = d.adresse || d.objektBezeichnung || `Eigentumswohnung ${d.flaecheM2.toFixed(0)} m²`;

  // Berechnungen
  const nkPct   = d.nkGrEStPct + d.nkNotarPct + d.nkGrundbuchPct + d.nkMaklerPct + d.nkSonstPct;
  const nkSum   = d.kaufpreis * nkPct + d.nkRenovierung + d.nkSanierung;
  const grossRY = d.flaecheM2 * d.mieteProM2Monat * 12;
  const ekEins  = d.allIn - d.loan;
  const faktor  = grossRY > 0 ? d.allIn / grossRY : 0;
  const bRend   = d.allIn > 0 ? grossRY / d.allIn : 0;
  const dscrVal = Number.isFinite(d.dscr) ? d.dscr : 0;
  const beRent  = d.flaecheM2 > 0
    ? (d.annuitaetMonat + (grossRY * d.opexPctBrutto / 12)) / (d.flaecheM2 * (1 - d.leerstandPct))
    : 0;

  const dec = d.decisionLabel;
  const decDE = dec === "RENTABEL" ? "Rentabel" : dec === "GRENZWERTIG" ? "Grenzwertig" : "Nicht rentabel";
  const decColor: "green"|"amber"|"red" = dec === "RENTABEL" ? "green" : dec === "GRENZWERTIG" ? "amber" : "red";

  const TOTAL_PAGES = 4;
  const r = new PReport(investor);

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 1 – Investitionsübersicht
  // ═══════════════════════════════════════════════════════════════════════════
  r.newPage("Investitionsübersicht", objName);
  let y = TOP;

  // 4 KPI-Kacheln
  const kw = (182 - 3 * 3) / 4;
  r.kpiTile(ML,              y, kw, 22, "Kaufpreis",         fmt(d.kaufpreis),       `Faktor ${faktor.toFixed(1)}×`, "dark");
  r.kpiTile(ML + kw + 3,     y, kw, 22, "NOI-Rendite",       pct(d.noiYield),        `Brutto: ${pct(bRend)}`,       "light");
  r.kpiTile(ML + 2*(kw+3),   y, kw, 22, "DSCR",              dscrVal.toFixed(2),     "Mindest: 1,20",               "light",
    dscrVal >= 1.2 ? [26,102,41] : dscrVal >= 1.0 ? [143,77,0] : [170,28,28]);
  r.kpiTile(ML + 3*(kw+3),   y, kw, 22, "Cashflow / Monat",  fmt(d.monthlyCF),       decDE,                         "light",
    d.monthlyCF >= 0 ? [26,102,41] : [170,28,28]);
  y += 26;

  // Trennlinie
  r["line"](ML, y, ML + 182, y, [216,216,213] as any, 0.4);
  y += 5;

  // Objekt + Finanzierung nebeneinander
  const bw = (182 - 6) / 2;
  const objRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Fläche",        `${d.flaecheM2.toFixed(0)} m²`,                                 "normal"],
    ["Miete/m²",      `${d.mieteProM2Monat.toFixed(2)} €/m²`,                         "normal"],
    ["Kaltmiete p.a.", fmt(grossRY),                                                   "normal"],
    ["Leerstand",     pct(d.leerstandPct, 1),                                          "normal"],
    ["Nebenkosten",   `${fmt(nkSum)} (${pct(nkPct, 1)})`,                              "normal"],
  ];
  const finRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Eigenkapital",  `${fmt(ekEins)} (${pct(1 - d.ltvPct, 0)})`,                    "normal"],
    ["Darlehen",      fmt(d.loan),                                                     "normal"],
    ["Zinssatz",      pct(d.zinsPct),                                                  "normal"],
    ["Tilgung",       pct(d.tilgungPct),                                               "normal"],
    ["Annuität/Mo",   fmt(d.annuitaetMonat),                                           "normal"],
  ];
  const panelEndL = r.infoPanel(ML,       y, bw, "Objekt",       objRows);
  const panelEndR = r.infoPanel(ML+bw+6, y, bw, "Finanzierung", finRows);
  y = Math.max(panelEndL, panelEndR) + 2;

  // Kennzahlen-Übersicht
  r["line"](ML, y, ML + 182, y, [216,216,213] as any, 0.4);
  y += 4;
  r["text"]("Investitions-Kennzahlen im Überblick".toUpperCase(), ML, y, { size: 6.5, bold: true, color: [119,119,114] });
  y += 5;

  const kennRows = [
    ["Kaufpreisfaktor", `${faktor.toFixed(1)}×`,   "Bruttomietrendite",  pct(bRend)],
    ["NOI-Rendite",     pct(d.noiYield),            "NOI p.a.",           fmt(d.noi)],
    ["LTV",             pct(d.ltvPct, 0),           "Eigenkapital",       fmt(ekEins)],
    ["Annuität p.a.",   fmt(d.annuitaetJahr),       "Cashflow p.a.",      fmt(d.monthlyCF * 12)],
    ["DSCR",            dscrVal.toFixed(2),         "Entscheidung",       decDE],
  ];
  const col1 = 50, col2 = 25, col3 = 50, col4 = 57;
  kennRows.forEach((row, i) => {
    const ry = y + i * 7;
    const bg = i % 2 === 0 ? [245,245,243] as [number,number,number] : [255,255,255] as [number,number,number];
    r["rect"](ML, ry, 182, 7, bg);
    r["text"](row[0], ML + 3, ry + 4.8, { size: 8, color: [119,119,114] });
    r["text"](row[1], ML + col1 - 3, ry + 4.8, { size: 8, bold: true, color: [17,17,17], align: "right" });
    r["text"](row[2], ML + col1 + 3, ry + 4.8, { size: 8, color: [119,119,114] });
    r["text"](row[3], ML + col1 + col2 + col3 - 3, ry + 4.8, { size: 8, bold: true, color: [17,17,17], align: "right" });
  });
  y += kennRows.length * 7 + 4;

  // Fazit Seite 1
  const fazit1: [string, boolean][] = dec === "RENTABEL" ? [
    [`Gesamtbewertung: Rentabel`, true] as [string, boolean],
    [`Die Wohnung erwirtschaftet ${fmt(d.monthlyCF)}/Monat Cashflow bei ${pct(d.noiYield)} NOI-Rendite.`, false],
    [`Der DSCR von ${dscrVal.toFixed(2)} übertrifft die Mindestanforderung von 1,20 komfortabel.`, false],
    ["Die Kennzahlen sprechen für eine wirtschaftlich tragfähige Investition.", false],
  ] : dec === "GRENZWERTIG" ? [
    [`Gesamtbewertung: Grenzwertig`, true] as [string, boolean],
    [`Die Wohnung liegt mit ${fmt(d.monthlyCF)}/Monat Cashflow an der Rentabilitätsgrenze.`, false],
    ["Kaufpreisverhandlung oder Mieterhöhung würden die Kennzahlen deutlich verbessern.", false],
    ["Das Engagement ist unter Vorbehalt darstellbar – Risikopuffer einplanen.", false],
  ] : [
    [`Gesamtbewertung: Nicht rentabel`, true] as [string, boolean],
    [`Der negative Cashflow von ${fmt(d.monthlyCF)}/Monat zeigt: Die Wohnung trägt sich aktuell nicht.`, false],
    ["Break-even erfordert entweder eine höhere Miete oder einen niedrigeren Kaufpreis.", false],
    ["Finanzierung und Eigenkapitalquote sollten neu strukturiert werden.", false],
  ];
  r.fazitBox(y, fazit1);

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 2 – Cashflow-Analyse
  // ═══════════════════════════════════════════════════════════════════════════
  r.newPage("Cashflow-Analyse", "Monatliche Ertragsrechnung");
  y = TOP;

  // 4 KPI-Kacheln
  r.kpiTile(ML,            y, kw, 22, "Kaltmiete / Mo",   fmt(grossRY/12),              "Bruttomieteinnahmen", "light");
  r.kpiTile(ML+kw+3,       y, kw, 22, "Bewirtschaftung",  fmt(grossRY*d.opexPctBrutto/12),"pro Monat",         "light");
  r.kpiTile(ML+2*(kw+3),   y, kw, 22, "NOI / Monat",      fmt(d.noi/12),               "nach Bewirtschaftung","light");
  r.kpiTile(ML+3*(kw+3),   y, kw, 22, "Cashflow / Monat", fmt(d.monthlyCF),            "nach Kapitaldienst",  "dark",
    d.monthlyCF >= 0 ? [26,102,41] : [170,28,28]);
  y += 26;

  y = r.sectionDiv(y, "Cashflow-Aufschlüsselung (monatlich)");

  const cfHeaders = ["Position", "Betrag/Mo", "Anteil", "Anmerkung"];
  const cfWidths  = [54, 28, 20, 80];
  const cfAligns: ("left"|"right")[] = ["left","right","right","left"];
  const cfRows = [
    ["Kaltmiete",            fmt(grossRY/12),              "100,0 %", "Bruttomieteinnahmen"],
    ["– Leerstandsverlust",  fmt(-grossRY/12*d.leerstandPct), pct(d.leerstandPct,1), `${(d.leerstandPct*100).toFixed(1)} % Risikopuffer`],
    ["– Nicht-uml. Kosten",  fmt(-grossRY*d.opexPctBrutto/12), pct(d.opexPctBrutto,0), "Verwaltung, Instandhaltung"],
    ["= NOI",                fmt(d.noi/12),               pct(d.noi/grossRY,0), "Nettoertrag vor Finanzierung"],
    ["– Zinsen",             fmt(-(d.loan*d.zinsPct/12)),  "",        pct(d.zinsPct)+" p.a."],
    ["– Tilgung",            fmt(-(d.loan*d.tilgungPct/12)),"",       pct(d.tilgungPct)+" p.a."],
    ["= Cashflow",           fmt(d.monthlyCF),            "",        "monatlicher Überschuss"],
    ["= Cashflow (jährl.)",  fmt(d.monthlyCF*12),         "",        "Liquiditätspuffer pro Jahr"],
  ];
  y = r.darkTable(y, cfHeaders, cfRows, cfWidths, cfAligns);

  y = r.sectionDiv(y, "DSCR – Debt Service Coverage Ratio");

  // DSCR KPI + Balken
  r.kpiTile(ML, y, 36, 20, "DSCR-Wert", dscrVal.toFixed(2), "NOI ÷ Kapitaldienst", "dark",
    dscrVal >= 1.2 ? [245,200,66] : dscrVal >= 1.0 ? [245,200,66] : [245,200,66]);

  const dscrBadgeColor = dscrVal >= 1.2 ? [26,102,41] : dscrVal >= 1.0 ? [143,77,0] : [170,28,28];
  const dscrBadgeBg   = dscrVal >= 1.2 ? C.greenLt : dscrVal >= 1.0 ? C.amberLt : C.redLt;
  const dscrBadgeTxt  = dscrVal >= 1.2 ? "Ausreichend gedeckt" : dscrVal >= 1.0 ? "Grenzwertig" : "Kritisch";

  r["rect"](ML + 40, y + 2, 100, 5, C.panel2, undefined, 2);
  const dscrFill = Math.min(Math.max((dscrVal - 1.0) / 1.0, 0), 1);
  r["rect"](ML + 40, y + 2, Math.max(6, 100 * dscrFill), 5, dscrBadgeColor as any, undefined, 2);

  const marks2: [number, string][] = [[0,"1,0"],[0.2,"1,2"],[0.5,"1,5"],[1.0,"2,0"]];
  marks2.forEach(([p, lbl]) => {
    r["text"](lbl, ML + 40 + 100*p, y + 11, { size: 6, color: C.muted, align: "center" });
  });

  r["rect"](ML + 144, y + 3, 32, 8, dscrBadgeBg as any, undefined, 2);
  r["text"](dscrBadgeTxt, ML + 160, y + 8.5, { size: 7.5, bold: true, color: dscrBadgeColor as any, align: "center" });
  y += 22;

  r.fazitBox(y, [
    ["Cashflow-Analyse", true],
    [`Der monatliche NOI beträgt ${fmt(d.noi/12)} – nach Abzug des Kapitaldienstes (${fmt(d.annuitaetMonat)}/Mo)`, false],
    [`verbleibt ein Cashflow von ${fmt(d.monthlyCF)}/Monat. Bewirtschaftungsquote ${pct(d.opexPctBrutto,0)} – konservativ angesetzt.`, false],
    ["Dieser Puffer deckt unerwartete Instandhaltungskosten ab.", false],
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 3 – Rendite & Break-even
  // ═══════════════════════════════════════════════════════════════════════════
  r.newPage("Rendite & Break-even", "Rendite- und Kapitalstruktur");
  y = TOP;

  y = r.sectionDiv(y, "Kapitalstruktur & Renditekennzahlen");

  const rendRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Bruttomietrendite",    pct(bRend),               "normal"],
    ["NOI-Rendite (netto)",  pct(d.noiYield),          d.noiYield >= 0.05 ? "green" : "amber"],
    ["Kaufpreisfaktor",      `${faktor.toFixed(1)}×`,  "normal"],
    ["All-in Kaufpreis",     fmt(d.allIn),             "normal"],
    ["Nebenkosten",          fmt(nkSum),               "normal"],
  ];
  const kapRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Eigenkapital",  fmt(ekEins),            "normal"],
    ["Fremdkapital",  fmt(d.loan),            "normal"],
    ["LTV",           pct(d.ltvPct, 0),       d.ltvPct > 0.8 ? "amber" : "normal"],
    ["Annuität p.a.", fmt(d.annuitaetJahr),   "normal"],
    ["Cashflow p.a.", fmt(d.monthlyCF * 12),  d.monthlyCF >= 0 ? "green" : "red"],
  ];
  const panelEnd2L = r.infoPanel(ML,       y, bw, "Renditekennzahlen", rendRows);
  const panelEnd2R = r.infoPanel(ML+bw+6,  y, bw, "Kapitalstruktur",  kapRows);
  y = Math.max(panelEnd2L, panelEnd2R) + 2;

  y = r.sectionDiv(y, "Break-even-Analyse");

  const beRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Mindestmiete (CF = 0)",  `${beRent.toFixed(2)} €/m²`,         "normal"],
    ["Aktuelle Ist-Miete",     `${d.mieteProM2Monat.toFixed(2)} €/m²`, d.mieteProM2Monat > beRent ? "green" : "red"],
    ["Puffer",                 `${(d.mieteProM2Monat - beRent).toFixed(2)} €/m²`, d.mieteProM2Monat > beRent ? "green" : "red"],
    ["Break-even Kaufpreis",   d.bePrice ? fmt(d.bePrice) : "–",     "normal"],
    ["Aktueller Kaufpreis",    fmt(d.kaufpreis),                      d.bePrice && d.kaufpreis < d.bePrice ? "green" : "amber"],
  ];
  const proj = d.projection;
  const projRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["NOI Jahr 1",  proj[0] ? fmt(proj[0].noi) : "–",  "normal"],
    ["NOI Jahr 5",  proj[4] ? fmt(proj[4].noi) : "–",  "normal"],
    ["NOI Jahr 10", proj[9] ? fmt(proj[9].noi) : "–",  "green"],
    ["CF Jahr 1",   proj[0] ? fmt(proj[0].cf)  : "–",  proj[0]?.cf >= 0 ? "green" : "red"],
    ["CF Jahr 10",  proj[9] ? fmt(proj[9].cf)  : "–",  proj[9]?.cf >= 0 ? "green" : "red"],
  ];
  const panelEnd3L = r.infoPanel(ML,      y, bw, "Break-even",                       beRows);
  const panelEnd3R = r.infoPanel(ML+bw+6, y, bw, "10J-Projektion (1% Mietsteigerung)", projRows);
  y = Math.max(panelEnd3L, panelEnd3R) + 2;

  r.fazitBox(y, [
    ["Rendite- & Break-even-Bewertung", true],
    [`NOI-Rendite: ${pct(d.noiYield)} – ${d.noiYield >= 0.05 ? "über" : "unter"} dem Zielkorridor von 5,0 %.`, false],
    [`Mindestmiete für Break-even: ${beRent.toFixed(2)} €/m² – aktuell ${d.mieteProM2Monat > beRent ? "überschritten" : "unterschritten"}.`, false],
    ["Die 10-Jahres-Projektion zeigt positive Ertragsentwicklung bei angenommener Mietsteigerung.", false],
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 4 – Stresstest
  // ═══════════════════════════════════════════════════════════════════════════
  r.newPage("Stresstest & Sensitivität", "Risikoanalyse");
  y = TOP;

  y = r.sectionDiv(y, "DSCR-Sensitivitätsmatrix – Zins × Mietentwicklung");

  // Matrix berechnen
  const zins_list   = [0.03, 0.035, d.zinsPct, 0.05, 0.06];
  const zins_labels = ["3,0 %", "3,5 %", `Basis ${pct(d.zinsPct)}`, "5,0 %", "6,0 %"];
  const mult_list   = [0.85, 0.90, 1.0, 1.05, 1.15];
  const mult_labels = ["–15 %", "–10 %", "Basis", "+5 %", "+15 %"];

  const calcDscr = (z: number, mm: number) => {
    const rentY = d.flaecheM2 * d.mieteProM2Monat * mm * 12 * (1 - d.leerstandPct);
    const opexY = d.flaecheM2 * d.mieteProM2Monat * 12 * d.opexPctBrutto;
    const noi_  = Math.max(0, rentY - opexY);
    const ann_  = d.loan * (z + d.tilgungPct);
    return ann_ > 0 ? noi_ / ann_ : 99;
  };

  // Tabellen-Header
  const matCW  = 182 / 6;
  const matRH  = 8;

  // Header-Zeile
  const matHeaderY = y;
  r["rect"](ML, matHeaderY, 182, matRH, C.dark, undefined, 2);
  r["text"]("Zins / Miete", ML + 3, matHeaderY + 5.5, { size: 7.5, bold: true, color: C.white });
  mult_labels.forEach((lbl, mi) => {
    r["text"](lbl, ML + matCW * (1.5 + mi), matHeaderY + 5.5,
      { size: 7.5, bold: true, color: C.white, align: "center" });
  });
  y += matRH;

  // Matrix-Zeilen
  zins_list.forEach((z, zi) => {
    const ry  = y + zi * matRH;
    const isBase = Math.abs(z - d.zinsPct) < 0.001;
    const bg  = isBase ? C.panel2 : zi % 2 === 0 ? C.panel : C.white;
    r["rect"](ML, ry, 182, matRH, bg);
    r["line"](ML, ry, ML + 182, ry, C.border, 0.2);
    r["text"](zins_labels[zi], ML + 3, ry + 5.5,
      { size: 7.5, bold: isBase, color: C.black });

    mult_list.forEach((mm, mi) => {
      const v    = calcDscr(z, mm);
      const cx   = ML + matCW * (1.5 + mi);
      const isBaseCell = isBase && Math.abs(mm - 1.0) < 0.001;
      if (isBaseCell) {
        r["rect"](cx - matCW/2, ry, matCW, matRH, C.yellow);
      }
      const fc = v >= 1.2 ? C.green : v >= 1.0 ? C.amber : C.red;
      r["text"](v < 99 ? v.toFixed(2) : "–", cx, ry + 5.5,
        { size: 8, bold: true, color: isBaseCell ? C.black : fc, align: "center" });
    });
  });

  // Rahmen
  r["doc"]["setDrawColor"](...C.border);
  r["doc"]["setLineWidth"](0.3);
  r["doc"]["roundedRect"](ML, matHeaderY, 182, matRH + zins_list.length * matRH, 2, 2, "S");
  y += zins_list.length * matRH + 6;

  r["text"]("Grün ≥ 1,20 (bankfähig)  ·  Orange ≥ 1,00 (grenzwertig)  ·  Rot < 1,00 (kritisch)  ·  Gelb = Basisszenario",
    ML, y, { size: 7, color: C.muted });
  y += 8;

  y = r.sectionDiv(y, "Break-even & Risikopuffer");

  const beRows2: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Mindestmiete (CF = 0)",  `${beRent.toFixed(2)} €/m²`,     "normal"],
    ["Aktuelle Ist-Miete",     `${d.mieteProM2Monat.toFixed(2)} €/m²`, d.mieteProM2Monat > beRent ? "green" : "red"],
    ["Puffer",                 `${(d.mieteProM2Monat - beRent).toFixed(2)} €/m²`, d.mieteProM2Monat > beRent ? "green" : "red"],
    ["Max. Leerstand (CF=0)",  `${beRent > 0 ? Math.max(0,(1-beRent/d.mieteProM2Monat)*100).toFixed(1) : "–"} %`, "normal"],
  ];
  const riskRows: [string, string, "normal"|"green"|"amber"|"red"][] = [
    ["Kaufpreis",        fmt(d.kaufpreis),    "normal"],
    ["LTV",              pct(d.ltvPct, 0),   d.ltvPct > 0.8 ? "amber" : "normal"],
    ["Zinsbindungsrisiko","Bei Prolongation beachten","amber"],
    ["Entscheidung",     decDE,              decColor],
  ];
  r.infoPanel(ML,      y, bw, "Break-even-Analyse",  beRows2);
  r.infoPanel(ML+bw+6, y, bw, "Risikobewertung",    riskRows);
  const maxPanelY = Math.max(
    y + (beRows2.length * 7 + 10),
    y + (riskRows.length * 7 + 10)
  );
  y = maxPanelY + 6;

  r.fazitBox(y, [
    ["Risikoeinschätzung", true],
    [`Bei Basismiete bleibt der DSCR bis ca. 5,0 % Zinsen bankkonform.`, false],
    [`Mietpuffer über Break-even: ${(d.mieteProM2Monat - beRent).toFixed(2)} €/m² – ${d.mieteProM2Monat - beRent > 0.5 ? "ausreichend" : "gering"}.`, false],
    ["Hoher LTV erhöht Prolongationsrisiko – frühzeitige Zinssicherung empfohlen.", false],
  ]);

  // ── Seiten finalisieren ───────────────────────────────────────────────────
  r.finalizePages(TOTAL_PAGES);

  // ── Download ──────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const adresseSlug = (data.adresse || data.objektBezeichnung || "").replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40);
  const filename = `PROPORA - Wohnung${adresseSlug ? " - " + adresseSlug : ""} - ${today}.pdf`;
  r.getPdf().save(filename);
}