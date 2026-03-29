// src/hooks/useUserPlan.ts

import { useUser } from "@clerk/clerk-react";

export type UserPlan = "basis" | "pro" | null;

/**
 * Liest den Plan ausschließlich aus den Clerk-Metadaten.
 *
 * Erwartete Felder (mindestens eins davon):
 *  - user.publicMetadata.plan
 *  - user.publicMetadata.subscriptionPlan
 *  - user.unsafeMetadata.plan
 *
 * Wenn nichts davon "basis" oder "pro" ist → null (Free / Gast).
 */
export function useUserPlan(): UserPlan {
  const { user } = useUser();

  // Noch nicht geladen oder nicht eingeloggt
  if (!user) {
    return null;
  }

  const publicMeta = (user.publicMetadata || {}) as Record<string, unknown>;
  const unsafeMeta = (user.unsafeMetadata || {}) as Record<string, unknown>;

  const rawPlan =
    (publicMeta.plan as string | undefined) ??
    (publicMeta.subscriptionPlan as string | undefined) ??
    (unsafeMeta.plan as string | undefined);

  if (rawPlan === "basis" || rawPlan === "pro") {
    return rawPlan;
  }

  return null;
}
