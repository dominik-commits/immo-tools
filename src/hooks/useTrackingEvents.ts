// src/hooks/useTrackingEvents.ts

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function pushToDataLayer(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function trackSignUp(method: string = "email") {
  pushToDataLayer({
    event: "sign_up",
    method,
    plan: "free",
  });
}

export function trackPurchase(plan: "basis" | "pro") {
  const value = plan === "pro" ? 29 : 9;
  pushToDataLayer({
    event: "purchase",
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
  pushToDataLayer({
    event: "upgrade",
    from_plan: from,
    to_plan: to,
  });
}

export function trackToolUsed(toolName: string) {
  pushToDataLayer({
    event: "tool_used",
    tool_name: toolName,
  });
}
