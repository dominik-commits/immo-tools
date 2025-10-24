// src/config/featureMatrix.ts
export type Plan = "basis" | "pro";

// Matrix: welches Feature braucht welchen Plan?
export const FEATURE_PLAN: Record<string, Plan> = {
  // Basis
  "eigentumswohnung": "basis",
  "mfh": "basis",
  "mietkalkulation": "basis",
  "finanzierung-simple": "basis",

  // Pro (zusätzlich zu Basis)
  "gewerbe": "pro",
  "compare": "pro",
  "afa": "pro",
  "finanzierung": "pro",
};

// Vergleich: darf ein Nutzer-Plan ein Feature nutzen?
export function isAllowed(userPlan: Plan, required: Plan) {
  if (required === "basis") return true;
  return userPlan === "pro";
}
