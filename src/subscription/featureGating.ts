// src/subscription/featureGating.ts
export type Plan = 'basic' | 'pro' | null;

export type Feature =
  | 'eig'          // Eigentumswohnung
  | 'mfh'          // Mehrfamilienhaus
  | 'miet'         // Mietkalkulator
  | 'fin-simple'   // Finanzierung (simpel)
  | 'gewerbe'
  | 'vergleich'
  | 'afa'
  | 'fin-pro';

const ALLOWED: Record<Exclude<Plan, null>, Feature[]> = {
  basic: ['eig', 'mfh', 'miet', 'fin-simple'],
  pro:   ['eig', 'mfh', 'miet', 'fin-simple', 'gewerbe', 'vergleich', 'afa', 'fin-pro'],
};

export function hasAccess(plan: Plan, feature: Feature): boolean {
  if (!plan) return false;
  return ALLOWED[plan].includes(feature);
}
