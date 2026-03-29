// src/types/immoImport.ts

export type PortalId = "immoscout" | "immowelt" | "immonet" | "ebay" | "other";

export type ImportedNebenkosten = {
  grunderwerb?: number | null;
  notar?: number | null;
  grundbuch?: number | null;
  makler?: number | null;
  sonstiges?: number | null;
};

export type ImportedZone = {
  name?: string | null;
  areaM2?: number | null;
  rentPerM2?: number | null;
  vacancyPct?: number | null;
  recoverablePct?: number | null;
  freeRentMonthsY1?: number | null;
  tiPerM2?: number | null;
  leaseTermYears?: number | null;
};

export interface ImmoImportData {
  kaufpreis?: number | null;
  nebenkosten?: ImportedNebenkosten | null;
  zonen?: ImportedZone[] | null;
  meta?: {
    rawUrl: string;
    portal: PortalId;
    portalLabel: string;
    rawKaufpreis?: number | null;
    rawAreaM2?: number | null;
  };
}

export interface ImmoImportResponse {
  ok: boolean;
  message?: string;
  importedUrl: string;
  portal: PortalId;
  portalLabel: string;
  type: "etw" | "mfh" | "gewerbe" | "mixed" | "unknown";
  data: ImmoImportData;
}
