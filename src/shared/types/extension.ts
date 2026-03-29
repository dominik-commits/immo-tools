// shared/types/extension.ts

export type ProporaAssetType =
  | "ETW"
  | "MFH"
  | "EFH"
  | "GEWERBE"
  | "MIXED";
  
export type RawListingPayload = {
  portal: "immoscout" | "immowelt" | "immonet" | "ebay" | "other";
  url: string;

  title?: string;
  rawType?: string;             // z.B. "Mehrfamilienhaus", "Wohn- und Geschäftshaus"
  usageCategory?: string;       // z.B. "Wohnen", "Gewerbe", "Wohnen und Gewerbe"

  price?: number;               // Kaufpreis
  livingAreaM2?: number;
  commercialAreaM2?: number;
  plotAreaM2?: number;

  unitsTotal?: number;
  unitsResidential?: number;
  unitsCommercial?: number;

  coldRentPerM2?: number;
  warmRentPerM2?: number;
  grossRentYear?: number;

  houseMoney?: number;          // Hausgeld
  textSnippet?: string;         // Exposé-Text, optional

  // falls du schon was zur Lage parsen willst
  city?: string;
  postalCode?: string;
  street?: string;
};
