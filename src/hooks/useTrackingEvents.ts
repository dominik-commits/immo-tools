// src/hooks/useTrackingEvents.ts

declare function gtag(...args: unknown[]): void;

export function trackSignUp(method: string = "email") {
  if (typeof gtag === "undefined") return;
  gtag("event", "sign_up", {
    method,
    plan: "free",
  });
}

export function trackPurchase(plan: "basis" | "pro") {
  if (typeof gtag === "undefined") return;
  const value = plan === "pro" ? 29 : 9;
  gtag("event", "purchase", {
    transaction_id: `${plan}_${Date.now()}`,
    currency: "EUR",
    value,
    items: [
      {
        item_id: plan,
        item_name: `Propora ${plan.toUpperCase()}`,
        price: value,
        quantity: 1,
      },
    ],
  });
}

export function trackUpgrade(from: string, to: "basis" | "pro") {
  if (typeof gtag === "undefined") return;
  gtag("event", "upgrade", {
    from_plan: from,
    to_plan: to,
  });
}