// src/core/afa/types.ts
export type AfAMethod = "linear" | "degressiv" | "sonder";

export type AfaPresetKey =
  | "LIN_WOHN"
  | "LIN_GEWERBE"
  | "DEG_TEST"
  | "CUSTOM";

export type Modernisierung = {
  id: string;
  title: string;
  dateISO: string;        // Anschaffungs-/Herstellungsdatum
  amount: number;         // Brutto/Netto? (frei, nur Zahl)
  capitalize: boolean;    // aktivierungspflichtig -> separater AfA-Strang
  method: AfAMethod;      // meist linear
  ratePct?: number;       // falls Satz statt Nutzungsdauer
  years?: number;         // Nutzungsdauer
};

export type AfaInput = {
  preset: AfaPresetKey;
  kaufpreis: number;
  bodenwert: number;      // wenn 0 => kein Abzug
  baujahr: number;
  anschaffungsdatumISO: string;
  nutzungsbeginnISO: string;

  // Haupt-AfA-Strang fürs Gebäude
  method: AfAMethod;      // linear/degressiv
  ratePct?: number;       // z. B. 2.0% (als 0.02 gespeichert)
  years?: number;         // z. B. 50
  degressivMaxPct?: number;   // optional für Test/Parametrisierung

  modernisierungen: Modernisierung[];
  sonderBetraege: { title: string; amount: number; years: number }[]; // einfache Verteilung
  horizonYears: number;  // z. B. 10
};

export type AfaYearRow = {
  yearIndex: number;     // 1..H
  kalenderjahr: number;  // z. B. 2025
  afaSum: number;
  parts: {
    haupt: number;
    modernisierungen: { id: string; value: number }[];
    sonder: { title: string; value: number }[];
  };
};

export type AfaOutput = {
  gebaeudeAnteil: number;
  jahre: AfaYearRow[];
  totalAfaHorizon: number;
};
