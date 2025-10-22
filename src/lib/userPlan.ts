// src/lib/userPlan.ts
export type UserPlan = "basis" | "pro";

const KEY = "userPlan";

export function getUserPlan(): UserPlan | null {
  const v = localStorage.getItem(KEY);
  return v === "basis" || v === "pro" ? v : null;
}

export function setUserPlan(plan: UserPlan) {
  localStorage.setItem(KEY, plan);
}

export function isPro(): boolean {
  return getUserPlan() === "pro";
}

export function hasAccess(required: UserPlan): boolean {
  const p = getUserPlan();
  if (!p) return false;
  if (required === "basis") return p === "basis" || p === "pro";
  return p === "pro";
}
