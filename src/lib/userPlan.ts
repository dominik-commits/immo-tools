// src/lib/userPlan.ts
// Zentrale Definition aller Pläne und Helper.

import type { UserResource } from "@clerk/types";

export type UserPlan = "free" | "basis" | "pro";

const PLAN_ORDER: UserPlan[] = ["free", "basis", "pro"];

export function normalizeUserPlan(raw: unknown): UserPlan {
  if (raw === "pro") return "pro";
  if (raw === "basis") return "basis";
  // alles andere (undefined, null, "none", …) = free
  return "free";
}

/**
 * Plan aus einem Clerk-User ableiten.
 * Falls kein User eingeloggt: "free".
 */
export function getUserPlanFromClerk(
  user: UserResource | null | undefined
): UserPlan {
  const raw = (user?.publicMetadata?.plan as unknown) ?? null;
  return normalizeUserPlan(raw);
}

/**
 * Plan-Vergleich: true = user hat mindestens "required".
 */
export function hasPlan(userPlan: UserPlan, required: UserPlan): boolean {
  const idxUser = PLAN_ORDER.indexOf(userPlan);
  const idxReq = PLAN_ORDER.indexOf(required);
  return idxUser >= idxReq;
}

/**
 * Komfort-Helper: hat der User Zugriff auf einen Plan?
 * (Du kannst auch direkt hasPlan(userPlan, required) benutzen.)
 */
export function hasAccess(
  user: UserResource | null | undefined,
  required: UserPlan
): boolean {
  const plan = getUserPlanFromClerk(user);
  return hasPlan(plan, required);
}
