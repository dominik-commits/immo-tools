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
 * Feuert bei JEDEM erfolgreichen "Im Portfolio speichern" (nicht nur beim ersten
 * Objekt) -- anders als trackFirstAnalysisCompleted unten ist das hier kein
 * Aktivierungs-Meilenstein, sondern ein faktisches Ereignis: der Nutzer hat ein
 * Objekt angelegt. Einziger Aufrufort: SaveToPortfolioButton.tsx (deckt
 * ETW/MFH/Gewerbe/MixedUse ab -- EinfamilienhausCheck hat aktuell kein
 * Save-to-Portfolio-Feature, siehe Projekt-Backlog).
 */
export function trackPropertyCreated(analyzerType: string) {
  pushToDataLayer({
    event: "property_created",
    analyzer_type: analyzerType,
  });
}

/**
 * Feuert einmal beim Mount einer Pricing-Ansicht. Aufruforte: Upgrade.tsx
 * (In-App-Upsell nach einem PRO-Gate) und Pricing.tsx (öffentliche /preise-Seite).
 */
export function trackPricingViewed(source: "upgrade_page" | "pricing_page", context?: string) {
  pushToDataLayer({
    event: "pricing_viewed",
    source,
    ...(context ? { context } : {}),
  });
}

/**
 * WICHTIG: immer synchron VOR dem `window.location.href = ...`-Wechsel zur
 * Stripe-Checkout-Route aufrufen, nie danach/async -- die Seite wird direkt im
 * Anschluss verlassen (kein fetch(), echte Navigation). pushToDataLayer() ist
 * ein reiner, synchroner Array-push, GTM verarbeitet das Array unabhängig vom
 * eigenen Ladezeitpunkt (Standard-GTM-Snippet, async geladen) -- das ist exakt
 * das von Google vorgesehene Pattern für "Klick -> sofortige Weiterleitung".
 */
export function trackCheckoutStarted(plan: "basis" | "pro", interval: "yearly" | "monthly") {
  pushToDataLayer({
    event: "checkout_started",
    plan,
    interval,
  });
}

/**
 * Feuert EINMAL pro Nutzer (nicht pro Session), wenn eine echte Analyse
 * abgeschlossen wurde (eigene Adresse/Kaufpreis eingegeben, nicht mehr das
 * Beispielobjekt -- jeder Analyzer erkennt das selbst über seine eigene
 * isExample/isBeispiel-Variable, siehe Aufrufstellen in den 5 Analyzer-Routen).
 * Nutzt einen localStorage-Guard, damit das Event nicht bei jedem Aufruf erneut
 * feuert. Eventname MUSS "analysis_completed" heissen (exakt wie im
 * propora-cac-dashboard erwartet) -- hiess vorher "first_analysis_completed",
 * wurde aber nirgends getrackt/verwendet, Umbenennung ist gefahrlos.
 * Wichtig fuer den Activation-Funnel: sign_up -> property_created ->
 * analysis_completed -> purchase.
 */
export function trackAnalysisCompleted(analyzerType: string) {
  if (typeof window === "undefined") return;
  const key = "propora_analysis_completed_fired";
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  pushToDataLayer({
    event: "analysis_completed",
    analyzer_type: analyzerType,
  });
}
