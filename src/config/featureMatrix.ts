// src/config/featureMatrix.ts
export type Plan = "basic" | "pro";

export const FEATURE_MATRIX: Record<Plan, Record<string, boolean>> = {
  basic: {
    // Basis-Module
    eigentumswohnung: true,
    mfh: true,
    mietkalkulator: true,
    finanz_simple: true,
    // Pro-Module
    gewerbe: false,
    compare: false,
    afa: false,
    finanz_pro: false,
  },
  pro: {
    eigentumswohnung: true,
    mfh: true,
    mietkalkulator: true,
    finanz_simple: true,
    gewerbe: true,
    compare: true,
    afa: true,
    finanz_pro: true,
  },
};
