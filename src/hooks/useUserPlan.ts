// src/hooks/useUserPlan.ts
import { useUser } from "@clerk/clerk-react";

export type UserPlan = "free" | "basis" | "pro";

export function useUserPlan(): { plan: UserPlan; isLoading: boolean } {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return { plan: "free", isLoading: true };
  }

  if (!user) {
    return { plan: "free", isLoading: false };
  }

  const publicMeta = (user.publicMetadata || {}) as Record<string, unknown>;
  const unsafeMeta = (user.unsafeMetadata || {}) as Record<string, unknown>;

  const rawPlan =
    (publicMeta.plan as string | undefined) ??
    (publicMeta.subscriptionPlan as string | undefined) ??
    (unsafeMeta.plan as string | undefined);

  if (rawPlan === "pro") return { plan: "pro", isLoading: false };
  if (rawPlan === "basis") return { plan: "basis", isLoading: false };
  return { plan: "free", isLoading: false };
}