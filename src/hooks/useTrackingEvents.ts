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

/**
 * Feuert EINMAL pro Nutzer (nicht pro Session), wenn eine echte Analyse
 * abgeschlossen wurde (eigene Adresse eingegeben, nicht mehr das Beispielobjekt).
 * Nutzt einen localStorage-Guard, damit das Event nicht bei jedem Aufruf erneut feuert.
 * Wichtig fuer den Activation-Funnel: sign_up -> first_analysis_completed -> purchase.
 */
export function trackFirstAnalysisCompleted(analyzerType: string) {
  if (typeof window === "undefined") return;
  const key = "propora_first_analysis_completed_fired";
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  pushToDataLayer({
    event: "first_analysis_completed",
    analyzer_type: analyzerType,
  });
}
